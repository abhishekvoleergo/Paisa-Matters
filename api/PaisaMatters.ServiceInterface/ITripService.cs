using PaisaMatters.DomainModel;

namespace PaisaMatters.ServiceInterface;

public interface ITripDataService
{
    Task<TripResponse> CreateAsync(CreateTripRequest request, Guid userId, CancellationToken token);
    Task<IReadOnlyList<TripResponse>> GetByUserAsync(Guid userId, CancellationToken token);
}

public interface ITripService
{
    Task<TripResponse> CreateAsync(CreateTripRequest request, Guid userId, CancellationToken token);
    Task<IReadOnlyList<TripResponse>> GetByUserAsync(Guid userId, CancellationToken token);
}
