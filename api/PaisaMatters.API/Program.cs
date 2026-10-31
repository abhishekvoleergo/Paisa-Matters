using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using PaisaMatters.API;
using PaisaMatters.DataAccess;
using PaisaMatters.DomainModel;
using PaisaMatters.Service;
using PaisaMatters.ServiceInterface;

var builder = WebApplication.CreateBuilder(args);
var isDevelopment = builder.Environment.IsDevelopment();

var applicationBaseUrl = GetApplicationBaseUrl(builder.Configuration, isDevelopment);
var allowedOrigins = GetAllowedOrigins(builder.Configuration, builder.Environment);
if (!isDevelopment && !allowedOrigins.Contains(applicationBaseUrl, StringComparer.Ordinal))
{
    throw new InvalidOperationException(
        "Application:BaseUrl must exactly match one of the configured Application:AllowedOrigin or Application:AllowedOrigins values.");
}

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Missing required configuration: ConnectionStrings:DefaultConnection. Set ConnectionStrings__DefaultConnection in the hosting environment.");
}

var keyDirectory = isDevelopment
    ? Path.Combine(builder.Environment.ContentRootPath, ".keys")
    : Path.Combine(builder.Environment.ContentRootPath, "App_Data", "PaisaMatters", "DataProtection-Keys");
EnsureWritableDirectory(keyDirectory);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services
    .AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(keyDirectory));

builder.Services.AddCors(options =>
{
    options.AddPolicy("web", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")
            .WithHeaders("Accept", "Content-Type")
            .AllowCredentials();
    });
});

builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "paisamatters.session";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = isDevelopment ? SameSiteMode.Lax : SameSiteMode.None;
        options.Cookie.SecurePolicy = isDevelopment
            ? CookieSecurePolicy.SameAsRequest
            : CookieSecurePolicy.Always;
        options.Cookie.Path = "/";
        options.ExpireTimeSpan = TimeSpan.FromHours(12);
        options.SlidingExpiration = true;

        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
        options.Events.OnValidatePrincipal = async context =>
        {
            var idValue = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            var sessionValue = context.Principal?.FindFirstValue(ClaimTypes.Sid);
            var sessions = context.HttpContext.RequestServices.GetRequiredService<SessionRegistry>();
            if (!Guid.TryParse(idValue, out var id) ||
                !Guid.TryParse(sessionValue, out var sessionId) ||
                !sessions.IsValid(sessionId))
            {
                context.RejectPrincipal();
                return;
            }

            var auth = context.HttpContext.RequestServices.GetRequiredService<IAuthService>();
            var profile = await auth.GetProfileAsync(id, context.HttpContext.RequestAborted);
            if (profile is null)
            {
                context.RejectPrincipal();
                return;
            }

            var identity = (ClaimsIdentity)context.Principal!.Identity!;
            foreach (var claim in identity.FindAll(ClaimTypes.Role).ToArray())
            {
                identity.RemoveClaim(claim);
            }

            foreach (var role in profile.Roles)
            {
                identity.AddClaim(new Claim(ClaimTypes.Role, role));
            }

            foreach (var claim in identity.FindAll(ClaimTypes.Name).ToArray())
            {
                identity.RemoveClaim(claim);
            }

            identity.AddClaim(new Claim(ClaimTypes.Name, profile.FullName));
            context.ShouldRenew = true;
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddScoped<IAuthDataService>(_ => new AuthDataService(connectionString));
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITripDataService>(_ => new TripDataService(connectionString));
builder.Services.AddScoped<IExpenseDataService>(_ => new ExpenseDataService(connectionString));
builder.Services.AddScoped<ITripService>(services => new TripService(
    services.GetRequiredService<ITripDataService>(),
    services.GetRequiredService<IAuthService>(),
    applicationBaseUrl));
builder.Services.AddScoped<IExpenseService, ExpenseService>();
builder.Services.AddScoped<IPasswordHasher<AuthUser>, PasswordHasher<AuthUser>>();
builder.Services.AddSingleton<SessionRegistry>();

var app = builder.Build();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "PaisaMatters API v1");
        options.RoutePrefix = "swagger";
        options.DisplayRequestDuration();
        options.EnablePersistAuthorization();
    });
}

app.UseExceptionHandler(error => error.Run(async context =>
{
    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    await Results.Problem("The request could not be completed. Please try again.").ExecuteAsync(context);
}));

app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api") &&
        context.Request.Headers.TryGetValue("Origin", out var originHeader) &&
        !allowedOrigins.Contains(originHeader.ToString(), StringComparer.Ordinal))
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return;
    }

    await next();
});

app.UseCors("web");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/api/admin/verify-access", () => Results.Ok(new { authorized = true }))
    .RequireAuthorization(policy => policy.RequireRole("Admin"));
app.Run();

static string GetApplicationBaseUrl(IConfiguration configuration, bool isDevelopment)
{
    var configuredBaseUrl = configuration["Application:BaseUrl"];
    if (string.IsNullOrWhiteSpace(configuredBaseUrl))
    {
        if (!isDevelopment)
        {
            throw new InvalidOperationException(
                "Missing required configuration: Application:BaseUrl. Set it to the public HTTPS frontend origin.");
        }

        configuredBaseUrl = "http://localhost:3000";
    }

    return ValidateOrigin(
        configuredBaseUrl,
        "Application:BaseUrl",
        requireHttps: !isDevelopment,
        rejectLoopback: !isDevelopment);
}

static string[] GetAllowedOrigins(IConfiguration configuration, IHostEnvironment environment)
{
    var isDevelopment = environment.IsDevelopment();
    var allowedOrigins = new HashSet<string>(StringComparer.Ordinal);

    if (isDevelopment)
    {
        allowedOrigins.UnionWith(
        [
            "http://localhost:3000",
            "https://localhost:3000",
            "http://127.0.0.1:3000",
            "https://127.0.0.1:3000"
        ]);
    }

    AddConfiguredOrigin(configuration["Application:AllowedOrigin"], "Application:AllowedOrigin");

    var allowedOriginsSection = configuration.GetSection("Application:AllowedOrigins");
    var configuredOrigins = allowedOriginsSection.GetChildren()
        .Select(child => child.Value)
        .Where(value => !string.IsNullOrWhiteSpace(value))
        .Cast<string>()
        .ToList();

    if (!string.IsNullOrWhiteSpace(allowedOriginsSection.Value))
    {
        configuredOrigins.AddRange(allowedOriginsSection.Value.Split(
            ',',
            StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries));
    }

    foreach (var origin in configuredOrigins)
    {
        AddConfiguredOrigin(origin, "Application:AllowedOrigins");
    }

    if (!isDevelopment && allowedOrigins.Count == 0)
    {
        throw new InvalidOperationException(
            "Missing required configuration: Application:AllowedOrigin or Application:AllowedOrigins. Set the exact HTTPS frontend origin.");
    }

    return allowedOrigins.ToArray();

    void AddConfiguredOrigin(string? origin, string configurationKey)
    {
        if (string.IsNullOrWhiteSpace(origin))
        {
            return;
        }

        allowedOrigins.Add(ValidateOrigin(
            origin,
            configurationKey,
            requireHttps: !isDevelopment,
            rejectLoopback: !isDevelopment));
    }
}

static string ValidateOrigin(string value, string configurationKey, bool requireHttps, bool rejectLoopback)
{
    if (!string.Equals(value, value.Trim(), StringComparison.Ordinal) ||
        !Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
        (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) ||
        (requireHttps && uri.Scheme != Uri.UriSchemeHttps) ||
        uri.UserInfo.Length != 0 ||
        uri.AbsolutePath != "/" ||
        uri.Query.Length != 0 ||
        uri.Fragment.Length != 0 ||
        !string.Equals(uri.GetLeftPart(UriPartial.Authority), value, StringComparison.Ordinal))
    {
        throw new InvalidOperationException(
            $"{configurationKey} must be an exact origin such as https://app.example.com, with no path, query, fragment, or trailing slash.");
    }

    var isLocalHost = uri.IsLoopback ||
        uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
        uri.Host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase) ||
        (IPAddress.TryParse(uri.Host, out var address) && IPAddress.IsLoopback(address));
    if (rejectLoopback && isLocalHost)
    {
        throw new InvalidOperationException($"{configurationKey} cannot use a localhost or loopback origin in production.");
    }

    return value;
}

static void EnsureWritableDirectory(string path)
{
    try
    {
        Directory.CreateDirectory(path);
        var probePath = Path.Combine(path, $".write-check-{Guid.NewGuid():N}");
        using (new FileStream(probePath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        {
        }

        File.Delete(probePath);
    }
    catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
    {
        throw new InvalidOperationException(
            $"The Data Protection key directory '{path}' must be writable and persistent. Ensure the website's App_Data folder is writable by the application pool.",
            exception);
    }
}
