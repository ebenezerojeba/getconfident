import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

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

/** SMTP settings from the environment, or null when email isn't set up. */
export function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM;
  if (!host || !user || !pass || !from) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    host,
    port,
    // Port 465 uses TLS from the start; 587 upgrades with STARTTLS.
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: { user, pass },
    from,
  };
}

let transporter: Transporter | null = null;

function getTransporter(config: NonNullable<ReturnType<typeof smtpConfig>>): Transporter {
  transporter ??= nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    // Fail fast in serverless functions instead of hanging on a bad server.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

/** Sends through any SMTP server (Gmail, Zoho, Brevo, Mailgun, SES, ...) via Nodemailer. */
export const smtpProvider: EmailProvider = {
  name: "smtp",
  async send(message) {
    const config = smtpConfig();
    if (!config) {
      throw new AppError("EXTERNAL_SERVICE", "Email is not configured.", {
        cause: new Error("SMTP_HOST / SMTP_USER / SMTP_PASSWORD / EMAIL_FROM missing"),
      });
    }
    try {
      const info = await getTransporter(config).sendMail({
        from: config.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      return { id: info.messageId ?? "unknown" };
    } catch (cause) {
      throw new AppError("EXTERNAL_SERVICE", "Couldn't send the email.", { cause });
    }
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
  return smtpConfig() ? smtpProvider : logEmailProvider;
}

export const isEmailConfigured = () => smtpConfig() !== null;

/** Test hook: forget the cached SMTP connection. */
export function resetEmailTransport() {
  transporter = null;
}
