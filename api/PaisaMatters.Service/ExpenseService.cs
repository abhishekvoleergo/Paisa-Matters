using PaisaMatters.DomainModel;
using PaisaMatters.ServiceInterface;

namespace PaisaMatters.Service;

public sealed class ExpenseService(IExpenseDataService data, ITripService trips) : IExpenseService
{
    public async Task<ExpenseSaveResult> SaveExpenseAsync(Guid tripId, Guid? expenseId, SaveTripExpenseRequest request, Guid userId, CancellationToken token)
    {
        var members = await ActiveMembers(tripId, userId, token); var memberIds = members.Select(m => m.UserId).ToHashSet();
        if (!memberIds.Contains(request.PaidByUserId)) throw new ArgumentException("The payer must be an active trip member.");
        ValidateExpense(request);
        var requestedShares = request.Shares!;
        if (requestedShares.Any(s => !memberIds.Contains(s.UserId))) throw new ArgumentException("Every participant must be an active trip member.");
        if (requestedShares.Select(s => s.UserId).Distinct().Count() != requestedShares.Count) throw new ArgumentException("A participant can only be selected once.");
        if (request.SplitType == "Equal" && requestedShares.Any(s => s.ShareAmount is not null)) throw new ArgumentException("Equal split amounts are calculated by the server.");
        if (request.SplitType != "Equal" && (requestedShares.Any(s => s.ShareAmount is null or <= 0) || requestedShares.Sum(s => s.ShareAmount!.Value) != request.Amount)) throw new ArgumentException("Custom and consumption shares must be positive and add up exactly to the total.");
        return await data.SaveExpenseAsync(tripId, expenseId, request, userId, token);
    }

    public async Task<IReadOnlyList<TripExpenseResponse>> GetExpensesAsync(Guid tripId, Guid userId, CancellationToken token) { await ActiveMembers(tripId, userId, token); return await data.GetExpensesAsync(tripId, token); }
    public async Task<TripExpenseResponse?> GetExpenseAsync(Guid tripId, Guid expenseId, Guid userId, CancellationToken token) { await ActiveMembers(tripId, userId, token); return await data.GetExpenseAsync(tripId, expenseId, token); }
    public async Task<ExpenseDeleteResult> DeleteExpenseAsync(Guid tripId, Guid expenseId, Guid userId, CancellationToken token) { await ActiveMembers(tripId, userId, token); return await data.DeleteExpenseAsync(tripId, expenseId, token); }
    public async Task<IReadOnlyList<ExpenseBalanceResponse>> GetBalancesAsync(Guid tripId, Guid userId, CancellationToken token) { await ActiveMembers(tripId, userId, token); return await data.GetBalancesAsync(tripId, token); }
    public async Task<IReadOnlyList<SuggestedSettlementResponse>> GetSuggestionsAsync(Guid tripId, Guid userId, CancellationToken token) { await ActiveMembers(tripId, userId, token); return await data.GetSuggestionsAsync(tripId, token); }
    public async Task<SettlementSaveResult> CreateSettlementAsync(Guid tripId, CreateTripSettlementRequest request, Guid userId, CancellationToken token) { await ActiveMembers(tripId, userId, token); if (request.Amount <= 0) throw new ArgumentException("Settlement amount must be greater than zero."); if (request.PaidByUserId == request.ReceivedByUserId) throw new ArgumentException("The sender and receiver must be different members."); return await data.CreateSettlementAsync(tripId, request, userId, token); }
    public async Task<IReadOnlyList<TripSettlementResponse>> GetSettlementsAsync(Guid tripId, Guid userId, CancellationToken token) { await ActiveMembers(tripId, userId, token); return await data.GetSettlementsAsync(tripId, token); }
    public async Task<SettlementSaveResult> UpdateSettlementStatusAsync(Guid tripId, Guid settlementId, string status, Guid userId, CancellationToken token) { await ActiveMembers(tripId, userId, token); if (status is not ("Completed" or "Cancelled")) throw new ArgumentException("Settlement status must be Completed or Cancelled."); return await data.UpdateSettlementStatusAsync(tripId, settlementId, status, token); }

    private async Task<IReadOnlyList<TripMemberResponse>> ActiveMembers(Guid tripId, Guid userId, CancellationToken token)
    {
        var members = await trips.GetMembersAsync(tripId, userId, token);
        return members.Where(m => string.Equals(m.Status, "Active", StringComparison.OrdinalIgnoreCase)).ToArray();
    }
    private static void ValidateExpense(SaveTripExpenseRequest request)
    {
        if (request.Amount <= 0) throw new ArgumentException("Expense amount must be greater than zero.");
        if (string.IsNullOrWhiteSpace(request.Description) || request.Description.Trim().Length > 200) throw new ArgumentException("Description is required and must be 200 characters or fewer.");
        if (string.IsNullOrWhiteSpace(request.Category) || request.Category.Trim().Length > 50) throw new ArgumentException("Category is required and must be 50 characters or fewer.");
        if (request.SplitType is not ("Equal" or "Custom" or "Consumption")) throw new ArgumentException("Split type must be Equal, Custom, or Consumption.");
        if (request.Shares is null or { Count: 0 }) throw new ArgumentException("Select at least one expense participant.");
    }
}
