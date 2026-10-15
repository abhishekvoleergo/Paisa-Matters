using PaisaMatters.DomainModel;
using PaisaMatters.ServiceInterface;
using System.Security.Cryptography;

namespace PaisaMatters.Service;

public sealed class TripService(ITripDataService data, IAuthService auth, string applicationBaseUrl) : ITripService
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

    public async Task<TripInviteResponse> CreateInviteAsync(Guid tripId, Guid userId, CreateTripInviteRequest request, CancellationToken token)
    {
        if (request.MaxUses is <= 0) throw new ArgumentException("Maximum uses must be a positive number.");
        DateTime? expiresAt = request.ExpiresAt?.UtcDateTime;
        if (expiresAt is { } expiry && expiry <= DateTime.UtcNow) throw new ArgumentException("Expiration must be in the future.");
        var random = RandomNumberGenerator.GetBytes(32);
        var rawToken = Convert.ToBase64String(random).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        var tokenHash = SHA256.HashData(random);
        var created = await data.CreateInviteAsync(tripId, userId, tokenHash, expiresAt, request.MaxUses, token);
        var baseUrl = applicationBaseUrl;
        var inviteUrl = $"{baseUrl.TrimEnd('/')}/join/{rawToken}";
        return new TripInviteResponse(inviteUrl, created.ExpiresAt, created.MaxUses);
    }

    public Task<DeleteTripResponse> DeleteAsync(Guid tripId, Guid userId, CancellationToken token) => data.DeleteAsync(tripId, userId, token);

    public Task<TripDetailsResponse?> GetByIdAsync(Guid tripId, Guid userId, CancellationToken token) => data.GetByIdAsync(tripId, userId, token);

    public async Task<TripDetailsResponse> UpdateAsync(Guid tripId, Guid userId, CreateTripRequest request, CancellationToken token)
    {
        Validate(request);
        if (request.StartDate.HasValue && request.EndDate.HasValue && request.EndDate < request.StartDate) throw new ArgumentException("End date cannot be before start date.");
        return await data.UpdateAsync(tripId, userId, request, token);
    }

    public Task<IReadOnlyList<TripMemberResponse>> GetMembersAsync(Guid tripId, Guid userId, CancellationToken token) => data.GetMembersAsync(tripId, userId, token);

    public async Task<InvitePreviewResponse> PreviewInviteAsync(string rawToken, CancellationToken token)
    {
        if (!TryDecodeToken(rawToken, out var bytes)) return new InvitePreviewResponse(false, "Invalid", null, null, null, null, null, null);
        return await data.PreviewInviteAsync(SHA256.HashData(bytes), token);
    }

    public async Task<JoinTripResponse> JoinInviteAsync(string rawToken, Guid userId, CancellationToken token)
    {
        if (!TryDecodeToken(rawToken, out var bytes)) throw new ArgumentException("Invitation link is invalid.");
        return await data.JoinInviteAsync(SHA256.HashData(bytes), userId, token);
    }

    private static bool TryDecodeToken(string token, out byte[] bytes)
    {
        bytes = [];
        if (string.IsNullOrWhiteSpace(token) || token.Length != 43 || token.Any(c => !(char.IsAsciiLetterOrDigit(c) || c is '-' or '_'))) return false;
        var base64 = token.Replace('-', '+').Replace('_', '/') + "=";
        try { bytes = Convert.FromBase64String(base64); return bytes.Length == 32; }
        catch (FormatException) { return false; }
    }

    private static void Validate(CreateTripRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TripName) || request.TripName.Trim().Length > 150) throw new ArgumentException("Trip name is required and must be 150 characters or fewer.");
        if (string.IsNullOrWhiteSpace(request.Destination) || request.Destination.Trim().Length > 200) throw new ArgumentException("Destination is required and must be 200 characters or fewer.");
    }
}
