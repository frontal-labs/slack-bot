import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSlackTransport } from "../../src/slack/transport.js";

const SLACK_ERROR = /Slack API error/;

describe("createSlackTransport", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("posts a message with the bearer token", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, ts: "123.456" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const transport = createSlackTransport({
      token: "xoxb-test",
      fetch: fetchMock as unknown as typeof fetch,
    });

    const result = await transport.postMessage({
      channelId: "C1",
      text: "hello",
      attachments: [],
    });

    expect(result.messageId).toBe("123.456");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://slack.com/api/chat.postMessage",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer xoxb-test",
        }),
        body: JSON.stringify({
          channel: "C1",
          text: "hello",
          thread_ts: undefined,
        }),
      }),
    );
  });

  it("throws when Slack reports an error", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, error: "invalid_auth" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const transport = createSlackTransport({
      token: "xoxb-test",
      fetch: fetchMock as unknown as typeof fetch,
    });

    await expect(
      transport.postMessage({ channelId: "C1", text: "hi", attachments: [] }),
    ).rejects.toThrow(SLACK_ERROR);
  });
});
