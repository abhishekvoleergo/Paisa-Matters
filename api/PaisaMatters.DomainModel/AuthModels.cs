namespace PaisaMatters.DomainModel;

public sealed record RegisterRequest(string? FullName, string? Email, string? Password, string? UpiId = null);
public sealed record LoginRequest(string? Email, string? Password, string? AccessMode);
public sealed record AuthUser(Guid UserId, string FullName, string Email);
public sealed record LoginRecord(Guid UserId, string FullName, string Email, string PasswordHash, bool IsActive);
public sealed record UserProfile(Guid UserId, string FullName, string Email, IReadOnlyList<string> Roles, string? UPIId = null);
public sealed record PaymentRecipientProfile(string FullName, string? UpiId);
public sealed record UpdateProfileRequest(string? FullName, string? UpiId);
public sealed record ChangePasswordRequest(string? CurrentPassword, string? NewPassword, string? ConfirmPassword = null);
