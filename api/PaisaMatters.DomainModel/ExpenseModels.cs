using System.ComponentModel.DataAnnotations;

namespace PaisaMatters.DomainModel;

public sealed class SaveTripExpenseRequest
{
    [Required, StringLength(200, MinimumLength = 1)] public string? Description { get; init; }
    [Range(typeof(decimal), "1", "99999999999999999")] public decimal Amount { get; init; }
    [Required, StringLength(50)] public string? Category { get; init; }
    public Guid PaidByUserId { get; init; }
    [Required] public string? SplitType { get; init; }
    public DateTime? ExpenseDate { get; init; }
    [StringLength(500)] public string? Notes { get; init; }
    [MinLength(1)] public IReadOnlyList<ExpenseShareInput>? Shares { get; init; }
}

public sealed record ExpenseShareInput(Guid UserId, decimal? ShareAmount);
public sealed record ExpenseSaveResult(Guid ExpenseId, Guid TripId, string SplitType, decimal Amount, string Result);
public sealed record ExpenseShareResponse(Guid ExpenseSplitId, Guid ExpenseId, Guid UserId, string FullName, string Email, decimal ShareAmount);
public sealed record TripExpenseResponse(Guid ExpenseId, Guid TripId, string Description, decimal Amount, string Category, Guid PaidByUserId, string PaidByName, string SplitType, DateTime ExpenseDate, string? Notes, Guid CreatedBy, DateTime CreatedAt, DateTime? UpdatedAt, int? ParticipantCount, IReadOnlyList<ExpenseShareResponse>? Shares = null);
public sealed record ExpenseDeleteResult(Guid ExpenseId, string Result);
public sealed record ExpenseBalanceResponse(Guid UserId, string FullName, decimal TotalPaid, decimal TotalShares, decimal TotalSettlementSent, decimal TotalSettlementReceived, decimal NetBalance);
public sealed record SuggestedSettlementResponse(Guid FromUserId, string FromName, Guid ToUserId, string ToName, decimal Amount);
public sealed class CreateTripSettlementRequest
{
    public Guid PaidByUserId { get; init; }
    public Guid ReceivedByUserId { get; init; }
    [Range(typeof(decimal), "1", "99999999999999999")] public decimal Amount { get; init; }
    [StringLength(500)] public string? Notes { get; init; }
}
public sealed class UpdateTripSettlementRequest
{
    public Guid PaidByUserId { get; init; }
    public Guid ReceivedByUserId { get; init; }
    [Range(typeof(decimal), "1", "99999999999999999")] public decimal Amount { get; init; }
    [StringLength(500)] public string? Notes { get; init; }
}
public sealed record MyTripSettlementResponse(Guid DebtorId, string DebtorName, Guid CreditorId, string CreditorName, string SettlementType, decimal OriginalAmount, decimal CompletedAmount, decimal PendingAmount, decimal RemainingAmount, decimal ProgressPercent);
public sealed record SettlementSaveResult(Guid SettlementId, string Status);
public sealed record TripSettlementResponse(Guid SettlementId, Guid TripId, Guid PaidByUserId, string PaidByName, Guid ReceivedByUserId, string ReceivedByName, decimal Amount, DateTime SettlementDate, string Status, string? Notes, Guid CreatedBy, DateTime CreatedAt, DateTime? UpdatedAt);
public sealed class UpdateTripSettlementStatusRequest { [Required] public string? Status { get; init; } }
