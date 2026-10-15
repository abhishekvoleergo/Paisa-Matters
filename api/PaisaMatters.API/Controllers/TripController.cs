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

    [HttpGet("{tripId:guid}")]
    public async Task<IActionResult> Get(Guid tripId)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try { var trip = await trips.GetByIdAsync(tripId, userId, HttpContext.RequestAborted); return trip is null ? NotFound() : Ok(trip); }
        catch (SqlException ex) { logger.LogError(ex, "Trip read failed for {TripId}", tripId); return Problem("Trip details are temporarily unavailable.", statusCode: 503); }
    }

    [HttpPut("{tripId:guid}")]
    public async Task<IActionResult> Update(Guid tripId, CreateTripRequest request)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try { return Ok(await trips.UpdateAsync(tripId, userId, request, HttpContext.RequestAborted)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (SqlException ex) when (ex.Number == 51001) { return BadRequest(new { message = "End date cannot be before start date." }); }
        catch (SqlException ex) when (ex.Number == 51002) { logger.LogWarning(ex, "Trip update denied for {TripId}", tripId); return NotFound(); }
        catch (SqlException ex) { logger.LogError(ex, "Trip update failed for {TripId}", tripId); return Problem("The trip could not be updated. Please try again.", statusCode: 503); }
    }

    [HttpGet("{tripId:guid}/members")]
    public async Task<IActionResult> Members(Guid tripId)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try { return Ok(await trips.GetMembersAsync(tripId, userId, HttpContext.RequestAborted)); }
        catch (SqlException ex) when (ex.Number == 51003) { return NotFound(); }
        catch (SqlException ex) { logger.LogError(ex, "Trip members could not be loaded for {TripId}", tripId); return Problem("Trip members are temporarily unavailable.", statusCode: 503); }
    }

    [HttpPost("{tripId:guid}/invites")]
    public async Task<IActionResult> CreateInvite(Guid tripId, CreateTripInviteRequest request)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try { return Ok(await trips.CreateInviteAsync(tripId, userId, request, HttpContext.RequestAborted)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (SqlException ex) when (ex.Number == 50023) { logger.LogWarning(ex, "Trip invitation denied for trip {TripId}", tripId); return Forbid(); }
        catch (SqlException ex) { logger.LogError(ex, "Trip invitation failed for trip {TripId}", tripId); return Problem("The invitation could not be created. Please try again.", statusCode: 503); }
        catch (InvalidOperationException ex) { logger.LogError(ex, "Trip invitation failed for trip {TripId}", tripId); return Problem("The invitation could not be created. Please try again.", statusCode: 503); }
    }

    [HttpDelete("{tripId:guid}")]
    public async Task<IActionResult> Delete(Guid tripId)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try
        {
            var result = await trips.DeleteAsync(tripId, userId, HttpContext.RequestAborted);
            return result.IsDeleted ? Ok(result) : Conflict(new { message = result.Message });
        }
        catch (SqlException ex) when (ex.Number == 50100) { logger.LogWarning(ex, "Trip deletion denied for trip {TripId}", tripId); return NotFound(); }
        catch (SqlException ex) { logger.LogError(ex, "Trip deletion failed for trip {TripId}", tripId); return Problem("The trip could not be deleted. Please try again.", statusCode: 503); }
        catch (InvalidOperationException ex) { logger.LogError(ex, "Trip deletion failed for trip {TripId}", tripId); return Problem("The trip could not be deleted. Please try again.", statusCode: 503); }
    }

    [AllowAnonymous, HttpGet("~/api/invites/{rawToken}")]
    public async Task<IActionResult> PreviewInvite(string rawToken)
    {
        try { return Ok(await trips.PreviewInviteAsync(rawToken, HttpContext.RequestAborted)); }
        catch (SqlException ex) { logger.LogError(ex, "Invite preview failed"); return Problem("The invitation could not be checked.", statusCode: 503); }
    }

    [HttpPost("~/api/invites/{rawToken}/join")]
    public async Task<IActionResult> JoinInvite(string rawToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try { return Ok(await trips.JoinInviteAsync(rawToken, userId, HttpContext.RequestAborted)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (SqlException ex) when (ex.Number is >= 51004 and <= 51007) { return Conflict(new { message = "This invitation is invalid, expired, exhausted, or its trip is no longer available." }); }
        catch (SqlException ex) { logger.LogError(ex, "Invite join failed"); return Problem("The invitation could not be accepted.", statusCode: 503); }
    }
}
