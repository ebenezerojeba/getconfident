import { z } from "zod";

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

// Small blocklist of the most common passwords that satisfy the length rule.
const COMMON_PASSWORDS = new Set([
  "1234567890",
  "12345678910",
  "password12",
  "password123",
  "password1234",
  "qwertyuiop",
  "1q2w3e4r5t",
  "iloveyou12",
  "abcdefghij",
  "letmein123",
  "welcome123",
  "passw0rd123",
  "administrator",
  "qwerty1234",
  "0987654321",
  "1111111111",
  "aaaaaaaaaa",
]);

export const emailSchema = z
  .string({ error: "Enter your email address." })
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(254, "Email is too long.")
  .pipe(z.email({ error: "Enter a valid email address." }));

export const passwordSchema = z
  .string({ error: "Enter a password." })
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters.`)
  .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), {
    error: "This password is too common. Choose something harder to guess.",
  })
  .refine((p) => new Set(p).size >= 4, {
    error: "Use a less repetitive password.",
  });

export const nameSchema = z
  .string({ error: "Enter your name." })
  .trim()
  .min(1, "Enter your name.")
  .max(80, "Name must be 80 characters or fewer.");

export const signUpSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
  })
  .refine(
    ({ email, password }) => {
      const local = email.split("@")[0];
      return local.length < 4 || !password.toLowerCase().includes(local);
    },
    { path: ["password"], error: "Your password shouldn't contain your email address." },
  );

export const signInSchema = z.object({
  email: emailSchema,
  // Don't apply strength rules at sign-in; only guard against abuse.
  password: z.string().min(1, "Enter your password.").max(PASSWORD_MAX, "Password is too long."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(PASSWORD_MAX),
    newPassword: passwordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ["newPassword"],
    error: "Choose a password different from your current one.",
  });

/** Only allow same-origin relative redirects after sign-in (prevents open redirects). */
export function safeRedirectPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(value)) return fallback;
  return value;
}

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
