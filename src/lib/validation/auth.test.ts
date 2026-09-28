import {
  changePasswordSchema,
  emailSchema,
  passwordSchema,
  safeRedirectPath,
  signInSchema,
  signUpSchema,
} from "./auth";

describe("emailSchema", () => {
  it("normalises case and whitespace", () => {
    expect(emailSchema.parse("  Ada@Example.COM ")).toBe("ada@example.com");
  });
  it("rejects invalid addresses", () => {
    expect(emailSchema.safeParse("ada@").success).toBe(false);
    expect(emailSchema.safeParse("").success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("accepts a reasonable passphrase", () => {
    expect(passwordSchema.safeParse("correct horse battery").success).toBe(true);
  });
  it.each([
    ["too short", "short1"],
    ["too long", "x".repeat(129) + "abcd"],
    ["common", "Password123"],
    ["repetitive", "abababababab"],
  ])("rejects %s passwords", (_label, pw) => {
    expect(passwordSchema.safeParse(pw).success).toBe(false);
  });
});

describe("signUpSchema", () => {
  const base = { name: "Ada", email: "ada.lovelace@example.com", password: "analytical engine!" };

  it("accepts valid input and trims the name", () => {
    const out = signUpSchema.parse({ ...base, name: "  Ada  " });
    expect(out.name).toBe("Ada");
  });

  it("rejects passwords containing the email local part", () => {
    const r = signUpSchema.safeParse({ ...base, password: "ada.lovelace-2026!" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["password"]);
  });

  it("requires a name", () => {
    expect(signUpSchema.safeParse({ ...base, name: "   " }).success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("does not enforce strength rules at sign-in", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
});

describe("changePasswordSchema", () => {
  it("rejects reusing the current password", () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: "a long passphrase",
      newPassword: "a long passphrase",
    });
    expect(r.success).toBe(false);
  });
});

describe("safeRedirectPath", () => {
  it.each([
    ["/practice", "/practice"],
    ["/history?page=2", "/history?page=2"],
    ["https://evil.com", "/dashboard"],
    ["//evil.com", "/dashboard"],
    ["/\\evil.com", "/dashboard"],
    ["javascript:alert(1)", "/dashboard"],
    [undefined, "/dashboard"],
    ["/ok\r\nSet-Cookie: x", "/dashboard"],
  ])("%s -> %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });
});
