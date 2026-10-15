using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using PaisaMatters.DomainModel;
using PaisaMatters.ServiceInterface;

namespace PaisaMatters.API.Controllers;

[ApiController, Authorize, Route("api/trips")]
public sealed class TripController(ITripService trips, ILogger<TripController> logger) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(CreateTripRequest request)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try { var trip = await trips.CreateAsync(request, userId, HttpContext.RequestAborted); return Created("/api/trips", trip); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (SqlException ex) { logger.LogError(ex, "Trip creation failed"); return Problem("The trip could not be created. Please try again.", statusCode: 503); }
        catch (InvalidOperationException ex) { logger.LogError(ex, "Trip creation failed"); return Problem("The trip could not be created. Please try again.", statusCode: 503); }
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try { return Ok(await trips.GetByUserAsync(userId, HttpContext.RequestAborted)); }
        catch (Exception ex) when (ex is SqlException or InvalidOperationException) { logger.LogError(ex, "Trip listing failed"); return Problem("Trips are temporarily unavailable. Please try again.", statusCode: 503); }
    }
}
