using Xunit;

// xUnit runs distinct test classes in parallel by default. Each WebApplicationFactory
// builds its own NpgsqlDataSource and registers Postgres-native enum mappings — running
// those builds concurrently causes Npgsql's type-loader to race and fail with cryptic DI
// exceptions in unrelated tests. Serialise at the assembly level: integration suites are
// I/O-bound anyway, so the gain from parallel runs is negligible.
[assembly: CollectionBehavior(DisableTestParallelization = true)]
