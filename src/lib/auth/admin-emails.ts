/**
 * Parses ADMIN_EMAILS ("a@x.com, b@y.com") into a normalised set.
 * Kept free of server-only imports so it can be unit tested.
 */
export function parseAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(/[,\s;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@")),
  );
}

export function isAdminEmail(email: string, raw = process.env.ADMIN_EMAILS): boolean {
  return parseAdminEmails(raw).has(email.trim().toLowerCase());
}
