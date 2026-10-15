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

    public async Task<(Guid InviteId, DateTime? ExpiresAt, int? MaxUses)> CreateInviteAsync(Guid tripId, Guid userId, byte[] tokenHash, DateTime? expiresAt, int? maxUses, CancellationToken token)
    {
        await using var connection = new SqlConnection(_connectionString); await connection.OpenAsync(token);
        await using var command = new SqlCommand(Procedures.CreateTripInvite, connection) { CommandType = CommandType.StoredProcedure };
        command.Parameters.Add("@TripId", SqlDbType.UniqueIdentifier).Value = tripId;
        command.Parameters.Add("@CreatedBy", SqlDbType.UniqueIdentifier).Value = userId;
        command.Parameters.Add("@TokenHash", SqlDbType.VarBinary, 32).Value = tokenHash;
        command.Parameters.Add("@ExpiresAt", SqlDbType.DateTime2).Value = expiresAt is { } expires ? expires : DBNull.Value;
        command.Parameters.Add("@MaxUses", SqlDbType.Int).Value = maxUses is { } uses ? uses : DBNull.Value;
        await using var reader = await command.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token)) throw new InvalidOperationException("Invite procedure did not return an invite.");
        var inviteId = reader.GetGuid(reader.GetOrdinal("InviteId"));
        var expiryOrdinal = reader.GetOrdinal("ExpiresAt");
        var maxUsesOrdinal = reader.GetOrdinal("MaxUses");
        return (inviteId, reader.IsDBNull(expiryOrdinal) ? null : reader.GetDateTime(expiryOrdinal), reader.IsDBNull(maxUsesOrdinal) ? null : reader.GetInt32(maxUsesOrdinal));
    }

    public async Task<DeleteTripResponse> DeleteAsync(Guid tripId, Guid userId, CancellationToken token)
    {
        await using var connection = new SqlConnection(_connectionString); await connection.OpenAsync(token);
        await using var command = new SqlCommand(Procedures.DeleteTrip, connection) { CommandType = CommandType.StoredProcedure };
        command.Parameters.Add("@TripId", SqlDbType.UniqueIdentifier).Value = tripId;
        command.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
        await using var reader = await command.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token)) throw new InvalidOperationException("Delete procedure did not return a result.");
        return new DeleteTripResponse(reader.GetGuid(reader.GetOrdinal("TripId")), reader.GetBoolean(reader.GetOrdinal("IsDeleted")), reader.GetString(reader.GetOrdinal("Message")));
    }

    public async Task<TripDetailsResponse?> GetByIdAsync(Guid tripId, Guid userId, CancellationToken token)
    {
        await using var connection = new SqlConnection(_connectionString); await connection.OpenAsync(token);
        await using var command = new SqlCommand(Procedures.GetTripById, connection) { CommandType = CommandType.StoredProcedure };
        command.Parameters.Add("@TripId", SqlDbType.UniqueIdentifier).Value = tripId;
        command.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
        await using var reader = await command.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token)) return null;
        var trip = Map(reader);
        return Details(trip, reader);
    }

    public async Task<TripDetailsResponse> UpdateAsync(Guid tripId, Guid userId, CreateTripRequest request, CancellationToken token)
    {
        await using var connection = new SqlConnection(_connectionString); await connection.OpenAsync(token);
        await using var command = new SqlCommand(Procedures.UpdateTrip, connection) { CommandType = CommandType.StoredProcedure };
        command.Parameters.Add("@TripId", SqlDbType.UniqueIdentifier).Value = tripId;
        command.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
        command.Parameters.Add("@TripName", SqlDbType.NVarChar, 150).Value = request.TripName!.Trim();
        command.Parameters.Add("@Destination", SqlDbType.NVarChar, 200).Value = request.Destination!.Trim();
        command.Parameters.Add("@StartDate", SqlDbType.Date).Value = request.StartDate is { } start ? start.ToDateTime(TimeOnly.MinValue) : DBNull.Value;
        command.Parameters.Add("@EndDate", SqlDbType.Date).Value = request.EndDate is { } end ? end.ToDateTime(TimeOnly.MinValue) : DBNull.Value;
        await using var reader = await command.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token)) throw new InvalidOperationException("Update procedure did not return a trip.");
        var trip = Map(reader);
        return Details(trip, reader);
    }

    public async Task<IReadOnlyList<TripMemberResponse>> GetMembersAsync(Guid tripId, Guid userId, CancellationToken token)
    {
        await using var connection = new SqlConnection(_connectionString); await connection.OpenAsync(token);
        await using var command = new SqlCommand(Procedures.GetTripMembers, connection) { CommandType = CommandType.StoredProcedure };
        command.Parameters.Add("@TripId", SqlDbType.UniqueIdentifier).Value = tripId;
        command.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
        var result = new List<TripMemberResponse>(); await using var reader = await command.ExecuteReaderAsync(token);
        while (await reader.ReadAsync(token)) result.Add(new TripMemberResponse(reader.GetGuid(reader.GetOrdinal("UserId")), reader.GetString(reader.GetOrdinal("FullName")), reader.GetString(reader.GetOrdinal("Role")), reader.GetString(reader.GetOrdinal("Status")), ReadNullableDateTime(reader, "JoinedAt")));
        return result;
    }

    public async Task<InvitePreviewResponse> PreviewInviteAsync(byte[] tokenHash, CancellationToken token)
    {
        await using var connection = new SqlConnection(_connectionString); await connection.OpenAsync(token);
        await using var command = new SqlCommand(Procedures.GetTripInviteByTokenHash, connection) { CommandType = CommandType.StoredProcedure };
        command.Parameters.Add("@TokenHash", SqlDbType.VarBinary, 32).Value = tokenHash;
        await using var reader = await command.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token)) return new InvitePreviewResponse(false, "Invalid", null, null, null, null, null, null);
        return new InvitePreviewResponse(reader.GetBoolean(reader.GetOrdinal("IsValid")), reader.GetString(reader.GetOrdinal("Status")), reader.GetGuid(reader.GetOrdinal("TripId")), reader.GetString(reader.GetOrdinal("TripName")), reader.GetString(reader.GetOrdinal("Destination")), ReadNullableDateTime(reader, "ExpiresAt"), ReadNullableInt(reader, "MaxUses"), ReadNullableInt(reader, "UseCount"));
    }

    public async Task<JoinTripResponse> JoinInviteAsync(byte[] tokenHash, Guid userId, CancellationToken token)
    {
        await using var connection = new SqlConnection(_connectionString); await connection.OpenAsync(token);
        await using var command = new SqlCommand(Procedures.JoinTripByInvite, connection) { CommandType = CommandType.StoredProcedure };
        command.Parameters.Add("@TokenHash", SqlDbType.VarBinary, 32).Value = tokenHash;
        command.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
        await using var reader = await command.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token)) throw new InvalidOperationException("Join procedure did not return a result.");
        return new JoinTripResponse(reader.GetGuid(reader.GetOrdinal("TripId")), reader.GetString(reader.GetOrdinal("Status")));
    }

    private static DateTime? ReadNullableDateTime(SqlDataReader reader, string name) { var i=reader.GetOrdinal(name); return reader.IsDBNull(i) ? null : reader.GetDateTime(i); }
    private static int? ReadNullableInt(SqlDataReader reader, string name) { var i=reader.GetOrdinal(name); return reader.IsDBNull(i) ? null : reader.GetInt32(i); }
    private static TripDetailsResponse Details(TripResponse trip, SqlDataReader reader) => new(trip.TripId, trip.TripName, trip.Destination, trip.CreatedBy, trip.StartDate, trip.EndDate, trip.CurrencyCode, trip.CreatedAt, trip.MemberRole, trip.MemberStatus, reader.GetString(reader.GetOrdinal("OwnerName")), reader.GetString(reader.GetOrdinal("CurrentUserRole")), reader.GetInt32(reader.GetOrdinal("MemberCount")), ReadNullableDateTime(reader, "UpdatedAt"));

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
