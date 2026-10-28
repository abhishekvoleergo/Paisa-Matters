using PaisaMatters.DomainModel;

namespace PaisaMatters.ServiceInterface;

public interface IAuthDataService
{
    Task<Guid?> RegisterAsync(string name, string email, string hash, string? upiId, CancellationToken token);
    Task<Guid?> RegisterAsync(string name, string email, string hash, CancellationToken token) => RegisterAsync(name, email, hash, null, token);
    Task<LoginRecord?> FindLoginAsync(string email, CancellationToken token);
    Task<UserProfile?> GetProfileAsync(Guid id, CancellationToken token);
    Task<PaymentRecipientProfile?> GetPaymentRecipientProfileAsync(Guid id, CancellationToken token);
    Task<UserProfile?> UpdateProfileAsync(Guid id, string fullName, string? upiId, CancellationToken token);
    Task<(string? FullName, string? Email, string? PasswordHash, bool IsActive)?> GetUserCredentialsAsync(Guid id, CancellationToken token);
    Task<bool> UpdatePasswordHashAsync(Guid id, string newHash, CancellationToken token);
    Task<IReadOnlyList<string>> GetRolesForUserAsync(Guid id, CancellationToken token);
}

public interface IAuthService
{
    Task<Guid?> RegisterAsync(string name, string email, string hash, string? upiId, CancellationToken token);
    Task<Guid?> RegisterAsync(string name, string email, string hash, CancellationToken token) => RegisterAsync(name, email, hash, null, token);
    Task<LoginRecord?> FindLoginAsync(string email, CancellationToken token);
    Task<UserProfile?> GetProfileAsync(Guid id, CancellationToken token);
    Task<PaymentRecipientProfile?> GetPaymentRecipientProfileAsync(Guid id, CancellationToken token);
    Task<UserProfile?> UpdateProfileAsync(Guid id, string fullName, string? upiId, CancellationToken token);
    Task<(string? FullName, string? Email, string? PasswordHash, bool IsActive)?> GetUserCredentialsAsync(Guid id, CancellationToken token);
    Task<bool> UpdatePasswordHashAsync(Guid id, string newHash, CancellationToken token);
    Task<IReadOnlyList<string>> GetRolesForUserAsync(Guid id, CancellationToken token);
}
