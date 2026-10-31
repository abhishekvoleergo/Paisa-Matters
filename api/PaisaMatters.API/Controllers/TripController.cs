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

    [HttpGet("join-requests/mine")]
    public async Task<IActionResult> MyJoinRequests()
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try { return Ok(await trips.GetMyJoinRequestsAsync(userId, HttpContext.RequestAborted)); }
        catch (SqlException ex) { logger.LogError(ex, "Join request status could not be loaded"); return Problem("Join request status is temporarily unavailable.", statusCode: 503); }
    }

    [HttpGet("join-requests/owner")]
    public async Task<IActionResult> OwnerJoinRequests([FromQuery] bool includeCleared = false)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try { return Ok(await trips.GetOwnerJoinRequestsAsync(userId, includeCleared, HttpContext.RequestAborted)); }
        catch (SqlException ex) { logger.LogError(ex, "Owner join request inbox could not be loaded"); return Problem("Join request notifications are temporarily unavailable.", statusCode: 503); }
    }

    [HttpPost("join-requests/{requestId:guid}/approve")]
    public async Task<IActionResult> ApproveJoinRequest(Guid requestId)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try
        {
            var result = await trips.ApproveJoinRequestAsync(requestId, userId, HttpContext.RequestAborted);
            return result.Status == "Expired" ? Conflict(result) : Ok(result);
        }
        catch (SqlException ex) when (ex.Number is 51100 or 51101) { return NotFound(); }
        catch (SqlException ex) when (ex.Number == 51102) { return Conflict(new { message = "This request is no longer pending." }); }
        catch (SqlException ex) { logger.LogError(ex, "Join request approval failed for {RequestId}", requestId); return Problem("The request could not be approved. Please try again.", statusCode: 503); }
    }

    [HttpPost("join-requests/{requestId:guid}/reject")]
    public async Task<IActionResult> RejectJoinRequest(Guid requestId)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try { return Ok(await trips.RejectJoinRequestAsync(requestId, userId, HttpContext.RequestAborted)); }
        catch (SqlException ex) when (ex.Number is 51100 or 51101) { return NotFound(); }
        catch (SqlException ex) when (ex.Number == 51102) { return Conflict(new { message = "This request is no longer pending." }); }
        catch (SqlException ex) { logger.LogError(ex, "Join request rejection failed for {RequestId}", requestId); return Problem("The request could not be rejected. Please try again.", statusCode: 503); }
    }

    [HttpPost("join-requests/{requestId:guid}/cancel")]
    public async Task<IActionResult> CancelJoinRequest(Guid requestId)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try { return Ok(await trips.CancelJoinRequestAsync(requestId, userId, HttpContext.RequestAborted)); }
        catch (SqlException ex) when (ex.Number is 51100 or 51101) { return NotFound(); }
        catch (SqlException ex) when (ex.Number == 51102) { return Conflict(new { message = "Only a pending request can be cancelled." }); }
        catch (SqlException ex) { logger.LogError(ex, "Join request cancellation failed for {RequestId}", requestId); return Problem("The request could not be cancelled. Please try again.", statusCode: 503); }
    }

    [HttpPost("join-requests/{requestId:guid}/clear")]
    public async Task<IActionResult> ClearJoinRequest(Guid requestId)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try { return Ok(await trips.ClearJoinRequestAsync(requestId, userId, HttpContext.RequestAborted)); }
        catch (SqlException ex) when (ex.Number is 51100 or 51101) { return NotFound(); }
        catch (SqlException ex) { logger.LogError(ex, "Join request notification could not be cleared for {RequestId}", requestId); return Problem("The notification could not be cleared. Please try again.", statusCode: 503); }
    }

    [HttpPost("join-requests/clear-all")]
    public async Task<IActionResult> ClearAllJoinRequests()
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try { return Ok(new { clearedCount = await trips.ClearAllJoinRequestsAsync(userId, HttpContext.RequestAborted) }); }
        catch (SqlException ex) { logger.LogError(ex, "Owner join request notifications could not be cleared"); return Problem("Notifications could not be cleared. Please try again.", statusCode: 503); }
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
