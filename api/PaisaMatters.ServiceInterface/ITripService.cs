using PaisaMatters.DomainModel;

namespace PaisaMatters.ServiceInterface;

public interface ITripDataService
{
    Task<TripResponse> CreateAsync(CreateTripRequest request, Guid userId, CancellationToken token);
    Task<IReadOnlyList<TripResponse>> GetByUserAsync(Guid userId, CancellationToken token);
    Task<(Guid InviteId, DateTime? ExpiresAt, int? MaxUses)> CreateInviteAsync(Guid tripId, Guid userId, byte[] tokenHash, DateTime? expiresAt, int? maxUses, CancellationToken token);
    Task<DeleteTripResponse> DeleteAsync(Guid tripId, Guid userId, CancellationToken token);
    Task<TripDetailsResponse?> GetByIdAsync(Guid tripId, Guid userId, CancellationToken token);
    Task<TripDetailsResponse> UpdateAsync(Guid tripId, Guid userId, CreateTripRequest request, CancellationToken token);
    Task<IReadOnlyList<TripMemberResponse>> GetMembersAsync(Guid tripId, Guid userId, CancellationToken token);
    Task<InvitePreviewResponse> PreviewInviteAsync(byte[] tokenHash, CancellationToken token);
    Task<JoinTripResponse> JoinInviteAsync(byte[] tokenHash, Guid userId, CancellationToken token);
}

public interface ITripService
{
    Task<TripResponse> CreateAsync(CreateTripRequest request, Guid userId, CancellationToken token);
    Task<IReadOnlyList<TripResponse>> GetByUserAsync(Guid userId, CancellationToken token);
    Task<TripInviteResponse> CreateInviteAsync(Guid tripId, Guid userId, CreateTripInviteRequest request, CancellationToken token);
    Task<DeleteTripResponse> DeleteAsync(Guid tripId, Guid userId, CancellationToken token);
    Task<TripDetailsResponse?> GetByIdAsync(Guid tripId, Guid userId, CancellationToken token);
    Task<TripDetailsResponse> UpdateAsync(Guid tripId, Guid userId, CreateTripRequest request, CancellationToken token);
    Task<IReadOnlyList<TripMemberResponse>> GetMembersAsync(Guid tripId, Guid userId, CancellationToken token);
    Task<InvitePreviewResponse> PreviewInviteAsync(string rawToken, CancellationToken token);
    Task<JoinTripResponse> JoinInviteAsync(string rawToken, Guid userId, CancellationToken token);
}
