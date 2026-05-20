/**
 * Data provider abstraction — swap implementation when adding Supabase / Azure API.
 *
 * filesystem (default): MDX in content/blog — no backend
 * supabase:             PostgreSQL via Supabase (future)
 * api:                  Custom Azure Functions / REST API (future)
 */
export type DataProvider = "filesystem" | "supabase" | "api";

export function getDataProvider(): DataProvider {
  const provider = process.env.DATA_PROVIDER ?? "filesystem";
  if (provider === "supabase" || provider === "api" || provider === "filesystem") {
    return provider;
  }
  return "filesystem";
}

export function isFilesystemMode() {
  return getDataProvider() === "filesystem";
}
