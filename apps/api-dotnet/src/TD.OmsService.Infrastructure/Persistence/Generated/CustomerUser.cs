using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class CustomerUser
{
    public string Id { get; set; } = null!;

    public string CustomerId { get; set; } = null!;

    public string? LineUserId { get; set; }

    public string? Phone { get; set; }

    public string? Email { get; set; }

    public string DisplayName { get; set; } = null!;

    public string? AvatarUrl { get; set; }

    public DateTime? LastLoginAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Customer Customer { get; set; } = null!;

    public virtual ICollection<LineMessage> LineMessages { get; set; } = new List<LineMessage>();

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
