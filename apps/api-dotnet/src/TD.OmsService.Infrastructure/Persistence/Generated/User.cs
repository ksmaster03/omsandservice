using System;
using System.Collections.Generic;

namespace TD.OmsService.Infrastructure.Persistence.Generated;

public partial class User
{
    public string Id { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string? Phone { get; set; }

    public bool Active { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public List<string>? Skills { get; set; }

    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    public virtual ICollection<Installation> Installations { get; set; } = new List<Installation>();

    public virtual ICollection<Lead> Leads { get; set; } = new List<Lead>();

    public virtual ICollection<PmSchedule> PmSchedules { get; set; } = new List<PmSchedule>();

    public virtual ICollection<Quotation> Quotations { get; set; } = new List<Quotation>();

    public virtual ICollection<Rma> Rmas { get; set; } = new List<Rma>();

    public virtual ICollection<ServiceTicket> ServiceTickets { get; set; } = new List<ServiceTicket>();

    public virtual TechLocation? TechLocation { get; set; }

    public virtual ICollection<TicketEvent> TicketEvents { get; set; } = new List<TicketEvent>();
}
