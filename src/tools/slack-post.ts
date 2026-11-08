import { tool } from "ai";
import type { ToolExecutionOptions } from "ai";

import { SlackPostInputSchema } from "../schemas/agent.js";
import type { SlackPostInput, SlackPostOutput } from "../schemas/agent.js";
import type { SlackTransport } from "../slack/transport.js";

/**
 * Example tool: posts a message to a Slack channel.
 *
 * Created as a factory because it needs the Slack transport injected at
 * startup. The agent registry calls this once and passes the resulting
 * tool to the agent loop.
 */
export function createSlackPostTool(transport: SlackTransport) {
  return tool({
    description:
      "Posts a message to a Slack channel. Use this when the user asks you to send or announce something in Slack.",
    parameters: SlackPostInputSchema,
    execute: async (
      input: SlackPostInput,
      _options: ToolExecutionOptions,
    ): Promise<SlackPostOutput> => {
      const result = await transport.postMessage({
        channelId: input.channelId,
        text: input.text,
        attachments: [],
      });
      return { messageId: result.messageId as SlackPostOutput["messageId"] };
    },
  });
}

export type SlackPostTool = ReturnType<typeof createSlackPostTool>;
