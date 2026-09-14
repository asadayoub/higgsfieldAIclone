const sensitiveKey =
  /(authorization|api[-_]?key|secret|token|credential|password)/i;

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sensitiveKey.test(key) ? "[REDACTED]" : redact(entry),
      ]),
    );
  }
  return value;
}

export function safeLog(
  event: string,
  context: Record<string, unknown> = {},
): void {
  console.info(
    JSON.stringify({
      event,
      context: redact(context),
      at: new Date().toISOString(),
    }),
  );
}
