import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  authenticate,
  changePassword,
  DUPLICATE_EMAIL_MESSAGE,
  registerUser,
} from "@/lib/auth/service";
import {
  createSession,
  deleteExpiredSessions,
  invalidateSessionToken,
  invalidateUserSessions,
  validateSessionToken,
} from "@/lib/auth/session";
import { hashSessionToken } from "@/lib/auth/tokens";
import { db } from "@/lib/db/client";
import { AppError } from "@/lib/errors";

import { createTestUser, TEST_PASSWORD, uniqueEmail } from "../support/factories";

describe("password hashing", () => {
  it("hashes with argon2id and verifies", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain("correct horse battery");
    expect(await verifyPassword(hash, "correct horse battery")).toBe(true);
    expect(await verifyPassword(hash, "wrong horse battery")).toBe(false);
  });

  it("never throws on malformed hashes", async () => {
    expect(await verifyPassword("not-a-hash", "whatever")).toBe(false);
  });
});

describe("registration", () => {
  it("creates a user with hashed password and default preferences", async () => {
    const user = await registerUser({
      name: "Grace",
      email: uniqueEmail("grace"),
      password: "compilers are fun",
    });
    const stored = await db.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { preferences: true },
    });
    expect(stored.passwordHash).not.toBe("compilers are fun");
    expect(stored.preferences?.preferredDurationSec).toBe(120);
    expect(stored.onboardedAt).toBeNull();
  });

  it("rejects duplicate emails with a friendly conflict error", async () => {
    const dupe = uniqueEmail("dupe");
    await registerUser({ name: "A", email: dupe, password: "first passphrase" });
    await expect(
      registerUser({ name: "B", email: dupe, password: "second passphrase" }),
    ).rejects.toMatchObject({ code: "CONFLICT", message: DUPLICATE_EMAIL_MESSAGE });
  });
});

describe("authenticate", () => {
  it("returns the user id for valid credentials", async () => {
    const email = uniqueEmail("valid");
    const user = await createTestUser({ email });
    expect(await authenticate(email, TEST_PASSWORD)).toBe(user.id);
  });

  it("returns null for a wrong password or unknown email", async () => {
    const email = uniqueEmail("wrongpw");
    await createTestUser({ email });
    expect(await authenticate(email, "not the password")).toBeNull();
    expect(await authenticate(uniqueEmail("nobody"), TEST_PASSWORD)).toBeNull();
  });
});

describe("sessions", () => {
  it("stores only the HMAC of the token and validates it", async () => {
    const user = await createTestUser();
    const { token, expiresAt } = await createSession(user.id, { userAgent: "vitest" });

    expect(await db.authSession.findUnique({ where: { id: token } })).toBeNull();
    const row = await db.authSession.findUniqueOrThrow({ where: { id: hashSessionToken(token) } });
    expect(row.userId).toBe(user.id);

    const session = await validateSessionToken(token);
    expect(session?.user.id).toBe(user.id);
    expect(session?.renewed).toBe(false);
    expect(session?.expiresAt.getTime()).toBe(expiresAt.getTime());
    // Never expose the password hash through the session user.
    expect(session?.user).not.toHaveProperty("passwordHash");
  });

  it("rejects unknown, empty and oversized tokens", async () => {
    expect(await validateSessionToken("does-not-exist")).toBeNull();
    expect(await validateSessionToken("")).toBeNull();
    expect(await validateSessionToken("x".repeat(500))).toBeNull();
  });

  it("deletes expired sessions on access", async () => {
    const user = await createTestUser();
    const { token } = await createSession(user.id);
    await db.authSession.update({
      where: { id: hashSessionToken(token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await validateSessionToken(token)).toBeNull();
    expect(await db.authSession.count({ where: { id: hashSessionToken(token) } })).toBe(0);
  });

  it("extends sessions close to expiry (sliding expiration)", async () => {
    const user = await createTestUser();
    const { token } = await createSession(user.id);
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await db.authSession.update({
      where: { id: hashSessionToken(token) },
      data: { expiresAt: soon },
    });
    const session = await validateSessionToken(token);
    expect(session?.renewed).toBe(true);
    expect(session!.expiresAt.getTime()).toBeGreaterThan(soon.getTime() + 20 * 86_400_000);
  });

  it("invalidates a session on logout", async () => {
    const user = await createTestUser();
    const { token } = await createSession(user.id);
    await invalidateSessionToken(token);
    expect(await validateSessionToken(token)).toBeNull();
  });

  it("can sign out all other sessions", async () => {
    const user = await createTestUser();
    const a = await createSession(user.id);
    const b = await createSession(user.id);
    await invalidateUserSessions(user.id, hashSessionToken(a.token));
    expect(await validateSessionToken(a.token)).not.toBeNull();
    expect(await validateSessionToken(b.token)).toBeNull();
  });

  it("cleans up expired sessions in bulk", async () => {
    const user = await createTestUser();
    const { token } = await createSession(user.id);
    await db.authSession.update({
      where: { id: hashSessionToken(token) },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    expect(await deleteExpiredSessions()).toBeGreaterThanOrEqual(1);
  });

  it("removes sessions when the user is deleted (cascade)", async () => {
    const user = await createTestUser();
    const { token } = await createSession(user.id);
    await db.user.delete({ where: { id: user.id } });
    expect(await validateSessionToken(token)).toBeNull();
  });
});

describe("changePassword", () => {
  it("requires the current password", async () => {
    const user = await createTestUser();
    const { token } = await createSession(user.id);
    await expect(
      changePassword(user.id, hashSessionToken(token), "wrong current", "brand new passphrase"),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("updates the hash and signs out other sessions only", async () => {
    const email = uniqueEmail("change");
    const user = await createTestUser({ email });
    const current = await createSession(user.id);
    const other = await createSession(user.id);

    await changePassword(
      user.id,
      hashSessionToken(current.token),
      TEST_PASSWORD,
      "brand new passphrase",
    );

    expect(await authenticate(email, "brand new passphrase")).toBe(user.id);
    expect(await authenticate(email, TEST_PASSWORD)).toBeNull();
    expect(await validateSessionToken(current.token)).not.toBeNull();
    expect(await validateSessionToken(other.token)).toBeNull();
  });
});
