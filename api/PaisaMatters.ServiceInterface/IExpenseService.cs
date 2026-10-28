using PaisaMatters.DomainModel;

namespace PaisaMatters.ServiceInterface;

public interface IExpenseDataService
{
    Task<ExpenseSaveResult> SaveExpenseAsync(Guid tripId, Guid? expenseId, SaveTripExpenseRequest request, Guid userId, CancellationToken token);
    Task<IReadOnlyList<TripExpenseResponse>> GetExpensesAsync(Guid tripId, CancellationToken token);
    Task<TripExpenseResponse?> GetExpenseAsync(Guid tripId, Guid expenseId, CancellationToken token);
    Task<ExpenseDeleteResult> DeleteExpenseAsync(Guid tripId, Guid expenseId, CancellationToken token);
    Task<IReadOnlyList<ExpenseBalanceResponse>> GetBalancesAsync(Guid tripId, CancellationToken token);
    Task<IReadOnlyList<SuggestedSettlementResponse>> GetSuggestionsAsync(Guid tripId, CancellationToken token);
    Task<SettlementSaveResult> CreateSettlementAsync(Guid tripId, CreateTripSettlementRequest request, Guid userId, CancellationToken token);
    Task<SettlementSaveResult> UpdateSettlementAsync(Guid tripId, Guid settlementId, UpdateTripSettlementRequest request, CancellationToken token);
    Task<IReadOnlyList<MyTripSettlementResponse>> GetMySettlementsAsync(Guid tripId, Guid userId, CancellationToken token);
    Task<IReadOnlyList<TripSettlementResponse>> GetSettlementHistoryAsync(Guid tripId, Guid userId, string? status, CancellationToken token);
    Task<IReadOnlyList<TripSettlementResponse>> GetSettlementsAsync(Guid tripId, CancellationToken token);
    Task<SettlementSaveResult> UpdateSettlementStatusAsync(Guid tripId, Guid settlementId, string status, CancellationToken token);
}

public interface IExpenseService
{
    Task<ExpenseSaveResult> SaveExpenseAsync(Guid tripId, Guid? expenseId, SaveTripExpenseRequest request, Guid userId, CancellationToken token);
    Task<IReadOnlyList<TripExpenseResponse>> GetExpensesAsync(Guid tripId, Guid userId, CancellationToken token);
    Task<TripExpenseResponse?> GetExpenseAsync(Guid tripId, Guid expenseId, Guid userId, CancellationToken token);
    Task<ExpenseDeleteResult> DeleteExpenseAsync(Guid tripId, Guid expenseId, Guid userId, CancellationToken token);
    Task<IReadOnlyList<ExpenseBalanceResponse>> GetBalancesAsync(Guid tripId, Guid userId, CancellationToken token);
    Task<IReadOnlyList<SuggestedSettlementResponse>> GetSuggestionsAsync(Guid tripId, Guid userId, CancellationToken token);
    Task<SettlementSaveResult> CreateSettlementAsync(Guid tripId, CreateTripSettlementRequest request, Guid userId, CancellationToken token);
    Task<SettlementSaveResult> UpdateSettlementAsync(Guid tripId, Guid settlementId, UpdateTripSettlementRequest request, Guid userId, CancellationToken token);
    Task<IReadOnlyList<MyTripSettlementResponse>> GetMySettlementsAsync(Guid tripId, Guid userId, CancellationToken token);
    Task<PaymentQrDetails> GetPaymentQrDetailsAsync(Guid tripId, Guid recipientId, Guid userId, CancellationToken token);
    Task<IReadOnlyList<TripSettlementResponse>> GetSettlementHistoryAsync(Guid tripId, Guid userId, string? status, CancellationToken token);
    Task<IReadOnlyList<TripSettlementResponse>> GetSettlementsAsync(Guid tripId, Guid userId, CancellationToken token);
    Task<SettlementSaveResult> UpdateSettlementStatusAsync(Guid tripId, Guid settlementId, string status, Guid userId, CancellationToken token);
}
