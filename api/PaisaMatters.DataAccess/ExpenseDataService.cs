using System.Data;
using Microsoft.Data.SqlClient;
using PaisaMatters.Common;
using PaisaMatters.DomainModel;
using PaisaMatters.ServiceInterface;

namespace PaisaMatters.DataAccess;

public sealed class ExpenseDataService(string connectionString) : IExpenseDataService
{
    private readonly string _connectionString = connectionString;

    public async Task<ExpenseSaveResult> SaveExpenseAsync(Guid tripId, Guid? expenseId, SaveTripExpenseRequest request, Guid userId, CancellationToken token)
    {
        await using var connection = await OpenAsync(token);
        await using var command = new SqlCommand(Procedures.CreateTripExpense, connection) { CommandType = CommandType.StoredProcedure };
        command.Parameters.Add("@ExpenseId", SqlDbType.UniqueIdentifier).Value = expenseId is null ? DBNull.Value : expenseId.Value;
        command.Parameters.Add("@TripId", SqlDbType.UniqueIdentifier).Value = tripId;
        command.Parameters.Add("@Description", SqlDbType.NVarChar, 200).Value = request.Description!.Trim();
        AddDecimal(command, "@Amount", request.Amount);
        command.Parameters.Add("@Category", SqlDbType.NVarChar, 50).Value = request.Category!.Trim();
        command.Parameters.Add("@PaidByUserId", SqlDbType.UniqueIdentifier).Value = request.PaidByUserId;
        command.Parameters.Add("@SplitType", SqlDbType.NVarChar, 20).Value = request.SplitType!;
        command.Parameters.Add("@ExpenseDate", SqlDbType.DateTime2).Value = request.ExpenseDate is null ? DBNull.Value : request.ExpenseDate.Value;
        command.Parameters.Add("@Notes", SqlDbType.NVarChar, 500).Value = string.IsNullOrWhiteSpace(request.Notes) ? DBNull.Value : request.Notes.Trim();
        command.Parameters.Add("@CreatedBy", SqlDbType.UniqueIdentifier).Value = userId;
        var shares = new DataTable(); shares.Columns.Add("UserId", typeof(Guid)); shares.Columns.Add("ShareAmount", typeof(decimal));
        foreach (var share in request.Shares!) shares.Rows.Add(share.UserId, share.ShareAmount is null ? DBNull.Value : share.ShareAmount.Value);
        var shareParameter = command.Parameters.AddWithValue("@Shares", shares);
        shareParameter.SqlDbType = SqlDbType.Structured; shareParameter.TypeName = "dbo.TripExpenseShareInput";
        await using var reader = await command.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token)) throw new InvalidOperationException("Expense procedure did not return a result.");
        return new ExpenseSaveResult(reader.GetGuid(reader.GetOrdinal("ExpenseId")), reader.GetGuid(reader.GetOrdinal("TripId")), reader.GetString(reader.GetOrdinal("SplitType")), reader.GetDecimal(reader.GetOrdinal("Amount")), reader.GetString(reader.GetOrdinal("Result")));
    }

    public async Task<IReadOnlyList<TripExpenseResponse>> GetExpensesAsync(Guid tripId, CancellationToken token)
    {
        await using var connection = await OpenAsync(token); await using var command = Procedure(connection, Procedures.GetTripExpenses);
        AddGuid(command, "@TripId", tripId); await using var reader = await command.ExecuteReaderAsync(token);
        var result = new List<TripExpenseResponse>(); while (await reader.ReadAsync(token)) result.Add(MapExpense(reader, true)); return result;
    }

    public async Task<TripExpenseResponse?> GetExpenseAsync(Guid tripId, Guid expenseId, CancellationToken token)
    {
        await using var connection = await OpenAsync(token); await using var command = Procedure(connection, Procedures.GetTripExpenseById);
        AddGuid(command, "@TripId", tripId); AddGuid(command, "@ExpenseId", expenseId);
        await using var reader = await command.ExecuteReaderAsync(token); if (!await reader.ReadAsync(token)) return null;
        var header = MapExpense(reader, false); var shares = new List<ExpenseShareResponse>();
        if (await reader.NextResultAsync(token)) while (await reader.ReadAsync(token)) shares.Add(new ExpenseShareResponse(reader.GetGuid(reader.GetOrdinal("ExpenseSplitId")), reader.GetGuid(reader.GetOrdinal("ExpenseId")), reader.GetGuid(reader.GetOrdinal("UserId")), reader.GetString(reader.GetOrdinal("FullName")), reader.GetString(reader.GetOrdinal("Email")), reader.GetDecimal(reader.GetOrdinal("ShareAmount"))));
        return header with { Shares = shares };
    }

    public async Task<ExpenseDeleteResult> DeleteExpenseAsync(Guid tripId, Guid expenseId, CancellationToken token)
    {
        await using var connection = await OpenAsync(token); await using var command = Procedure(connection, Procedures.DeleteTripExpense);
        AddGuid(command, "@TripId", tripId); AddGuid(command, "@ExpenseId", expenseId); await using var reader = await command.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token)) throw new InvalidOperationException("Expense delete procedure did not return a result.");
        return new ExpenseDeleteResult(reader.GetGuid(reader.GetOrdinal("ExpenseId")), reader.GetString(reader.GetOrdinal("Result")));
    }

    public async Task<IReadOnlyList<ExpenseBalanceResponse>> GetBalancesAsync(Guid tripId, CancellationToken token)
    {
        await using var connection = await OpenAsync(token); await using var command = Procedure(connection, Procedures.GetTripExpenseBalances); AddGuid(command, "@TripId", tripId);
        await using var reader = await command.ExecuteReaderAsync(token); var result = new List<ExpenseBalanceResponse>();
        while (await reader.ReadAsync(token)) result.Add(new(reader.GetGuid(reader.GetOrdinal("UserId")), reader.GetString(reader.GetOrdinal("FullName")), reader.GetDecimal(reader.GetOrdinal("TotalPaid")), reader.GetDecimal(reader.GetOrdinal("TotalShares")), reader.GetDecimal(reader.GetOrdinal("TotalSettlementSent")), reader.GetDecimal(reader.GetOrdinal("TotalSettlementReceived")), reader.GetDecimal(reader.GetOrdinal("NetBalance")))); return result;
    }

    public async Task<IReadOnlyList<SuggestedSettlementResponse>> GetSuggestionsAsync(Guid tripId, CancellationToken token)
    {
        await using var connection = await OpenAsync(token); await using var command = Procedure(connection, Procedures.GetSuggestedSettlements); AddGuid(command, "@TripId", tripId);
        await using var reader = await command.ExecuteReaderAsync(token); var result = new List<SuggestedSettlementResponse>();
        while (await reader.ReadAsync(token)) result.Add(new(reader.GetGuid(reader.GetOrdinal("FromUserId")), reader.GetString(reader.GetOrdinal("FromName")), reader.GetGuid(reader.GetOrdinal("ToUserId")), reader.GetString(reader.GetOrdinal("ToName")), reader.GetDecimal(reader.GetOrdinal("Amount")))); return result;
    }

    public async Task<SettlementSaveResult> CreateSettlementAsync(Guid tripId, CreateTripSettlementRequest request, Guid userId, CancellationToken token)
    {
        await using var connection = await OpenAsync(token); await using var command = Procedure(connection, Procedures.CreateTripSettlement);
        AddGuid(command, "@TripId", tripId); AddGuid(command, "@PaidByUserId", request.PaidByUserId); AddGuid(command, "@ReceivedByUserId", request.ReceivedByUserId); AddDecimal(command, "@Amount", request.Amount); AddGuid(command, "@CreatedBy", userId);
        command.Parameters.Add("@Notes", SqlDbType.NVarChar, 500).Value = string.IsNullOrWhiteSpace(request.Notes) ? DBNull.Value : request.Notes.Trim();
        command.Parameters.Add("@SettlementId", SqlDbType.UniqueIdentifier).Value = DBNull.Value;
        await using var reader = await command.ExecuteReaderAsync(token); if (!await reader.ReadAsync(token)) throw new InvalidOperationException("Settlement procedure did not return a result.");
        return new(reader.GetGuid(reader.GetOrdinal("SettlementId")), reader.GetString(reader.GetOrdinal("Status")));
    }

    public async Task<IReadOnlyList<TripSettlementResponse>> GetSettlementsAsync(Guid tripId, CancellationToken token)
    {
        await using var connection = await OpenAsync(token); await using var command = Procedure(connection, Procedures.GetTripSettlements); AddGuid(command, "@TripId", tripId);
        await using var reader = await command.ExecuteReaderAsync(token); var result = new List<TripSettlementResponse>(); while (await reader.ReadAsync(token)) result.Add(new(reader.GetGuid(reader.GetOrdinal("SettlementId")), reader.GetGuid(reader.GetOrdinal("TripId")), reader.GetGuid(reader.GetOrdinal("PaidByUserId")), reader.GetString(reader.GetOrdinal("PaidByName")), reader.GetGuid(reader.GetOrdinal("ReceivedByUserId")), reader.GetString(reader.GetOrdinal("ReceivedByName")), reader.GetDecimal(reader.GetOrdinal("Amount")), reader.GetDateTime(reader.GetOrdinal("SettlementDate")), reader.GetString(reader.GetOrdinal("Status")), NullableString(reader, "Notes"), reader.GetGuid(reader.GetOrdinal("CreatedBy")), reader.GetDateTime(reader.GetOrdinal("CreatedAt")), NullableDate(reader, "UpdatedAt"))); return result;
    }

    public async Task<SettlementSaveResult> UpdateSettlementStatusAsync(Guid tripId, Guid settlementId, string status, CancellationToken token)
    {
        await using var connection = await OpenAsync(token); await using var command = Procedure(connection, Procedures.UpdateTripSettlementStatus); AddGuid(command, "@TripId", tripId); AddGuid(command, "@SettlementId", settlementId); command.Parameters.Add("@Status", SqlDbType.NVarChar, 20).Value = status;
        await using var reader = await command.ExecuteReaderAsync(token); if (!await reader.ReadAsync(token)) throw new InvalidOperationException("Settlement status procedure did not return a result."); return new(reader.GetGuid(reader.GetOrdinal("SettlementId")), reader.GetString(reader.GetOrdinal("Status")));
    }

    private async Task<SqlConnection> OpenAsync(CancellationToken token) { var connection = new SqlConnection(_connectionString); await connection.OpenAsync(token); return connection; }
    private static SqlCommand Procedure(SqlConnection connection, string name) => new(name, connection) { CommandType = CommandType.StoredProcedure };
    private static void AddGuid(SqlCommand command, string name, Guid value) => command.Parameters.Add(name, SqlDbType.UniqueIdentifier).Value = value;
    private static void AddDecimal(SqlCommand command, string name, decimal value) { var p = command.Parameters.Add(name, SqlDbType.Decimal); p.Precision = 19; p.Scale = 2; p.Value = value; }
    private static string? NullableString(SqlDataReader r, string name) { var i = r.GetOrdinal(name); return r.IsDBNull(i) ? null : r.GetString(i); }
    private static DateTime? NullableDate(SqlDataReader r, string name) { var i = r.GetOrdinal(name); return r.IsDBNull(i) ? null : r.GetDateTime(i); }
    private static TripExpenseResponse MapExpense(SqlDataReader r, bool hasCount) => new(r.GetGuid(r.GetOrdinal("ExpenseId")), r.GetGuid(r.GetOrdinal("TripId")), r.GetString(r.GetOrdinal("Description")), r.GetDecimal(r.GetOrdinal("Amount")), r.GetString(r.GetOrdinal("Category")), r.GetGuid(r.GetOrdinal("PaidByUserId")), r.GetString(r.GetOrdinal("PaidByName")), r.GetString(r.GetOrdinal("SplitType")), r.GetDateTime(r.GetOrdinal("ExpenseDate")), NullableString(r, "Notes"), r.GetGuid(r.GetOrdinal("CreatedBy")), r.GetDateTime(r.GetOrdinal("CreatedAt")), NullableDate(r, "UpdatedAt"), hasCount ? r.GetInt32(r.GetOrdinal("ParticipantCount")) : null);
}
