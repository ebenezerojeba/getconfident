import { isAdminEmail, parseAdminEmails } from "./admin-emails";

describe("admin email allowlist", () => {
  it("parses comma, space and semicolon separated lists, case-insensitively", () => {
    expect([...parseAdminEmails(" Founder@GetConfident.com.ng, ops@x.com;b@y.com ")]).toEqual([
      "founder@getconfident.com.ng",
      "ops@x.com",
      "b@y.com",
    ]);
  });

  it("ignores empty and malformed entries", () => {
    expect(parseAdminEmails(undefined).size).toBe(0);
    expect(parseAdminEmails(" , not-an-email ,, ").size).toBe(0);
  });

  it("only matches listed emails", () => {
    const list = "founder@getconfident.com.ng";
    expect(isAdminEmail("FOUNDER@getconfident.com.ng ", list)).toBe(true);
    expect(isAdminEmail("someone@getconfident.com.ng", list)).toBe(false);
    expect(isAdminEmail("founder@getconfident.com.ng", "")).toBe(false);
  });
});
