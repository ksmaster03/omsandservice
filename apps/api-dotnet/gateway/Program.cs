using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

var app = builder.Build();
app.UseSerilogRequestLogging();
app.MapReverseProxy();
app.MapGet("/__gateway/health", () => Results.Ok(new { ok = true, role = "gateway" }));

await app.RunAsync();
