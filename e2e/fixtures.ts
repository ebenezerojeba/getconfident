import { test as base } from "@playwright/test";

/**
 * Each test gets its own simulated client IP so per-IP auth rate limits
 * (which are real and enforced) don't leak between independent tests.
 */
export const test = base.extend<{ clientIp: string }>({
  clientIp: [
    async ({ context }, use) => {
      const ip = `10.${rand()}.${rand()}.${rand()}`;
      await context.setExtraHTTPHeaders({ "x-real-ip": ip });
      await use(ip);
    },
    { auto: true },
  ],
});

/** Headers for an extra browser context so it gets its own rate-limit bucket. */
export function freshClientHeaders(): Record<string, string> {
  return { "x-real-ip": `10.${rand()}.${rand()}.${rand()}` };
}

function rand() {
  return Math.floor(Math.random() * 254) + 1;
}

export { expect } from "@playwright/test";
