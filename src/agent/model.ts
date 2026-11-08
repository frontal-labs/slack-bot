import { createAnthropic } from "@ai-sdk/anthropic";

import { env } from "../env.js";

/**
 * Creates an Anthropic-compatible model client.
 *
 * `baseURL` is configurable, so the same code works against the official
 * Anthropic API or any Anthropic-compatible mock server.
 */
export function createModel() {
  return createAnthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    baseURL: env.ANTHROPIC_BASE_URL,
  })(env.ANTHROPIC_MODEL);
}
