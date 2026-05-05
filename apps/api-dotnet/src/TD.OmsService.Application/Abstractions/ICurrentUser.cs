namespace TD.OmsService.Application.Abstractions;

/// <summary>
/// Resolves the current request principal — staff or customer — without
/// services having to reach into HttpContext directly. Mirrors the way the
/// Fastify auth plugin decorates `req.user` and `req.customerSession`.
/// </summary>
public interface ICurrentUser
{
    bool IsAuthenticated { get; }
    string? UserId { get; }
    string? Email { get; }
    string? Role { get; }
    string? Kind { get; }              // "staff" | "customer"
    string? CustomerId { get; }        // populated when Kind == "customer"
    bool IsInRole(string role);
}
