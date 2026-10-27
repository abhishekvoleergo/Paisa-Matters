using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using PaisaMatters.DomainModel;
using PaisaMatters.ServiceInterface;

namespace PaisaMatters.API.Controllers;

[ApiController, Route("api/auth")]
public sealed class AuthController(IAuthService auth, IPasswordHasher<AuthUser> hasher, SessionRegistry sessions, ILogger<AuthController> logger) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var name = request.FullName?.Trim();
        var email = NormalizeEmail(request.Email);
        var upiId = string.IsNullOrWhiteSpace(request.UpiId) ? null : request.UpiId.Trim();

        var errors = ValidateCredentials(name, email, request.Password);
        if (upiId is not null && !IsValidUpiId(upiId))
        {
            errors ??= new Dictionary<string, string[]>();
            errors["upiId"] = ["Enter a valid UPI ID (e.g. yourname@upi)."];
        }

        if (errors is not null)
            return BadRequest(new ValidationProblemDetails(errors) { Status = StatusCodes.Status400BadRequest, Title = "One or more validation errors occurred." });

        try
        {
            var hash = hasher.HashPassword(new AuthUser(Guid.Empty, name!, email!), request.Password!);
            var id = await auth.RegisterAsync(name!, email!, hash, upiId, HttpContext.RequestAborted);
            if (id is null) return Conflict(new { message = "An account with this email already exists." });
            var profile = await auth.GetProfileAsync(id.Value, HttpContext.RequestAborted);
            if (profile is null || !profile.Roles.Contains("User", StringComparer.OrdinalIgnoreCase))
            {
                logger.LogError("Registration procedure created an account without an active User role.");
                return Problem("Account registration is temporarily unavailable.", statusCode: 503);
            }
            await SignIn(id.Value, name!, email!);
            return Ok(new { user = profile });
        }
        catch (SqlException ex) when (ex.Number is 2601 or 2627 || ex.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) || ex.Message.Contains("email already exists", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(new { message = "An account with this email already exists." });
        }
        catch (Exception ex) when (ex is SqlException or InvalidOperationException)
        {
            logger.LogError(ex, "Account registration failed");
            return Problem("Account registration is temporarily unavailable.", statusCode: 503);
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var email = NormalizeEmail(request.Email);
        if (!ValidEmail(email) || string.IsNullOrEmpty(request.Password))
            return BadRequest(new { message = "Enter a valid email and password." });

        try
        {
            var record = await auth.FindLoginAsync(email!, HttpContext.RequestAborted);
            if (record is null || !record.IsActive || hasher.VerifyHashedPassword(new AuthUser(record.UserId, record.FullName, record.Email), record.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
                return Unauthorized();

            var roles = await auth.GetRolesForUserAsync(record.UserId, HttpContext.RequestAborted);
            if (roles.Count == 0) return Unauthorized();
            if (string.Equals(request.AccessMode, "Admin", StringComparison.OrdinalIgnoreCase) && !roles.Contains("Admin", StringComparer.OrdinalIgnoreCase))
                return Forbid();

            await SignIn(record.UserId, record.FullName, record.Email);
            return Ok(new { user = await auth.GetProfileAsync(record.UserId, HttpContext.RequestAborted) });
        }
        catch (Exception ex) when (ex is SqlException or InvalidOperationException)
        {
            logger.LogError(ex, "Login failed");
            return Problem("Sign in is temporarily unavailable.", statusCode: 503);
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        if (Guid.TryParse(User.FindFirstValue(ClaimTypes.Sid), out var sessionId)) sessions.Revoke(sessionId);
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return Unauthorized();
        var profile = await auth.GetProfileAsync(id, HttpContext.RequestAborted);
        return profile is null ? Unauthorized() : Ok(new { user = profile });
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest request)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return Unauthorized();

        var name = request.FullName?.Trim();
        if (string.IsNullOrWhiteSpace(name) || name.Length > 150)
            return BadRequest(new { message = "Enter your full name (up to 150 characters)." });

        var upiId = string.IsNullOrWhiteSpace(request.UpiId) ? null : request.UpiId.Trim();
        if (upiId is not null && !IsValidUpiId(upiId))
            return BadRequest(new { message = "Enter a valid UPI ID (e.g. yourname@upi)." });

        try
        {
            var updated = await auth.UpdateProfileAsync(id, name, upiId, HttpContext.RequestAborted);
            if (updated is null)
                return NotFound(new { message = "Active user not found." });

            var email = User.FindFirstValue(ClaimTypes.Email) ?? updated.Email;
            var sessionId = User.FindFirstValue(ClaimTypes.Sid);
            if (Guid.TryParse(sessionId, out var sid))
            {
                var identity = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, id.ToString()),
                    new Claim(ClaimTypes.Name, updated.FullName),
                    new Claim(ClaimTypes.Email, email),
                    new Claim(ClaimTypes.Sid, sid.ToString())
                }, CookieAuthenticationDefaults.AuthenticationScheme);

                foreach (var role in updated.Roles)
                    identity.AddClaim(new Claim(ClaimTypes.Role, role));

                await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity), new AuthenticationProperties { IsPersistent = true, AllowRefresh = true });
            }

            return Ok(new { user = updated, message = "Profile updated successfully." });
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Failed to update profile for user {UserId}", id);
            return Problem("Profile update is temporarily unavailable.", statusCode: 503);
        }
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return Unauthorized();

        if (string.IsNullOrEmpty(request.CurrentPassword))
            return BadRequest(new { message = "Current password is required." });

        if (string.IsNullOrEmpty(request.NewPassword) || request.NewPassword.Length < 10 || request.NewPassword.Length > 128 || !request.NewPassword.Any(char.IsLetter) || !request.NewPassword.Any(char.IsDigit))
            return BadRequest(new { message = "Use 10–128 characters with at least one letter and one number for your new password." });

        if (!string.IsNullOrEmpty(request.ConfirmPassword) && request.NewPassword != request.ConfirmPassword)
            return BadRequest(new { message = "The new passwords do not match." });

        try
        {
            var credentials = await auth.GetUserCredentialsAsync(id, HttpContext.RequestAborted);
            if (credentials is null || !credentials.Value.IsActive)
                return NotFound(new { message = "Active user not found." });

            var user = new AuthUser(id, credentials.Value.FullName ?? string.Empty, credentials.Value.Email ?? string.Empty);
            var verification = hasher.VerifyHashedPassword(user, credentials.Value.PasswordHash ?? string.Empty, request.CurrentPassword);
            if (verification == PasswordVerificationResult.Failed)
                return BadRequest(new { message = "Current password is incorrect." });

            var newHash = hasher.HashPassword(user, request.NewPassword);
            var success = await auth.UpdatePasswordHashAsync(id, newHash, HttpContext.RequestAborted);
            if (!success)
                return Problem("Failed to update password.", statusCode: 500);

            return Ok(new { message = "Password changed successfully." });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to change password for user {UserId}", id);
            return Problem("Password update is temporarily unavailable.", statusCode: 503);
        }
    }

    private Task SignIn(Guid id, string name, string email)
    {
        var sessionId = sessions.Create();
        return HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, id.ToString()), new Claim(ClaimTypes.Name, name), new Claim(ClaimTypes.Email, email), new Claim(ClaimTypes.Sid, sessionId.ToString()) }, CookieAuthenticationDefaults.AuthenticationScheme)), new AuthenticationProperties { IsPersistent = true, AllowRefresh = true });
    }

    private static string? NormalizeEmail(string? email) => string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();
    private static bool ValidEmail(string? email) => email is not null && email.Length <= 256 && System.Net.Mail.MailAddress.TryCreate(email, out var parsed) && parsed.Address == email && email.LastIndexOf('@') > 0 && email[(email.LastIndexOf('@') + 1)..].Contains('.') && !email.EndsWith('.');

    private static bool IsValidUpiId(string? upiId)
    {
        if (string.IsNullOrWhiteSpace(upiId) || upiId.Length < 3 || upiId.Length > 100) return false;
        var atIndex = upiId.IndexOf('@');
        if (atIndex <= 0 || atIndex != upiId.LastIndexOf('@') || atIndex == upiId.Length - 1) return false;
        var handle = upiId[..atIndex];
        var provider = upiId[(atIndex + 1)..];
        return handle.All(c => char.IsLetterOrDigit(c) || c is '.' or '-' or '_')
            && provider.All(c => char.IsLetterOrDigit(c) || c is '.' or '-');
    }

    private static Dictionary<string, string[]>? ValidateCredentials(string? name, string? email, string? password)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(name) || name.Length > 150) errors["fullName"] = ["Enter your name (up to 150 characters)."];
        if (!ValidEmail(email)) errors["email"] = ["Enter a valid email address."];
        if (password is null || password.Length < 10 || password.Length > 128 || !password.Any(char.IsLetter) || !password.Any(char.IsDigit)) errors["password"] = ["Use 10–128 characters with at least one letter and one number."];
        return errors.Count == 0 ? null : errors;
    }
}
