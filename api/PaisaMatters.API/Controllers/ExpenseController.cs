using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using PaisaMatters.DomainModel;
using PaisaMatters.ServiceInterface;

namespace PaisaMatters.API.Controllers;

[ApiController, Authorize, Route("api/trips/{tripId:guid}")]
public sealed class ExpenseController(IExpenseService expenses, ILogger<ExpenseController> logger) : ControllerBase
{
    [HttpGet("expenses")]
    public Task<IActionResult> Expenses(Guid tripId) => Run(async user => Ok(await expenses.GetExpensesAsync(tripId, user, HttpContext.RequestAborted)), "Expense listing failed for {TripId}", tripId);

    [HttpGet("expenses/{expenseId:guid}")]
    public Task<IActionResult> Expense(Guid tripId, Guid expenseId) => Run(async user => { var result = await expenses.GetExpenseAsync(tripId, expenseId, user, HttpContext.RequestAborted); return result is null ? NotFound() : Ok(result); }, "Expense read failed for {TripId}", tripId);

    [HttpPost("expenses")]
    public Task<IActionResult> CreateExpense(Guid tripId, SaveTripExpenseRequest request) => Run(async user => { var result = await expenses.SaveExpenseAsync(tripId, null, request, user, HttpContext.RequestAborted); return CreatedAtAction(nameof(Expense), new { tripId, expenseId = result.ExpenseId }, result); }, "Expense creation failed for {TripId}", tripId);

    [HttpPut("expenses/{expenseId:guid}")]
    public Task<IActionResult> UpdateExpense(Guid tripId, Guid expenseId, SaveTripExpenseRequest request) => Run(async user => Ok(await expenses.SaveExpenseAsync(tripId, expenseId, request, user, HttpContext.RequestAborted)), "Expense update failed for {TripId}", tripId);

    [HttpDelete("expenses/{expenseId:guid}")]
    public Task<IActionResult> DeleteExpense(Guid tripId, Guid expenseId) => Run(async user => Ok(await expenses.DeleteExpenseAsync(tripId, expenseId, user, HttpContext.RequestAborted)), "Expense deletion failed for {TripId}", tripId);

    [HttpGet("balances")]
    public Task<IActionResult> Balances(Guid tripId) => Run(async user => Ok(await expenses.GetBalancesAsync(tripId, user, HttpContext.RequestAborted)), "Balance read failed for {TripId}", tripId);

    [HttpGet("settlement-suggestions")]
    public Task<IActionResult> Suggestions(Guid tripId) => Run(async user => Ok(await expenses.GetSuggestionsAsync(tripId, user, HttpContext.RequestAborted)), "Settlement suggestion read failed for {TripId}", tripId);

    [HttpGet("settlements")]
    public Task<IActionResult> Settlements(Guid tripId) => Run(async user => Ok(await expenses.GetSettlementsAsync(tripId, user, HttpContext.RequestAborted)), "Settlement listing failed for {TripId}", tripId);

    [HttpGet("settlements/dashboard")]
    public Task<IActionResult> SettlementDashboard(Guid tripId) => Run(async user => Ok(await expenses.GetMySettlementsAsync(tripId, user, HttpContext.RequestAborted)), "Settlement dashboard failed for {TripId}", tripId);

    [HttpGet("settlements/payment-qr-details")]
    public Task<IActionResult> PaymentQrDetails(Guid tripId, [FromQuery] Guid recipientId) => Run(async user => Ok(await expenses.GetPaymentQrDetailsAsync(tripId, recipientId, user, HttpContext.RequestAborted)), "Settlement payment details failed for {TripId}", tripId);

    [HttpGet("settlements/history")]
    public Task<IActionResult> SettlementHistory(Guid tripId, [FromQuery] string? status) => Run(async user => Ok(await expenses.GetSettlementHistoryAsync(tripId, user, status, HttpContext.RequestAborted)), "Settlement history failed for {TripId}", tripId);

    [HttpPost("settlements")]
    public Task<IActionResult> CreateSettlement(Guid tripId, CreateTripSettlementRequest request) => Run(async user => StatusCode(StatusCodes.Status201Created, await expenses.CreateSettlementAsync(tripId, request, user, HttpContext.RequestAborted)), "Settlement creation failed for {TripId}", tripId);

    [HttpPut("settlements/{settlementId:guid}")]
    public Task<IActionResult> UpdateSettlement(Guid tripId, Guid settlementId, UpdateTripSettlementRequest request) => Run(async user => Ok(await expenses.UpdateSettlementAsync(tripId, settlementId, request, user, HttpContext.RequestAborted)), "Settlement update failed for {TripId}", tripId);

    [HttpPatch("settlements/{settlementId:guid}/status")]
    public Task<IActionResult> UpdateSettlement(Guid tripId, Guid settlementId, UpdateTripSettlementStatusRequest request) => Run(async user => Ok(await expenses.UpdateSettlementStatusAsync(tripId, settlementId, request.Status ?? "", user, HttpContext.RequestAborted)), "Settlement status update failed for {TripId}", tripId);

    private async Task<IActionResult> Run(Func<Guid, Task<IActionResult>> action, string logMessage, Guid tripId)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try { return await action(userId); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = string.IsNullOrWhiteSpace(ex.Message) ? "The pending repayment could not be found." : ex.Message }); }
        catch (SqlException ex) when (ex.Number is >= 50001 and <= 50007 or 50013 or 50030 or 50031 or 50040) { return BadRequest(new { message = "The expense or repayment details are invalid." }); }
        catch (SqlException ex) when (ex.Number is 51003 or 50008 or 50009 or 50010 or 50011 or 50012 or 50020 or 50032 or 50033 or 50034 or 50041) { return NotFound(new { message = "The trip, expense, or settlement could not be found or accessed." }); }
        catch (SqlException ex) { logger.LogError(ex, logMessage, tripId); return Problem("The request could not be completed. Please try again.", statusCode: 503); }
        catch (InvalidOperationException ex) { logger.LogError(ex, logMessage, tripId); return Problem("The request could not be completed. Please try again.", statusCode: 503); }
    }
}
