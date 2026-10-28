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
        await using var connection = await OpenAsync(token);
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(IsolationLevel.Serializable, token);

        var existingRequest = await FindSettlementRequestAsync(connection, transaction, request.SettlementId!.Value, token);
        if (existingRequest is not null)
        {
            if (existingRequest.TripId == tripId && existingRequest.PaidByUserId == request.PaidByUserId &&
                existingRequest.ReceivedByUserId == request.ReceivedByUserId && existingRequest.Amount == request.Amount &&
                existingRequest.CreatedBy == userId && existingRequest.Status == "Pending")
            {
                await transaction.CommitAsync(token);
                return new(request.SettlementId.Value, "Pending");
            }

            throw new ArgumentException("This repayment request identifier has already been used.");
        }

        // Recheck the authoritative pair balance while holding serializable locks so concurrent
        // requests cannot both record more than the current outstanding amount.
        var balances = await ReadMySettlementsAsync(connection, transaction, tripId, userId, token);
        var pair = balances.FirstOrDefault(item => item.DebtorId == userId && item.CreditorId == request.ReceivedByUserId);
        if (pair is null || pair.RemainingAmount <= 0)
            throw new ArgumentException("There is no outstanding amount to this recipient. Refresh the settlement overview and try again.");
        if (request.Amount > pair.RemainingAmount)
            throw new ArgumentException("The repayment amount exceeds the current outstanding balance. Refresh the settlement overview and try again.");

        SettlementSaveResult result;
        await using (var command = Procedure(connection, Procedures.CreateTripSettlement))
        {
            command.Transaction = transaction;
            AddGuid(command, "@TripId", tripId); AddGuid(command, "@PaidByUserId", request.PaidByUserId); AddGuid(command, "@ReceivedByUserId", request.ReceivedByUserId); AddDecimal(command, "@Amount", request.Amount); AddGuid(command, "@CreatedBy", userId);
            command.Parameters.Add("@Notes", SqlDbType.NVarChar, 500).Value = string.IsNullOrWhiteSpace(request.Notes) ? DBNull.Value : request.Notes.Trim();
            command.Parameters.Add("@SettlementId", SqlDbType.UniqueIdentifier).Value = request.SettlementId.Value;
            await using var reader = await command.ExecuteReaderAsync(token);
            if (!await reader.ReadAsync(token)) throw new InvalidOperationException("Settlement procedure did not return a result.");
            result = new(reader.GetGuid(reader.GetOrdinal("SettlementId")), reader.GetString(reader.GetOrdinal("Status")));
        }

        await transaction.CommitAsync(token);
        return result;
    }

    public async Task<SettlementSaveResult> UpdateSettlementAsync(Guid tripId, Guid settlementId, UpdateTripSettlementRequest request, CancellationToken token)
    {
        await using var connection = await OpenAsync(token); await using var command = Procedure(connection, Procedures.UpdateTripSettlement);
        AddGuid(command, "@TripId", tripId); AddGuid(command, "@SettlementId", settlementId); AddGuid(command, "@PaidByUserId", request.PaidByUserId); AddGuid(command, "@ReceivedByUserId", request.ReceivedByUserId); AddDecimal(command, "@Amount", request.Amount);
        command.Parameters.Add("@Notes", SqlDbType.NVarChar, 500).Value = string.IsNullOrWhiteSpace(request.Notes) ? DBNull.Value : request.Notes.Trim();
        await command.ExecuteNonQueryAsync(token); return new(settlementId, "Pending");
    }

    public async Task<IReadOnlyList<MyTripSettlementResponse>> GetMySettlementsAsync(Guid tripId, Guid userId, CancellationToken token)
    {
        await using var connection = await OpenAsync(token);
        return await ReadMySettlementsAsync(connection, null, tripId, userId, token);
    }

    public async Task<IReadOnlyList<TripSettlementResponse>> GetSettlementHistoryAsync(Guid tripId, Guid userId, string? status, CancellationToken token)
    {
        await using var connection = await OpenAsync(token); await using var command = Procedure(connection, Procedures.GetTripSettlementHistory); AddGuid(command, "@TripId", tripId); AddGuid(command, "@UserId", userId);
        command.Parameters.Add("@Status", SqlDbType.NVarChar, 20).Value = string.IsNullOrWhiteSpace(status) ? DBNull.Value : status;
        await using var reader = await command.ExecuteReaderAsync(token); var result = new List<TripSettlementResponse>();
        while (await reader.ReadAsync(token)) result.Add(new(reader.GetGuid(reader.GetOrdinal("SettlementId")), reader.GetGuid(reader.GetOrdinal("TripId")), reader.GetGuid(reader.GetOrdinal("PaidByUserId")), reader.GetString(reader.GetOrdinal("PaidByName")), reader.GetGuid(reader.GetOrdinal("ReceivedByUserId")), reader.GetString(reader.GetOrdinal("ReceivedByName")), reader.GetDecimal(reader.GetOrdinal("Amount")), reader.GetDateTime(reader.GetOrdinal("SettlementDate")), reader.GetString(reader.GetOrdinal("Status")), NullableString(reader, "Notes"), reader.GetGuid(reader.GetOrdinal("CreatedBy")), reader.GetDateTime(reader.GetOrdinal("CreatedAt")), NullableDate(reader, "UpdatedAt")));
        return result;
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
    private static async Task<IReadOnlyList<MyTripSettlementResponse>> ReadMySettlementsAsync(SqlConnection connection, SqlTransaction? transaction, Guid tripId, Guid userId, CancellationToken token)
    {
        await using var command = Procedure(connection, Procedures.GetMyTripSettlements);
        command.Transaction = transaction;
        AddGuid(command, "@TripId", tripId); AddGuid(command, "@UserId", userId);
        await using var reader = await command.ExecuteReaderAsync(token);
        var result = new List<MyTripSettlementResponse>();
        while (await reader.ReadAsync(token)) result.Add(new(reader.GetGuid(reader.GetOrdinal("DebtorId")), reader.GetString(reader.GetOrdinal("DebtorName")), reader.GetGuid(reader.GetOrdinal("CreditorId")), reader.GetString(reader.GetOrdinal("CreditorName")), reader.GetString(reader.GetOrdinal("SettlementType")), reader.GetDecimal(reader.GetOrdinal("OriginalAmount")), reader.GetDecimal(reader.GetOrdinal("CompletedAmount")), reader.GetDecimal(reader.GetOrdinal("PendingAmount")), reader.GetDecimal(reader.GetOrdinal("RemainingAmount")), Convert.ToDecimal(reader.GetValue(reader.GetOrdinal("ProgressPercent")))));
        return result;
    }
    private static async Task<SettlementRequestIdentity?> FindSettlementRequestAsync(SqlConnection connection, SqlTransaction transaction, Guid settlementId, CancellationToken token)
    {
        await using var command = new SqlCommand("SELECT TripId, PaidByUserId, ReceivedByUserId, Amount, Status, CreatedBy FROM dbo.TripSettlements WITH (UPDLOCK, HOLDLOCK) WHERE SettlementId=@SettlementId", connection, transaction);
        AddGuid(command, "@SettlementId", settlementId);
        await using var reader = await command.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token)) return null;
        return new SettlementRequestIdentity(reader.GetGuid(0), reader.GetGuid(1), reader.GetGuid(2), reader.GetDecimal(3), reader.GetString(4), reader.GetGuid(5));
    }
    private sealed record SettlementRequestIdentity(Guid TripId, Guid PaidByUserId, Guid ReceivedByUserId, decimal Amount, string Status, Guid CreatedBy);
    private static void AddGuid(SqlCommand command, string name, Guid value) => command.Parameters.Add(name, SqlDbType.UniqueIdentifier).Value = value;
    private static void AddDecimal(SqlCommand command, string name, decimal value) { var p = command.Parameters.Add(name, SqlDbType.Decimal); p.Precision = 19; p.Scale = 2; p.Value = value; }
    private static string? NullableString(SqlDataReader r, string name) { var i = r.GetOrdinal(name); return r.IsDBNull(i) ? null : r.GetString(i); }
    private static DateTime? NullableDate(SqlDataReader r, string name) { var i = r.GetOrdinal(name); return r.IsDBNull(i) ? null : r.GetDateTime(i); }
    private static TripExpenseResponse MapExpense(SqlDataReader r, bool hasCount) => new(r.GetGuid(r.GetOrdinal("ExpenseId")), r.GetGuid(r.GetOrdinal("TripId")), r.GetString(r.GetOrdinal("Description")), r.GetDecimal(r.GetOrdinal("Amount")), r.GetString(r.GetOrdinal("Category")), r.GetGuid(r.GetOrdinal("PaidByUserId")), r.GetString(r.GetOrdinal("PaidByName")), r.GetString(r.GetOrdinal("SplitType")), r.GetDateTime(r.GetOrdinal("ExpenseDate")), NullableString(r, "Notes"), r.GetGuid(r.GetOrdinal("CreatedBy")), r.GetDateTime(r.GetOrdinal("CreatedAt")), NullableDate(r, "UpdatedAt"), hasCount ? r.GetInt32(r.GetOrdinal("ParticipantCount")) : null);
}
