using System.Text;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using TD.OmsService.Api.Middleware;
using TD.OmsService.Application;
using TD.OmsService.Infrastructure;
using TD.OmsService.Infrastructure.Persistence;

// Match Prisma/Npgsql 5.x DateTime semantics: `timestamp(3) without time zone`
// columns must accept DateTime values regardless of Kind. Npgsql 6+ would
// otherwise reject DateTime.UtcNow against non-timestamptz columns.
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// ─── Serilog ─────────────────────────────────────────────────
builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/api-.log", rollingInterval: RollingInterval.Day));

// ─── Database (EF Core + Npgsql) ─────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured.");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString, npg => npg.EnableRetryOnFailure(3));
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});

// ─── Auth (JWT) ──────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.FromMinutes(2),
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Staff", p => p.RequireAuthenticatedUser().RequireClaim("kind", "staff"));
    options.AddPolicy("Customer", p => p.RequireAuthenticatedUser().RequireClaim("kind", "customer"));
    options.AddPolicy("Admin", p => p.RequireAuthenticatedUser().RequireRole("ADMIN"));
});

// ─── CORS ─────────────────────────────────────────────────────
var corsOrigins = (builder.Configuration["Cors:Origins"] ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(p => p
        .WithOrigins(corsOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

// ─── MVC + Validation ────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<ApplicationAssemblyMarker>();

// ─── SignalR (replaces socket.io for Tech PWA) ───────────────
builder.Services.AddSignalR();

// ─── HttpContext + CurrentUser accessor ──────────────────────
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<TD.OmsService.Application.Abstractions.ICurrentUser, TD.OmsService.Api.Auth.CurrentUser>();

// ─── Application & Infrastructure ────────────────────────────
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// ─── OpenAPI / Swagger ───────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(opt =>
{
    opt.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Toptier OSM API (.NET)",
        Description = "Order & Service Management API — .NET 8 port",
        Version = "3.0.0",
    });
    opt.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Bearer token",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
    });
    opt.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
            },
            Array.Empty<string>()
        },
    });
});

// ─── Health checks ───────────────────────────────────────────
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database");

var app = builder.Build();

// ─── Pipeline ────────────────────────────────────────────────
app.UseSerilogRequestLogging();
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "OSM API v3"));
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Static files for /uploads
var uploadRoot = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
Directory.CreateDirectory(uploadRoot);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadRoot),
    RequestPath = "/uploads",
});

app.MapControllers();
app.MapHealthChecks("/health");
app.MapHub<TD.OmsService.Api.Hubs.TechHub>("/hubs/tech");

app.MapGet("/", () => Results.Ok(new
{
    ok = true,
    data = new
    {
        name = "Toptier OSM API (.NET)",
        version = "3.0.0",
        docs = "/swagger",
    },
}));

await app.RunAsync();

// Make Program accessible to integration tests (WebApplicationFactory<Program>).
public partial class Program;
