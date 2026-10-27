using PaisaMatters.DomainModel;
using PaisaMatters.ServiceInterface;

namespace PaisaMatters.Service;

public sealed class AuthService(IAuthDataService data) : IAuthService
{
    public Task<Guid?> RegisterAsync(string name, string email, string hash, CancellationToken token) =>
        data.RegisterAsync(name, email, hash, token);

    public Task<Guid?> RegisterAsync(string name, string email, string hash, string? upiId, CancellationToken token) =>
        data.RegisterAsync(name, email, hash, upiId, token);

    public Task<LoginRecord?> FindLoginAsync(string email, CancellationToken token) =>
        data.FindLoginAsync(email, token);

    public Task<UserProfile?> GetProfileAsync(Guid id, CancellationToken token) =>
        data.GetProfileAsync(id, token);

    public Task<UserProfile?> UpdateProfileAsync(Guid id, string fullName, string? upiId, CancellationToken token) =>
        data.UpdateProfileAsync(id, fullName, upiId, token);

    public Task<(string? FullName, string? Email, string? PasswordHash, bool IsActive)?> GetUserCredentialsAsync(Guid id, CancellationToken token) =>
        data.GetUserCredentialsAsync(id, token);

    public Task<bool> UpdatePasswordHashAsync(Guid id, string newHash, CancellationToken token) =>
        data.UpdatePasswordHashAsync(id, newHash, token);

    public Task<IReadOnlyList<string>> GetRolesForUserAsync(Guid id, CancellationToken token) =>
        data.GetRolesForUserAsync(id, token);
}
