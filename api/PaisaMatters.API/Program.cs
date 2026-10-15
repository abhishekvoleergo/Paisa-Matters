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
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", ".keys"))));
var allowedOrigins = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
{
    "http://localhost:3000",
    "https://localhost:3000",
    "http://127.0.0.1:3000",
    "https://127.0.0.1:3000"
};
var configuredOrigin = builder.Configuration["Application:AllowedOrigin"];
if (!string.IsNullOrWhiteSpace(configuredOrigin)) allowedOrigins.Add(configuredOrigin.TrimEnd('/'));
var configuredOrigins = builder.Configuration.GetSection("Application:AllowedOrigins").Get<string[]>();
if (configuredOrigins is not null)
{
    foreach (var o in configuredOrigins)
    {
        if (!string.IsNullOrWhiteSpace(o)) allowedOrigins.Add(o.TrimEnd('/'));
    }
}
static bool IsOriginAllowed(string? origin, IEnumerable<string> explicitOrigins)
{
    if (string.IsNullOrWhiteSpace(origin)) return false;
    var trimmed = origin.TrimEnd('/');
    if (explicitOrigins.Contains(trimmed, StringComparer.OrdinalIgnoreCase)) return true;
    if (Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
    {
        return uri.Port == 3000 &&
               (string.Equals(uri.Host, "localhost", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(uri.Host, "127.0.0.1", StringComparison.OrdinalIgnoreCase));
    }
    return false;
}
builder.Services.AddCors(options =>
{
    void ConfigureCors(Microsoft.AspNetCore.Cors.Infrastructure.CorsPolicyBuilder policy)
    {
        policy.WithOrigins(allowedOrigins.ToArray())
              .SetIsOriginAllowed(origin => IsOriginAllowed(origin, allowedOrigins))
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    }
    options.AddPolicy("web", ConfigureCors);
    options.AddDefaultPolicy(ConfigureCors);
});
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(options =>
{
    options.Cookie.Name = "paisamatters.session";
    options.Cookie.HttpOnly = true; options.Cookie.SameSite = SameSiteMode.Lax; options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest; options.Cookie.Path = "/";
    options.ExpireTimeSpan = TimeSpan.FromHours(12); options.SlidingExpiration = true;
    options.Events.OnRedirectToLogin = context => { context.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; };
    options.Events.OnRedirectToAccessDenied = context => { context.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; };
    options.Events.OnValidatePrincipal = async context =>
    {
        var idValue = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier); var sessionValue = context.Principal?.FindFirstValue(ClaimTypes.Sid);
        var sessions = context.HttpContext.RequestServices.GetRequiredService<SessionRegistry>();
        if (!Guid.TryParse(idValue, out var id) || !Guid.TryParse(sessionValue, out var sessionId) || !sessions.IsValid(sessionId)) { context.RejectPrincipal(); return; }
        var auth = context.HttpContext.RequestServices.GetRequiredService<IAuthService>();
        var profile = await auth.GetProfileAsync(id, context.HttpContext.RequestAborted);
        if (profile is null) { context.RejectPrincipal(); return; }
        var identity = (ClaimsIdentity)context.Principal!.Identity!;
        foreach (var claim in identity.FindAll(ClaimTypes.Role).ToArray()) identity.RemoveClaim(claim);
        foreach (var role in profile.Roles) identity.AddClaim(new Claim(ClaimTypes.Role, role));
        foreach (var claim in identity.FindAll(ClaimTypes.Name).ToArray()) identity.RemoveClaim(claim);
        identity.AddClaim(new Claim(ClaimTypes.Name, profile.FullName)); context.ShouldRenew = true;
    };
});
builder.Services.AddAuthorization();
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("Database connection is not configured.");
builder.Services.AddScoped<IAuthDataService>(_ => new AuthDataService(connectionString));
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITripDataService>(_ => new TripDataService(connectionString));
builder.Services.AddScoped<ITripService>(services => new TripService(services.GetRequiredService<ITripDataService>(), services.GetRequiredService<IAuthService>(), builder.Configuration["Application:BaseUrl"] ?? "http://localhost:3000"));
builder.Services.AddScoped<IPasswordHasher<AuthUser>, PasswordHasher<AuthUser>>();
builder.Services.AddSingleton<SessionRegistry>();

var app = builder.Build();
if (app.Environment.IsDevelopment()) app.MapOpenApi();
app.UseExceptionHandler(error => error.Run(async context =>
{
    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    await Results.Problem("The request could not be completed. Please try again.").ExecuteAsync(context);
}));
app.UseCors("web");
app.Use(async (context, next) =>
{
    if (HttpMethods.IsPost(context.Request.Method) && context.Request.Path.StartsWithSegments("/api"))
    {
        var origin = context.Request.Headers.Origin.ToString();
        if (!string.IsNullOrEmpty(origin) && !IsOriginAllowed(origin, allowedOrigins))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }
    }
    await next();
});
app.UseAuthentication(); app.UseAuthorization();
app.MapControllers();
app.MapGet("/api/admin/verify-access", () => Results.Ok(new { authorized = true })).RequireAuthorization(policy => policy.RequireRole("Admin"));
app.Run();
