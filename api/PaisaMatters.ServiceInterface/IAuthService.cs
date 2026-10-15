using PaisaMatters.DomainModel;

namespace PaisaMatters.ServiceInterface;

public interface IAuthDataService
{
    Task<Guid?> RegisterAsync(string name, string email, string hash, CancellationToken token);
    Task<LoginRecord?> FindLoginAsync(string email, CancellationToken token);
    Task<UserProfile?> GetProfileAsync(Guid id, CancellationToken token);
    Task<IReadOnlyList<string>> GetRolesForUserAsync(Guid id, CancellationToken token);
}

public interface IAuthService
{
    Task<Guid?> RegisterAsync(string name, string email, string hash, CancellationToken token);
    Task<LoginRecord?> FindLoginAsync(string email, CancellationToken token);
    Task<UserProfile?> GetProfileAsync(Guid id, CancellationToken token);
    Task<IReadOnlyList<string>> GetRolesForUserAsync(Guid id, CancellationToken token);
}
