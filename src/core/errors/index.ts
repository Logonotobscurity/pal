/**
 * Structured error contract (PAL_ARCHITECTURE.md §65).
 * Route handlers and server actions surface these as JSON responses.
 */
export type PalErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "ENV_NOT_CONFIGURED"
  | "INTERNAL";

export type PalError = {
  code: PalErrorCode;
  message: string;
  retryable: boolean;
  traceId: string;
  details?: unknown;
};

export function palError(
  code: PalErrorCode,
  message: string,
  traceId: string,
  options?: { retryable?: boolean; details?: unknown },
): PalError {
  return {
    code,
    message,
    retryable: options?.retryable ?? false,
    traceId,
    details: options?.details,
  };
}

/** HTTP status for a PalError code (§65 examples mapped to responses). */
export function statusForCode(code: PalErrorCode): number {
  switch (code) {
    case "AUTH_REQUIRED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "INVALID_INPUT":
      return 400;
    case "NOT_FOUND":
      return 404;
    case "ENV_NOT_CONFIGURED":
      return 503;
    case "INTERNAL":
    default:
      return 500;
  }
}
