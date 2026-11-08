/**
 * Single source of truth for all environment variables.
 *
 * Every module must import `env` from this module instead of reading
 * `process.env` directly. This guarantees validation, type safety, and
 * a single place to fail fast on missing secrets.
 */
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

import { DEFAULT_PORT, MODEL } from "./config.js";

export const env = createEnv({
  server: {
    SLACK_BOT_TOKEN: z.string().min(1),
    SLACK_SIGNING_SECRET: z.string().min(1),
    SLACK_BOT_USER_ID: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().min(1),
    ANTHROPIC_BASE_URL: z.string().url().default(MODEL.defaultBaseUrl),
    ANTHROPIC_MODEL: z.string().default(MODEL.defaultName),
    PORT: z.coerce.number().default(DEFAULT_PORT),
  },
  runtimeEnv: process.env,
  skipValidation: false,
  onValidationError: (issues) => {
    throw new Error(
      `Invalid environment variables: ${issues
        .map((issue) => `${(issue.path ?? []).join(".")}: ${issue.message}`)
        .join(", ")}`,
    );
  },
  onInvalidAccess: (variable) => {
    throw new Error(
      `Attempted to access server-side env variable "${variable}" on the client`,
    );
  },
});
