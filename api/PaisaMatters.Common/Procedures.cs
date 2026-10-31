namespace PaisaMatters.Common;

public static class Procedures
{
    public const string CreateLoginAccount = "dbo.usp_CreateLoginAccount";
    public const string UpdateUserProfile = "dbo.usp_UpdateUserProfile";
    public const string CreateTrip = "dbo.usp_CreateTrip";
    public const string GetTripsByUser = "dbo.usp_GetTripsByUser";
    public const string CreateTripInvite = "dbo.usp_CreateTripInvite";
    public const string DeleteTrip = "dbo.usp_DeleteTrip";
    public const string GetTripById = "dbo.usp_GetTripById";
    public const string UpdateTrip = "dbo.usp_UpdateTrip";
    public const string GetTripMembers = "dbo.usp_GetTripMembers";
    public const string GetTripInviteByTokenHash = "dbo.usp_GetTripInviteByTokenHash";
    public const string JoinTripByInvite = "dbo.usp_JoinTripByInvite";
    public const string CreateTripJoinRequestByInvite = "dbo.usp_CreateTripJoinRequestByInvite";
    public const string GetMyTripJoinRequests = "dbo.usp_GetMyTripJoinRequests";
    public const string GetOwnerTripJoinRequests = "dbo.usp_GetOwnerTripJoinRequests";
    public const string ApproveTripJoinRequest = "dbo.usp_ApproveTripJoinRequest";
    public const string RejectTripJoinRequest = "dbo.usp_RejectTripJoinRequest";
    public const string CancelTripJoinRequest = "dbo.usp_CancelTripJoinRequest";
    public const string ClearTripJoinRequest = "dbo.usp_ClearTripJoinRequest";
    public const string ClearAllTripJoinRequests = "dbo.usp_ClearAllTripJoinRequests";
    public const string CreateTripExpense = "dbo.usp_CreateTripExpense";
    public const string GetTripExpenses = "dbo.usp_GetTripExpenses";
    public const string GetTripExpenseById = "dbo.usp_GetTripExpenseById";
    public const string DeleteTripExpense = "dbo.usp_DeleteTripExpense";
    public const string GetTripExpenseBalances = "dbo.usp_GetTripExpenseBalances";
    public const string GetSuggestedSettlements = "dbo.usp_GetSuggestedSettlements";
    public const string CreateTripSettlement = "dbo.usp_CreateTripSettlement";
    public const string GetTripSettlements = "dbo.usp_GetTripSettlements";
    public const string UpdateTripSettlementStatus = "dbo.usp_UpdateTripSettlementStatus";
    public const string UpdateTripSettlement = "dbo.usp_UpdateTripSettlement";
    public const string GetMyTripSettlements = "dbo.usp_GetMyTripSettlements";
    public const string GetTripSettlementHistory = "dbo.usp_GetTripSettlementHistory";
}
