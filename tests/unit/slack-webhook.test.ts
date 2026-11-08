import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

// `env.ts` validates process.env at import time, so the variables must be set
// before the static import of the webhook module below.
const signingSecret = "test-secret";
const botUserId = "U_BOT";

vi.hoisted(() => {
  process.env.SLACK_SIGNING_SECRET = "test-secret";
  process.env.SLACK_BOT_USER_ID = "U_BOT";
  process.env.SLACK_BOT_TOKEN = "xoxb-test";
  process.env.ANTHROPIC_API_KEY = "sk-test";
  process.env.ANTHROPIC_BASE_URL = "https://api.anthropic.com";
  process.env.ANTHROPIC_MODEL = "claude-haiku-4-5";
  process.env.PORT = "3333";
});

import { handleSlackWebhook } from "../../src/slack/webhook.js";

/**
 * Tests the webhook verification + normalization wrapper.
 * `verifySlackWebhook` and `normalizeSlackEvent` are real (not mocked) so the
 * signing logic and normalization behavior are exercised end to end.
 */
describe("handleSlackWebhook", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function sign(body: string, timestamp: string): string {
    const data = `v0:${timestamp}:${body}`;
    return `v0=${createHmac("sha256", signingSecret).update(data).digest("hex")}`;
  }

  it("returns null for a URL verification handshake", async () => {
    const body = JSON.stringify({
      type: "url_verification",
      challenge: "challenge-123",
    });
    const ts = String(Math.floor(Date.now() / 1000));
    const result = await handleSlackWebhook({
      body,
      headers: {
        "x-slack-request-timestamp": ts,
        "x-slack-signature": sign(body, ts),
      },
    });
    expect(result.envelope).toBeNull();
  });

  it("throws on a signature mismatch", async () => {
    const body = JSON.stringify({
      type: "event_callback",
      event: {
        type: "message",
        channel: "C1",
        user: "U1",
        text: "hi",
        ts: "1.1",
      },
    });
    const ts = String(Math.floor(Date.now() / 1000));
    await expect(
      handleSlackWebhook({
        body,
        headers: {
          "x-slack-request-timestamp": ts,
          "x-slack-signature": "v0=invalid",
        },
      }),
    ).rejects.toThrow();
  });

  it("returns null for a bot_message", async () => {
    const body = JSON.stringify({
      type: "event_callback",
      event: {
        type: "message",
        subtype: "bot_message",
        channel: "C1",
        user: "U1",
        text: "hi",
        ts: "1.1",
      },
    });
    const ts = String(Math.floor(Date.now() / 1000));
    const result = await handleSlackWebhook({
      body,
      headers: {
        "x-slack-request-timestamp": ts,
        "x-slack-signature": sign(body, ts),
      },
    });
    expect(result.envelope).toBeNull();
  });

  it("returns null for a message from the bot user", async () => {
    const body = JSON.stringify({
      type: "event_callback",
      event: {
        type: "message",
        channel: "C1",
        user: botUserId,
        text: "hi",
        ts: "1.1",
      },
    });
    const ts = String(Math.floor(Date.now() / 1000));
    const result = await handleSlackWebhook({
      body,
      headers: {
        "x-slack-request-timestamp": ts,
        "x-slack-signature": sign(body, ts),
      },
    });
    expect(result.envelope).toBeNull();
  });

  it("returns a message.received envelope for a valid human message", async () => {
    const body = JSON.stringify({
      type: "event_callback",
      event_id: "evt_1",
      event: {
        type: "message",
        channel: "C1",
        user: "U1",
        text: "hello there",
        ts: "1.2",
      },
    });
    const ts = String(Math.floor(Date.now() / 1000));
    const result = await handleSlackWebhook({
      body,
      headers: {
        "x-slack-request-timestamp": ts,
        "x-slack-signature": sign(body, ts),
      },
    });
    expect(result.envelope).not.toBeNull();
    expect(result.envelope?.payload.case).toBe("messageReceived");
    if (result.envelope?.payload.case === "messageReceived") {
      expect(result.envelope.payload.value.text).toBe("hello there");
    }
    expect(result.envelope?.channel?.channelId).toBe("C1");
    expect(result.envelope?.eventId).toBe("evt_1");
  });
});
