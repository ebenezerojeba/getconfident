import { beforeAll, describe, expect, it } from "vitest";

import {
  createResetToken,
  parseResetToken,
  RESET_TOKEN_TTL_MS,
  verifyResetToken,
} from "./password-reset";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-123456";
});

const user = { id: "user123", passwordHash: "$argon2id$hash-one" };

describe("password reset tokens", () => {
  it("accepts a fresh token for the same user and password", () => {
    const token = createResetToken(user);
    expect(parseResetToken(token)?.userId).toBe("user123");
    expect(verifyResetToken(token, user)).toBe(true);
  });

  it("stops working once the password changes (single use)", () => {
    const token = createResetToken(user);
    expect(verifyResetToken(token, { ...user, passwordHash: "$argon2id$hash-two" })).toBe(false);
  });

  it("expires after the time limit", () => {
    const now = Date.now();
    const token = createResetToken(user, now);
    expect(verifyResetToken(token, user, now + RESET_TOKEN_TTL_MS - 1)).toBe(true);
    expect(verifyResetToken(token, user, now + RESET_TOKEN_TTL_MS + 1)).toBe(false);
  });

  it("rejects tampered, foreign and malformed tokens", () => {
    const token = createResetToken(user);
    const [, sig] = token.split(".");
    const forged = `${Buffer.from("user999.9999999999999").toString("base64url")}.${sig}`;
    expect(verifyResetToken(forged, { ...user, id: "user999" })).toBe(false);
    expect(verifyResetToken(token, { ...user, id: "someone" })).toBe(false);
    expect(verifyResetToken(`${token}x`, user)).toBe(false);
    expect(parseResetToken("garbage")).toBeNull();
    expect(parseResetToken("a.b.c")).toBeNull();
  });
});
