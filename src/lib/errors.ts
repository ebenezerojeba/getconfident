/**
 * Application error model. `message` is always safe to show to users;
 * anything sensitive belongs in `cause`, which is only logged server-side.
 */
export type AppErrorCode =
  | "VALIDATION"
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "NOT_FOUND"
  | "RATE_LIMIT"
  | "CONFLICT"
  | "UPLOAD"
  | "TRANSCRIPTION"
  | "AI_ANALYSIS"
  | "DATABASE"
  | "EXTERNAL_SERVICE";

const STATUS: Record<AppErrorCode, number> = {
  VALIDATION: 400,
  AUTHENTICATION: 401,
  AUTHORIZATION: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMIT: 429,
  UPLOAD: 400,
  TRANSCRIPTION: 502,
  AI_ANALYSIS: 502,
  DATABASE: 500,
  EXTERNAL_SERVICE: 502,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly retryAfterSec?: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: AppErrorCode,
    message: string,
    options: {
      cause?: unknown;
      retryAfterSec?: number;
      fieldErrors?: Record<string, string[]>;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.retryAfterSec = options.retryAfterSec;
    this.fieldErrors = options.fieldErrors;
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;

export const notFound = (what = "Resource") => new AppError("NOT_FOUND", `${what} not found.`);
export const unauthorized = () => new AppError("AUTHENTICATION", "Please sign in to continue.");
export const forbidden = () =>
  new AppError("AUTHORIZATION", "You don't have access to this resource.");
export const rateLimited = (retryAfterSec: number) =>
  new AppError("RATE_LIMIT", "Too many attempts. Please wait a moment and try again.", {
    retryAfterSec,
  });
