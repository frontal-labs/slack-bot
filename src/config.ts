/**
 * Project-wide constants that do not vary per environment.
 *
 * Anything that depends on the environment (tokens, model, port, base URL)
 * belongs in `env.ts` instead. Values here are compile-time constants and
 * are safe to import from any module.
 */

/** Identity of the project. Keep `version` in sync with `package.json`. */
export const PROJECT = {
  name: "slack-bot",
  version: "0.1.0",
  description:
    "Simple agent mock demo using ai-sdk and @openchannelprotocol/sdk for Slack",
} as const;

/** HTTP surface exposed by the Node server. */
export const SERVER = {
  routes: {
    health: "/health",
    slackEvents: "/slack/events",
  },
} as const;

/** Slack integration constants. */
export const SLACK = {
  apiBaseUrl: "https://slack.com/api",
  apiMethods: {
    postMessage: "chat.postMessage",
  },
  /** Headers Slack sends on every Events API request. */
  signatureHeaders: {
    signature: "x-slack-signature",
    timestamp: "x-slack-request-timestamp",
  },
  /** Relative path to the Slack app manifest used to create the app. */
  manifestPath: "slack/manifest.json",
} as const;

/** Defaults for the agent definition. */
export const AGENT = {
  id: "agent:mock-slack-assistant",
  name: "Mock Slack Assistant",
  description:
    "A small, typesafe demo agent that echoes text and posts to Slack.",
  maxRetries: 2,
} as const;

/** Defaults for the Anthropic model client. Overridable via `env.ts`. */
export const MODEL = {
  defaultBaseUrl: "https://api.anthropic.com",
  defaultName: "claude-haiku-5-5",
} as const;

/** Server port used when `PORT` is not set. Overridable via `env.ts`. */
export const DEFAULT_PORT = 3333;
