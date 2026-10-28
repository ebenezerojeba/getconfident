import { siteConfig } from "@/config/site";

import type { EmailMessage } from "./client";

/** Minimal HTML escaping: user-provided values are never interpolated raw. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SETTINGS_FOOTER = `You're receiving this because of your notification settings.
      <a href="${siteConfig.url}/settings" style="color:#4f46e5">Change them here</a>.`;

function layout(
  heading: string,
  bodyHtml: string,
  cta?: { label: string; href: string },
  footerHtml: string = SETTINGS_FOOTER,
) {
  return `<!doctype html>
<html lang="en"><body style="margin:0;background:#f5f5fb;font-family:ui-sans-serif,system-ui,sans-serif;color:#1b1b2b">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <p style="font-weight:700;font-size:18px;margin:0 0 24px">${siteConfig.name}</p>
    <div style="background:#fff;border-radius:16px;padding:28px">
      <h1 style="margin:0 0 12px;font-size:22px">${heading}</h1>
      ${bodyHtml}
      ${
        cta
          ? `<p style="margin:24px 0 0"><a href="${cta.href}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;display:inline-block">${cta.label}</a></p>`
          : ""
      }
    </div>
    <p style="color:#6b6b83;font-size:12px;margin:24px 0 0">
      ${footerHtml}
    </p>
  </div>
</body></html>`;
}

export function practiceReminderEmail(params: {
  to: string;
  name: string;
  streak: number;
}): EmailMessage {
  const name = escapeHtml(params.name.split(" ")[0] ?? "there");
  const streakLine =
    params.streak > 0
      ? `You're on a ${params.streak}-day streak. One session keeps it alive.`
      : "A two-minute session is all it takes to get back in the habit.";
  return {
    to: params.to,
    subject:
      params.streak > 0
        ? `Keep your ${params.streak}-day streak going`
        : "Ready for today's practice?",
    html: layout(
      `Hi ${name}, time to practice`,
      `<p style="margin:0;line-height:1.6">${escapeHtml(streakLine)}</p>`,
      {
        label: "Start practicing",
        href: `${siteConfig.url}/practice`,
      },
    ),
    text: `Hi ${params.name.split(" ")[0]}, time to practice.\n${streakLine}\n${siteConfig.url}/practice`,
  };
}

export function achievementEmail(params: {
  to: string;
  name: string;
  achievement: { name: string; description: string };
}): EmailMessage {
  return {
    to: params.to,
    subject: `Achievement unlocked: ${params.achievement.name}`,
    html: layout(
      `🏆 ${escapeHtml(params.achievement.name)}`,
      `<p style="margin:0;line-height:1.6">${escapeHtml(params.achievement.description)}</p>`,
      { label: "See your achievements", href: `${siteConfig.url}/achievements` },
    ),
    text: `Achievement unlocked: ${params.achievement.name}\n${params.achievement.description}\n${siteConfig.url}/achievements`,
  };
}

export function weeklySummaryEmail(params: {
  to: string;
  name: string;
  sessions: number;
  averageScore: number | null;
  fillerPerMinute: number | null;
  streak: number;
}): EmailMessage {
  const rows: [string, string][] = [
    ["Sessions this week", String(params.sessions)],
    ["Average score", params.averageScore !== null ? String(params.averageScore) : "—"],
    ["Filler words / min", params.fillerPerMinute !== null ? String(params.fillerPerMinute) : "—"],
    ["Current streak", `${params.streak} days`],
  ];
  const table = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 0;color:#6b6b83">${label}</td><td style="padding:8px 0;text-align:right;font-weight:600">${value}</td></tr>`,
    )
    .join("");
  return {
    to: params.to,
    subject: `Your speaking week: ${params.sessions} ${params.sessions === 1 ? "session" : "sessions"}`,
    html: layout(
      "Your week in speaking",
      `<table style="width:100%;border-collapse:collapse;font-size:15px">${table}</table>`,
      { label: "View your progress", href: `${siteConfig.url}/progress` },
    ),
    text: `Your week in speaking\n${rows.map(([l, v]) => `${l}: ${v}`).join("\n")}\n${siteConfig.url}/progress`,
  };
}

export function passwordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
}): EmailMessage {
  const name = escapeHtml(params.name.split(" ")[0] || "there");
  return {
    to: params.to,
    subject: `Reset your ${siteConfig.name} password`,
    html: layout(
      `Hi ${name}, reset your password`,
      `<p style="margin:0;line-height:1.6">We got a request to reset your password. The link below works once and expires in 1 hour.</p>`,
      { label: "Choose a new password", href: escapeHtml(params.resetUrl) },
      "If you didn't ask for this, you can ignore this email. Your password won't change.",
    ),
    text: [
      `Hi ${params.name.split(" ")[0] || "there"},`,
      "",
      "We got a request to reset your password. This link works once and expires in 1 hour:",
      params.resetUrl,
      "",
      "If you didn't ask for this, you can ignore this email. Your password won't change.",
    ].join("\n"),
  };
}
