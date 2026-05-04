using TD.OmsService.Domain.Common;

namespace TD.OmsService.Domain.Entities;

public class User : Entity
{
    public string Email { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? Phone { get; set; }
    public UserRole Role { get; set; }
    public List<string> Skills { get; set; } = new();
    public bool Active { get; set; } = true;
}
