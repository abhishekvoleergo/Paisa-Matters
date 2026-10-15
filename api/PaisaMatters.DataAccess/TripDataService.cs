using System.Data;
using Microsoft.Data.SqlClient;
using PaisaMatters.Common;
using PaisaMatters.DomainModel;
using PaisaMatters.ServiceInterface;

namespace PaisaMatters.DataAccess;

public sealed class TripDataService(string connectionString) : ITripDataService
{
    private readonly string _connectionString = connectionString;

    public async Task<TripResponse> CreateAsync(CreateTripRequest request, Guid userId, CancellationToken token)
    {
        await using var connection = new SqlConnection(_connectionString); await connection.OpenAsync(token);
        await using var command = new SqlCommand(Procedures.CreateTrip, connection) { CommandType = CommandType.StoredProcedure };
        command.Parameters.Add("@TripName", SqlDbType.NVarChar, 150).Value = request.TripName!.Trim();
        command.Parameters.Add("@Destination", SqlDbType.NVarChar, 200).Value = request.Destination!.Trim();
        command.Parameters.Add("@CreatedBy", SqlDbType.UniqueIdentifier).Value = userId;
        command.Parameters.Add("@StartDate", SqlDbType.Date).Value = request.StartDate is { } start ? start.ToDateTime(TimeOnly.MinValue) : DBNull.Value;
        command.Parameters.Add("@EndDate", SqlDbType.Date).Value = request.EndDate is { } end ? end.ToDateTime(TimeOnly.MinValue) : DBNull.Value;
        var idParameter = command.Parameters.Add("@TripId", SqlDbType.UniqueIdentifier); idParameter.Direction = ParameterDirection.Output;
        TripResponse? result = null;
        await using (var reader = await command.ExecuteReaderAsync(token))
            if (await reader.ReadAsync(token)) result = Map(reader);
        var tripId = idParameter.Value is Guid id && id != Guid.Empty ? id : result?.TripId ?? throw new InvalidOperationException("Trip creation procedure did not return a trip identifier.");
        return result is null ? new TripResponse(tripId, request.TripName!.Trim(), request.Destination!.Trim(), userId, request.StartDate, request.EndDate, "INR", null, "Owner", "Active") : result with { TripId = tripId, CreatedBy = userId, CurrencyCode = "INR", MemberRole = result.MemberRole ?? "Owner", MemberStatus = result.MemberStatus ?? "Active" };
    }

    public async Task<IReadOnlyList<TripResponse>> GetByUserAsync(Guid userId, CancellationToken token)
    {
        await using var connection = new SqlConnection(_connectionString); await connection.OpenAsync(token);
        await using var command = new SqlCommand(Procedures.GetTripsByUser, connection) { CommandType = CommandType.StoredProcedure };
        command.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
        var trips = new List<TripResponse>(); await using var reader = await command.ExecuteReaderAsync(token);
        while (await reader.ReadAsync(token)) trips.Add(Map(reader));
        return trips;
    }

    // Accommodates the documented procedure column names and common casing while still failing loudly on missing required fields.
    private static TripResponse Map(SqlDataReader reader)
    {
        object? Value(params string[] names) { foreach (var name in names) { try { var i = reader.GetOrdinal(name); return reader.IsDBNull(i) ? null : reader.GetValue(i); } catch (IndexOutOfRangeException) { } } return null; }
        Guid GuidValue(string name, params string[] aliases) => (Guid)(Value(new[] { name }.Concat(aliases).ToArray()) ?? throw new InvalidOperationException($"Trip procedure result is missing {name}."));
        string StringValue(string name, params string[] aliases) => Convert.ToString(Value(new[] { name }.Concat(aliases).ToArray())) ?? throw new InvalidOperationException($"Trip procedure result is missing {name}.");
        DateOnly? DateValue(string name) { var value = Value(name); return value is null ? null : DateOnly.FromDateTime(Convert.ToDateTime(value)); }
        var id = GuidValue("TripId", "TripID");
        Guid? createdBy = Value("CreatedBy", "UserId") is Guid user ? user : null;
        DateTime? createdAt = Value("CreatedAt", "CreatedOn") is { } created ? Convert.ToDateTime(created) : null;
        return new TripResponse(id, StringValue("TripName"), StringValue("Destination"), createdBy,
            DateValue("StartDate"), DateValue("EndDate"), Convert.ToString(Value("CurrencyCode")) ?? "INR", createdAt,
            Convert.ToString(Value("MemberRole")), Convert.ToString(Value("MemberStatus")));
    }
}
