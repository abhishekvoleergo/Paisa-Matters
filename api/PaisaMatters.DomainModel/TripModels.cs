using System.ComponentModel.DataAnnotations;

namespace PaisaMatters.DomainModel;

public sealed class CreateTripRequest
{
    [Required, StringLength(150, MinimumLength = 1)] public string? TripName { get; init; }
    [Required, StringLength(200, MinimumLength = 1)] public string? Destination { get; init; }
    public DateOnly? StartDate { get; init; }
    public DateOnly? EndDate { get; init; }
}

public sealed record TripResponse(Guid TripId, string TripName, string Destination, Guid? CreatedBy,
    DateOnly? StartDate, DateOnly? EndDate, string CurrencyCode, DateTime? CreatedAt,
    string? MemberRole = null, string? MemberStatus = null);
