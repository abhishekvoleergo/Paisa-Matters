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
builder.Services.AddCors(options => options.AddPolicy("web", policy => policy.WithOrigins("http://localhost:3000").AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
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
builder.Services.AddScoped<ITripService, TripService>();
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
        if (origin != "http://localhost:3000") { context.Response.StatusCode = StatusCodes.Status403Forbidden; return; }
    }
    await next();
});
app.UseAuthentication(); app.UseAuthorization();
app.MapControllers();
app.MapGet("/api/admin/verify-access", () => Results.Ok(new { authorized = true })).RequireAuthorization(policy => policy.RequireRole("Admin"));
app.Run();
