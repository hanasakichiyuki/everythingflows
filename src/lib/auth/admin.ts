/** Validate admin secret for publish actions (server-only). */
export function verifyAdminSecret(secret: string | undefined): boolean {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    return process.env.NODE_ENV === "development";
  }
  return secret === expected;
}
