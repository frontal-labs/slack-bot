/**
 * Typed error hierarchy for the project.
 *
 * `AppError` wraps the built-in `Error` with a stable machine-readable `code`,
 * an HTTP `status` for responses, structured `details`, and the native `cause`
 * chain. Throw subclasses for expected failures and use `AppError.from` to
 * normalize anything caught from third-party code.
 */

/** Stable machine-readable error codes. Never rename once shipped. */
export const ErrorCode = {
  UNKNOWN: "UNKNOWN",
  VALIDATION: "VALIDATION_ERROR",
  CONFIG: "CONFIG_ERROR",
  SIGNATURE: "SIGNATURE_INVALID",
  SLACK: "SLACK_API_ERROR",
  TOOL: "TOOL_ERROR",
  AGENT: "AGENT_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface AppErrorOptions {
  /** Machine-readable code. Defaults to `UNKNOWN`. */
  code?: ErrorCode;
  /** HTTP status to use when the error reaches a response. Defaults to 500. */
  status?: number;
  /** The underlying error or value that caused this one. */
  cause?: unknown;
  /** Structured, JSON-serializable context for logs and responses. */
  details?: Record<string, unknown>;
  /**
   * Expected, recoverable failure (bad input, upstream rejection) rather than
   * a bug. Defaults to `true`. Set to `false` for programmer errors.
   */
  isOperational?: boolean;
}

/** JSON shape produced by `AppError#toJSON`. */
export interface SerializedAppError {
  name: string;
  code: ErrorCode;
  message: string;
  status: number;
  details: Record<string, unknown>;
  isOperational: boolean;
  timestamp: string;
  cause?: { name: string; message: string };
}

const DEFAULT_STATUS = 500;

/**
 * Base error for the whole application. Extends `Error`, so `instanceof Error`,
 * stack traces, and `cause` all behave as usual.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown>;
  readonly isOperational: boolean;
  readonly timestamp: string;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    // `new.target.name` makes subclasses report their own name without
    // redeclaring `name` in every class.
    this.name = new.target.name;
    this.code = options.code ?? ErrorCode.UNKNOWN;
    this.status = options.status ?? DEFAULT_STATUS;
    this.details = options.details ?? {};
    this.isOperational = options.isOperational ?? true;
    this.timestamp = new Date().toISOString();

    // V8-only. Omits this constructor from the stack trace when available.
    Error.captureStackTrace?.(this, new.target);
  }

  /**
   * Normalizes any thrown value into an `AppError`.
   *
   * - An `AppError` is returned unchanged.
   * - An `Error` is wrapped, keeping its message and attaching it as `cause`.
   * - A string becomes the message.
   * - Anything else is stringified into a generic message.
   *
   * `options.message` overrides the derived message.
   */
  static from(
    value: unknown,
    options: AppErrorOptions & { message?: string } = {},
  ): AppError {
    if (value instanceof AppError) {
      return value;
    }

    const { message: overrideMessage, ...rest } = options;
    let derived = "Unknown error";
    if (value instanceof Error) {
      derived = value.message;
    } else if (typeof value === "string") {
      derived = value;
    }

    return new AppError(overrideMessage ?? derived, {
      ...rest,
      cause: value,
    });
  }

  /** Type guard that narrows `unknown` to `AppError`. */
  static isAppError(value: unknown): value is AppError {
    return value instanceof AppError;
  }

  /** The deepest error in the `cause` chain, or `this` if there is none. */
  rootCause(): unknown {
    let current: unknown = this;
    const seen = new Set<unknown>();
    while (
      current instanceof Error &&
      current.cause !== undefined &&
      !seen.has(current)
    ) {
      seen.add(current);
      current = current.cause;
    }
    return current;
  }

  /** Every error in the `cause` chain, starting with `this`. */
  causeChain(): unknown[] {
    const chain: unknown[] = [];
    let current: unknown = this;
    while (current !== undefined && !chain.includes(current)) {
      chain.push(current);
      current = current instanceof Error ? current.cause : undefined;
    }
    return chain;
  }

  /**
   * Serializes the error for logs or HTTP responses. The stack is omitted on
   * purpose so it never leaks to clients by default.
   */
  toJSON(): SerializedAppError {
    const json: SerializedAppError = {
      name: this.name,
      code: this.code,
      message: this.message,
      status: this.status,
      details: this.details,
      isOperational: this.isOperational,
      timestamp: this.timestamp,
    };

    if (this.cause instanceof Error) {
      json.cause = { name: this.cause.name, message: this.cause.message };
    }

    return json;
  }
}

/** Invalid or missing configuration, detected at startup or on access. */
export class ConfigError extends AppError {
  constructor(message: string, options: Omit<AppErrorOptions, "code"> = {}) {
    super(message, { status: 500, ...options, code: ErrorCode.CONFIG });
  }
}

/** Input failed schema validation. Maps to HTTP 400. */
export class ValidationError extends AppError {
  constructor(message: string, options: Omit<AppErrorOptions, "code"> = {}) {
    super(message, { status: 400, ...options, code: ErrorCode.VALIDATION });
  }
}

/** Inbound request failed Slack signature verification. Maps to HTTP 401. */
export class SignatureError extends AppError {
  constructor(
    message = "Invalid Slack request signature",
    options: Omit<AppErrorOptions, "code"> = {},
  ) {
    super(message, { status: 401, ...options, code: ErrorCode.SIGNATURE });
  }
}

/** A Slack Web API call failed. Maps to HTTP 502. */
export class SlackApiError extends AppError {
  /** Slack's `error` string, e.g. `invalid_auth` or `channel_not_found`. */
  readonly slackError: string;

  constructor(slackError: string, options: Omit<AppErrorOptions, "code"> = {}) {
    super(`Slack API error: ${slackError}`, {
      status: 502,
      ...options,
      code: ErrorCode.SLACK,
      details: { slackError, ...options.details },
    });
    this.slackError = slackError;
  }
}

/** An agent tool threw or returned an unusable result. Maps to HTTP 500. */
export class ToolError extends AppError {
  readonly toolName: string;

  constructor(
    toolName: string,
    message: string,
    options: Omit<AppErrorOptions, "code"> = {},
  ) {
    super(`Tool "${toolName}" failed: ${message}`, {
      status: 500,
      ...options,
      code: ErrorCode.TOOL,
      details: { toolName, ...options.details },
    });
    this.toolName = toolName;
  }
}
