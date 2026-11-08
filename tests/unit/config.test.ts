import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  AGENT,
  DEFAULT_PORT,
  MODEL,
  PROJECT,
  SERVER,
  SLACK,
} from "../../src/config.js";

describe("config", () => {
  it("keeps PROJECT.version in sync with package.json", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { name: string; version: string; description: string };

    expect(PROJECT.name).toBe(pkg.name);
    expect(PROJECT.version).toBe(pkg.version);
    expect(PROJECT.description).toBe(pkg.description);
  });

  it("exposes the server routes used by src/index.ts", () => {
    expect(SERVER.routes.health).toBe("/health");
    expect(SERVER.routes.slackEvents).toBe("/slack/events");
  });

  it("points Slack constants at the Web API and manifest", () => {
    expect(SLACK.apiBaseUrl).toBe("https://slack.com/api");
    expect(SLACK.apiMethods.postMessage).toBe("chat.postMessage");
    expect(SLACK.manifestPath).toBe("slack/manifest.json");
  });

  it("matches the agent id used by the Slack channel", () => {
    expect(AGENT.id).toBe("agent:mock-slack-assistant");
  });

  it("uses the same defaults as env.ts", () => {
    expect(MODEL.defaultName).toBe("claude-haiku-4-5");
    expect(MODEL.defaultBaseUrl).toBe("https://api.anthropic.com");
    expect(DEFAULT_PORT).toBe(3333);
  });
});
