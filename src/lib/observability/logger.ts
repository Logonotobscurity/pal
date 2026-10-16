/**
 * Structured Logger
 *
 * Minimal observability scaffolding used by services (starting with ExecutionService).
 * Emits JSON lines so logs can be ingested later by a real observability stack.
 *
 * Levels: info, warn, error.
 * Meta is merged into the log record; sensitive fields should be redacted by callers.
 */

export type LogLevel = "info" | "warn" | "error";

export type LogRecord = {
  level: LogLevel;
  message: string;
  timestamp: string;
  service?: string;
  workspaceId?: string;
  meta?: Record<string, unknown>;
};

export interface StructuredLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export type LoggerOptions = {
  service?: string;
  workspaceId?: string;
  /** Override the write target (default: console). */
  write?: (record: LogRecord) => void;
};

const defaultWrite = (record: LogRecord) => {
  const line = JSON.stringify(record);
  if (record.level === "error") console.error(line);
  else if (record.level === "warn") console.warn(line);
  else console.log(line);
};

export class ConsoleStructuredLogger implements StructuredLogger {
  private readonly service?: string;
  private readonly workspaceId?: string;
  private readonly write: (record: LogRecord) => void;

  constructor(options: LoggerOptions = {}) {
    this.service = options.service;
    this.workspaceId = options.workspaceId;
    this.write = options.write ?? defaultWrite;
  }

  private emit(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    this.write({
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      workspaceId: this.workspaceId,
      meta,
    });
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.emit("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.emit("warn", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.emit("error", message, meta);
  }
}

/** Create a logger scoped to a service (and optionally a workspace). */
export function createLogger(options: LoggerOptions = {}): StructuredLogger {
  return new ConsoleStructuredLogger(options);
}
