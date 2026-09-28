import "server-only";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ id: string }>;
}

/**
 * Resend via its REST API (no SDK dependency, same approach as the AI client).
 */
export const resendProvider: EmailProvider = {
  name: "resend",
  async send(message) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      throw new AppError("EXTERNAL_SERVICE", "Email is not configured.", {
        cause: new Error("RESEND_API_KEY / RESEND_FROM_EMAIL missing"),
      });
    }
    let res: Response;
    try {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (cause) {
      throw new AppError("EXTERNAL_SERVICE", "Couldn't send the email.", { cause });
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AppError("EXTERNAL_SERVICE", "Couldn't send the email.", {
        cause: new Error(`Resend ${res.status}: ${body.slice(0, 300)}`),
      });
    }
    const json = (await res.json()) as { id?: string };
    return { id: json.id ?? "unknown" };
  },
};

/** DEV/TEST provider: logs instead of sending, so flows work without credentials. */
export const logEmailProvider: EmailProvider = {
  name: "log",
  async send(message) {
    logger.info("email.logged", { to: message.to, subject: message.subject });
    return { id: `logged-${Date.now()}` };
  },
};

export function getEmailProvider(): EmailProvider {
  return process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL
    ? resendProvider
    : logEmailProvider;
}

export const isEmailConfigured = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
