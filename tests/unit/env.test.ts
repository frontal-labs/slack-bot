import { describe, expect, it, vi } from "vitest";

/**
 * `env.ts` validates `process.env` at module load, so we re-import it with a
 * controlled environment to test both the happy path and the failure path.
 */
const INVALID_ENV = /Invalid environment variables/;

describe("env", () => {
  it("parses a fully populated environment", async () => {
    process.env = {
      SLACK_BOT_TOKEN: "xoxb-test",
      SLACK_SIGNING_SECRET: "secret",
      SLACK_BOT_USER_ID: "U123",
      ANTHROPIC_API_KEY: "sk-test",
      ANTHROPIC_BASE_URL: "https://api.anthropic.com",
      ANTHROPIC_MODEL: "claude-haiku-4-5",
      PORT: "4321",
    };

    const { env } = await import("../../src/env.js");
    expect(env.SLACK_BOT_TOKEN).toBe("xoxb-test");
    expect(env.SLACK_SIGNING_SECRET).toBe("secret");
    expect(env.SLACK_BOT_USER_ID).toBe("U123");
    expect(env.ANTHROPIC_API_KEY).toBe("sk-test");
    expect(env.ANTHROPIC_BASE_URL).toBe("https://api.anthropic.com");
    expect(env.ANTHROPIC_MODEL).toBe("claude-haiku-4-5");
    expect(env.PORT).toBe(4321);
  });

  it("throws when a required secret is missing", async () => {
    vi.resetModules();
    process.env = {
      SLACK_BOT_TOKEN: "xoxb-test",
      // SLACK_SIGNING_SECRET missing
      SLACK_BOT_USER_ID: "U123",
      ANTHROPIC_API_KEY: "sk-test",
    };

    await expect(import("../../src/env.js")).rejects.toThrow(INVALID_ENV);
  });

  it("falls back to default model and port", async () => {
    vi.resetModules();
    process.env = {
      SLACK_BOT_TOKEN: "xoxb-test",
      SLACK_SIGNING_SECRET: "secret",
      SLACK_BOT_USER_ID: "U123",
      ANTHROPIC_API_KEY: "sk-test",
    };

    const { env } = await import("../../src/env.js");
    expect(env.ANTHROPIC_MODEL).toBe("claude-haiku-4-5");
    expect(env.PORT).toBe(3333);
    expect(env.ANTHROPIC_BASE_URL).toBe("https://api.anthropic.com");
  });
});
