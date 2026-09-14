export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "NOT_FOUND"
  | "PROVIDER"
  | "INTERNAL";

export type AppError = {
  code: AppErrorCode;
  message: string;
  retryable: boolean;
  requestId?: string;
};
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };
