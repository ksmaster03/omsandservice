using Microsoft.EntityFrameworkCore;

namespace TD.OmsService.Infrastructure.Persistence;

/// <summary>
/// Application DbContext. Phase 0 ships only the skeleton — entity DbSets are
/// added by `dotnet ef dbcontext scaffold` against the existing PostgreSQL
/// schema (60 models). Run from this project root:
///
///     dotnet ef dbcontext scaffold "$DATABASE_URL_NPGSQL" Npgsql.EntityFrameworkCore.PostgreSQL \
///         -o Persistence/Entities -c AppDbContext --context-dir Persistence \
///         --use-database-names --no-onconfiguring --force
///
/// Then convert the generated context to inherit from this base if desired.
/// </summary>
public partial class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Apply IEntityTypeConfiguration<T> instances from this assembly.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
