import {
  authenticate,
  createPasswordResetLink,
  findUserForResetToken,
  resetPasswordWithToken,
} from "@/lib/auth/service";
import { createSession, validateSessionToken } from "@/lib/auth/session";

import { createTestUser, TEST_PASSWORD, uniqueEmail } from "../support/factories";

const NEW_PASSWORD = "a brand new speaking phrase";

function tokenFrom(url: string) {
  return new URL(url).searchParams.get("token")!;
}

describe("password reset", () => {
  it("gives no link for unknown emails", async () => {
    expect(await createPasswordResetLink(uniqueEmail("nobody"), "https://app.test")).toBeNull();
  });

  it("resets the password once and signs out every device", async () => {
    const user = await createTestUser();
    const { token: sessionToken } = await createSession(user.id);
    const link = await createPasswordResetLink(user.email, "https://app.test/");
    expect(link?.url).toMatch(/^https:\/\/app\.test\/reset-password\?token=/);
    const token = tokenFrom(link!.url);

    expect(await findUserForResetToken(token)).toMatchObject({ id: user.id });
    await resetPasswordWithToken(token, NEW_PASSWORD);

    expect(await authenticate(user.email, NEW_PASSWORD)).toBe(user.id);
    expect(await authenticate(user.email, TEST_PASSWORD)).toBeNull();
    expect(await validateSessionToken(sessionToken)).toBeNull();

    // The same link can't be used again.
    expect(await findUserForResetToken(token)).toBeNull();
    await expect(resetPasswordWithToken(token, "yet another long phrase")).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("rejects made-up tokens", async () => {
    await expect(resetPasswordWithToken("not.a-token", NEW_PASSWORD)).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });
});
