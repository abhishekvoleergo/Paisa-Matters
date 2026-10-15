using System.ComponentModel.DataAnnotations;

namespace PaisaMatters.DomainModel;

public sealed class CreateTripRequest
{
    [Required, StringLength(150, MinimumLength = 1)] public string? TripName { get; init; }
    [Required, StringLength(200, MinimumLength = 1)] public string? Destination { get; init; }
    public DateOnly? StartDate { get; init; }
    public DateOnly? EndDate { get; init; }
}

public sealed record TripResponse(Guid TripId, string TripName, string Destination, Guid? CreatedBy,
    DateOnly? StartDate, DateOnly? EndDate, string CurrencyCode, DateTime? CreatedAt,
    string? MemberRole = null, string? MemberStatus = null);

public sealed class CreateTripInviteRequest
{
    public DateTimeOffset? ExpiresAt { get; init; }
    [Range(1, int.MaxValue)] public int? MaxUses { get; init; }
}

public sealed record TripInviteResponse(string InviteUrl, DateTime? ExpiresAt, int? MaxUses);
public sealed record DeleteTripResponse(Guid TripId, bool IsDeleted, string Message);
public sealed record TripMemberResponse(Guid UserId, string FullName, string Role, string Status, DateTime? JoinedAt);
public sealed record TripDetailsResponse(Guid TripId, string TripName, string Destination, Guid? CreatedBy, DateOnly? StartDate, DateOnly? EndDate, string CurrencyCode, DateTime? CreatedAt, string? MemberRole, string? MemberStatus, string OwnerName, string CurrentUserRole, int MemberCount, DateTime? UpdatedAt);
public sealed record InvitePreviewResponse(bool Valid, string Status, Guid? TripId, string? TripName, string? Destination, DateTime? ExpiresAt, int? MaxUses, int? UseCount);
public sealed record JoinTripResponse(Guid TripId, string Status);
