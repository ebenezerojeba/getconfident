import "server-only";

import { hash, verify } from "@node-rs/argon2";

// Argon2id with OWASP-recommended parameters (19 MiB, t=2, p=1).
// Algorithm 2 = Argon2id (const enums from the package can't be used with isolatedModules).
const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password.normalize("NFKC"), ARGON2_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password.normalize("NFKC"));
  } catch {
    // Malformed hash: treat as a failed verification, never throw to callers.
    return false;
  }
}

// Precomputed hash used to spend equivalent time when an email is unknown,
// so response timing does not reveal whether an account exists.
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword("timing-equaliser-not-a-real-password");
  await verifyPassword(await dummyHash, password);
}
