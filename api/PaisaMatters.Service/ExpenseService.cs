using PaisaMatters.DomainModel;
using PaisaMatters.ServiceInterface;

namespace PaisaMatters.Service;

public sealed class ExpenseService(IExpenseDataService data, ITripService trips, IAuthService auth) : IExpenseService
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
        if (request.SplitType != "Equal" && (requestedShares.Any(s => s.ShareAmount is null or <= 0 || decimal.Floor(s.ShareAmount.Value) != s.ShareAmount.Value) || requestedShares.Sum(s => s.ShareAmount!.Value) != request.Amount)) throw new ArgumentException("Custom and consumption shares must be positive whole numbers and add up exactly to the total.");
        return await data.SaveExpenseAsync(tripId, expenseId, request, userId, token);
    }

    public async Task<IReadOnlyList<TripExpenseResponse>> GetExpensesAsync(Guid tripId, Guid userId, CancellationToken token) { await ActiveMembers(tripId, userId, token); return await data.GetExpensesAsync(tripId, token); }
    public async Task<TripExpenseResponse?> GetExpenseAsync(Guid tripId, Guid expenseId, Guid userId, CancellationToken token) { await ActiveMembers(tripId, userId, token); return await data.GetExpenseAsync(tripId, expenseId, token); }
    public async Task<ExpenseDeleteResult> DeleteExpenseAsync(Guid tripId, Guid expenseId, Guid userId, CancellationToken token) { await ActiveMembers(tripId, userId, token); return await data.DeleteExpenseAsync(tripId, expenseId, token); }
    public async Task<IReadOnlyList<ExpenseBalanceResponse>> GetBalancesAsync(Guid tripId, Guid userId, CancellationToken token) { await ActiveMembers(tripId, userId, token); return await data.GetBalancesAsync(tripId, token); }
    public async Task<IReadOnlyList<SuggestedSettlementResponse>> GetSuggestionsAsync(Guid tripId, Guid userId, CancellationToken token) { await ActiveMembers(tripId, userId, token); return await data.GetSuggestionsAsync(tripId, token); }
    public async Task<SettlementSaveResult> CreateSettlementAsync(Guid tripId, CreateTripSettlementRequest request, Guid userId, CancellationToken token)
    {
        if (request.SettlementId is null || request.SettlementId == Guid.Empty)
            throw new ArgumentException("A unique repayment request identifier is required.");
        var members = await ActiveMembers(tripId, userId, token);
        ValidatePair(request.PaidByUserId, request.ReceivedByUserId, request.Amount, request.Notes, members);
        if (request.PaidByUserId != userId) throw new UnauthorizedAccessException("Only the payer can record a repayment.");

        return await data.CreateSettlementAsync(tripId, request, userId, token);
    }
    public async Task<SettlementSaveResult> UpdateSettlementAsync(Guid tripId, Guid settlementId, UpdateTripSettlementRequest request, Guid userId, CancellationToken token) { var members = await ActiveMembers(tripId, userId, token); ValidatePair(request.PaidByUserId, request.ReceivedByUserId, request.Amount, request.Notes, members); if (request.PaidByUserId != userId) throw new UnauthorizedAccessException("The authenticated payer must remain the payer when editing a repayment."); var history = await data.GetSettlementHistoryAsync(tripId, userId, "Pending", token); var existing = history.FirstOrDefault(x => x.SettlementId == settlementId); if (existing is null) throw new KeyNotFoundException(); if (existing.PaidByUserId != userId) throw new UnauthorizedAccessException(); return await data.UpdateSettlementAsync(tripId, settlementId, request, token); }
    public async Task<IReadOnlyList<MyTripSettlementResponse>> GetMySettlementsAsync(Guid tripId, Guid userId, CancellationToken token) { await ActiveMembers(tripId, userId, token); return await data.GetMySettlementsAsync(tripId, userId, token); }
    public async Task<PaymentQrDetails> GetPaymentQrDetailsAsync(Guid tripId, Guid recipientId, Guid userId, CancellationToken token)
    {
        var members = await ActiveMembers(tripId, userId, token);
        if (!members.Any(member => member.UserId == recipientId))
            throw new KeyNotFoundException("This recipient is not an active member of the trip.");

        var pair = (await data.GetMySettlementsAsync(tripId, userId, token))
            .FirstOrDefault(item => item.DebtorId == userId && item.CreditorId == recipientId);
        if (pair is null)
            throw new KeyNotFoundException("No outstanding balance is due to this recipient.");
        if (pair.RemainingAmount <= 0)
            throw new ArgumentException("This balance is already settled. Refresh the settlement overview.");

        var trip = await trips.GetByIdAsync(tripId, userId, token);
        if (trip is null) throw new KeyNotFoundException("The trip could not be found or accessed.");
        var recipient = await auth.GetPaymentRecipientProfileAsync(recipientId, token);
        if (recipient is null) throw new KeyNotFoundException("Recipient details are unavailable.");

        var upiId = recipient.UpiId?.Trim();
        if (string.IsNullOrWhiteSpace(upiId) || !System.Text.RegularExpressions.Regex.IsMatch(upiId, "^[A-Za-z0-9._-]{2,}@[A-Za-z0-9.-]+$"))
            upiId = null;

        return new PaymentQrDetails(
            recipientId,
            recipient.FullName,
            upiId,
            pair.RemainingAmount,
            pair.RemainingAmount.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture),
            trip.CurrencyCode,
            $"PaisaMatters {tripId.ToString("N")[..8]}");
    }
    public async Task<IReadOnlyList<TripSettlementResponse>> GetSettlementHistoryAsync(Guid tripId, Guid userId, string? status, CancellationToken token) { await ActiveMembers(tripId, userId, token); if (status is not (null or "Pending" or "Completed" or "Cancelled")) throw new ArgumentException("Status must be Pending, Completed, or Cancelled."); return await data.GetSettlementHistoryAsync(tripId, userId, status, token); }
    public async Task<IReadOnlyList<TripSettlementResponse>> GetSettlementsAsync(Guid tripId, Guid userId, CancellationToken token) { await ActiveMembers(tripId, userId, token); return await data.GetSettlementsAsync(tripId, token); }
    public async Task<SettlementSaveResult> UpdateSettlementStatusAsync(Guid tripId, Guid settlementId, string status, Guid userId, CancellationToken token) { await ActiveMembers(tripId, userId, token); if (status is not ("Completed" or "Cancelled")) throw new ArgumentException("Settlement status must be Completed or Cancelled."); var history = await data.GetSettlementHistoryAsync(tripId, userId, "Pending", token); var existing = history.FirstOrDefault(x => x.SettlementId == settlementId); if (existing is null) throw new KeyNotFoundException(); if (status == "Completed" && existing.ReceivedByUserId != userId) throw new UnauthorizedAccessException("Only the recipient can confirm a repayment."); if (status == "Cancelled" && existing.PaidByUserId != userId && existing.ReceivedByUserId != userId) throw new UnauthorizedAccessException(); return await data.UpdateSettlementStatusAsync(tripId, settlementId, status, token); }

    private static void ValidatePair(Guid payer, Guid receiver, decimal amount, string? notes, IReadOnlyList<TripMemberResponse> members)
    {
        var ids = members.Select(m => m.UserId).ToHashSet(); if (payer == receiver) throw new ArgumentException("The sender and receiver must be different members.");
        if (!ids.Contains(payer) || !ids.Contains(receiver)) throw new ArgumentException("Both repayment participants must be active trip members.");
        if (amount <= 0 || amount > 99999999999999999m) throw new ArgumentException("Settlement amount must be greater than zero and within the supported range.");
        if (decimal.Floor(amount) != amount) throw new ArgumentException("Settlement amount must be a whole number.");
        if (notes?.Length > 500) throw new ArgumentException("Notes must be 500 characters or fewer.");
    }

    private async Task<IReadOnlyList<TripMemberResponse>> ActiveMembers(Guid tripId, Guid userId, CancellationToken token)
    {
        var members = await trips.GetMembersAsync(tripId, userId, token);
        return members.Where(m => string.Equals(m.Status, "Active", StringComparison.OrdinalIgnoreCase)).ToArray();
    }
    private static void ValidateExpense(SaveTripExpenseRequest request)
    {
        if (request.Amount <= 0) throw new ArgumentException("Expense amount must be greater than zero.");
        if (decimal.Floor(request.Amount) != request.Amount) throw new ArgumentException("Expense amount must be a whole number.");
        if (string.IsNullOrWhiteSpace(request.Description) || request.Description.Trim().Length > 200) throw new ArgumentException("Description is required and must be 200 characters or fewer.");
        if (string.IsNullOrWhiteSpace(request.Category) || request.Category.Trim().Length > 50) throw new ArgumentException("Category is required and must be 50 characters or fewer.");
        if (request.SplitType is not ("Equal" or "Custom" or "Consumption")) throw new ArgumentException("Split type must be Equal, Custom, or Consumption.");
        if (request.Shares is null or { Count: 0 }) throw new ArgumentException("Select at least one expense participant.");
    }
}
