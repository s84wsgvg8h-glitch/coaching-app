type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function serialize(context?: LogContext) {
  if (!context || Object.keys(context).length === 0) return "";
  try {
    return JSON.stringify(context);
  } catch {
    return String(context);
  }
}

export function logApi(
  level: LogLevel,
  message: string,
  context?: LogContext,
): void {
  const line = `[api:${level}] ${message} ${serialize(context)}`.trim();
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.info(line);
}

export function withRequestLog(route: string, userId?: string | null) {
  const started = Date.now();
  return {
    success(extra?: LogContext) {
      logApi("info", route, {
        userId: userId || undefined,
        durationMs: Date.now() - started,
        ...extra,
      });
    },
    failure(error: string, extra?: LogContext) {
      logApi("error", route, {
        userId: userId || undefined,
        durationMs: Date.now() - started,
        error,
        ...extra,
      });
    },
  };
}
