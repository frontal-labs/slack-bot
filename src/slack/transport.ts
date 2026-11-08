import type {
  SlackSendInput,
  SlackTransport,
} from "@openchannelprotocol/sdk/slack";

export type { SlackTransport, SlackSendInput };

export interface SlackTransportDeps {
  /** Slack bot token (xoxb-...). */
  token: string;
  /** Override the fetch implementation (useful for tests). */
  fetch?: typeof globalThis.fetch;
}

export function createSlackTransport({
  token,
  fetch = globalThis.fetch,
}: SlackTransportDeps): SlackTransport {
  return {
    async postMessage(input: SlackSendInput): Promise<{ messageId?: string }> {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: input.channelId,
          text: input.text,
          thread_ts: input.threadId,
        }),
        signal: input.signal ?? undefined,
      });

      const data = (await response.json()) as {
        ok: boolean;
        ts?: string;
        error?: string;
      };

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error ?? "unknown error"}`);
      }

      return { messageId: data.ts };
    },
  };
}
