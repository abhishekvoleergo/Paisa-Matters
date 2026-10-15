using PaisaMatters.DomainModel;
using PaisaMatters.ServiceInterface;

namespace PaisaMatters.Service;

public sealed class TripService(ITripDataService data, IAuthService auth) : ITripService
{
    public async Task<TripResponse> CreateAsync(CreateTripRequest request, Guid userId, CancellationToken token)
    {
        if (string.IsNullOrWhiteSpace(request.TripName) || request.TripName.Trim().Length > 150) throw new ArgumentException("Trip name is required and must be 150 characters or fewer.");
        if (string.IsNullOrWhiteSpace(request.Destination) || request.Destination.Trim().Length > 200) throw new ArgumentException("Destination is required and must be 200 characters or fewer.");
        if (request.StartDate.HasValue && request.EndDate.HasValue && request.EndDate < request.StartDate) throw new ArgumentException("End date cannot be before start date.");
        var user = await auth.GetProfileAsync(userId, token);
        if (user is null || !user.Roles.Contains("User", StringComparer.OrdinalIgnoreCase)) throw new UnauthorizedAccessException("An active user account is required to create trips.");
        return await data.CreateAsync(request, userId, token);
    }
    public Task<IReadOnlyList<TripResponse>> GetByUserAsync(Guid userId, CancellationToken token) => data.GetByUserAsync(userId, token);
}
