namespace PaisaMatters.DomainModel;

public sealed record RegisterRequest(string? FullName, string? Email, string? Password);
public sealed record LoginRequest(string? Email, string? Password, string? AccessMode);
public sealed record AuthUser(Guid UserId, string FullName, string Email);
public sealed record LoginRecord(Guid UserId, string FullName, string Email, string PasswordHash, bool IsActive);
public sealed record UserProfile(Guid UserId, string FullName, string Email, IReadOnlyList<string> Roles);
