import { Readable } from "node:stream";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * End-to-end integration test with a mocked ai-sdk `streamText` and a mocked
 * Slack transport. The real OCP runtime, Slack channel (verification +
 * normalization), and agent host wiring are exercised; only the network
 * calls are mocked.
 */
describe("slack-agent integration", () => {
  beforeEach(() => {
    process.env.SLACK_BOT_TOKEN = "xoxb-test";
    process.env.SLACK_SIGNING_SECRET = "test-secret";
    process.env.SLACK_BOT_USER_ID = "U_BOT";
    process.env.ANTHROPIC_API_KEY = "sk-test";
    process.env.ANTHROPIC_BASE_URL = "https://api.anthropic.com";
    process.env.ANTHROPIC_MODEL = "claude-haiku-4-5";
    process.env.PORT = "3333";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes a Slack message through the agent and posts a reply", async () => {
    const postMessage = vi.fn().mockResolvedValue({ messageId: "1.1" });
    const transport = { postMessage } as unknown as {
      postMessage: (input: {
        channelId: string;
        text: string;
        attachments: unknown[];
      }) => Promise<{ messageId?: string }>;
    };

    // Mock ai-sdk's streamText so no network call is made.
    vi.mock("ai", async (importOriginal) => {
      const actual = await importOriginal<typeof import("ai")>();
      return {
        ...actual,
        streamText: vi.fn().mockReturnValue({
          textStream: Readable.from(["hello back"]),
        }),
      };
    });

    const { createInMemoryStore } = await import("../../src/slack/store");
    const { RuleBasedPolicyEngine, openChannel } = await import(
      "@openchannelprotocol/sdk"
    );
    const { createAgentDefinition } = await import("../../src/agent");
    const { createSlackChannel } = await import("../../src/slack/channel");
    const { normalizeSlackEvent } = await import(
      "@openchannelprotocol/sdk/slack"
    );
    const { ActorType, createActor } = await import("@openchannelprotocol/sdk");
    const { AGENT } = await import("../../src/config.js");

    const store = createInMemoryStore();
    const channel = createSlackChannel({ transport: transport as never });
    const agent = createAgentDefinition(transport as never);

    const app = openChannel({
      policy: new RuleBasedPolicyEngine({ rules: [] }),
      store,
      channels: [channel],
      agents: [agent],
    });
    await app.start();

    const body = JSON.stringify({
      type: "event_callback",
      event_id: "evt_1",
      event: {
        type: "message",
        channel: "C1",
        user: "U1",
        text: "hi",
        ts: "1.2",
      },
    });
    const normalized = await normalizeSlackEvent(JSON.parse(body), undefined, {
      botUserId: "U_BOT",
      recipient: createActor(AGENT.id, ActorType.AGENT, AGENT.name),
    });
    // An array means the payload was not an inbound human message.
    if (Array.isArray(normalized)) {
      throw new Error("Expected a message.received envelope");
    }

    await app.ingest(normalized);
    await app.stop();

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channelId: "C1",
        text: expect.stringContaining("hello back"),
      }),
    );
  });
});
