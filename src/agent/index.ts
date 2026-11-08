import type { AgentContext } from "@openchannelprotocol/sdk";
import { streamText } from "ai";

import type { SlackTransport } from "../slack/transport.js";
import { echoTool } from "../tools/echo.js";
import { createSlackPostTool } from "../tools/slack-post.js";
import { createModel } from "./model.js";
import { systemPrompt } from "./system-prompt.js";

/**
 * Builds an OCP agent definition backed by an OpenAI-compatible model.
 *
 * The agent reads the inbound message, runs a tool-using stream, and replies
 * with the generated text. Tools are injected so the agent can post back to
 * Slack when asked.
 */
export function createAgentDefinition(transport: SlackTransport) {
  const model = createModel();
  const tools = {
    echo: echoTool,
    slackPost: createSlackPostTool(transport),
  };

  return {
    id: "agent:mock-slack-assistant",
    name: "Mock Slack Assistant",
    description:
      "A small, typesafe demo agent that echoes text and posts to Slack.",
    onMessage: async (ctx: AgentContext) => {
      const result = streamText({
        model,
        system: systemPrompt,
        tools,
        prompt: ctx.message.text,
        maxRetries: 2,
      });

      let text = "";
      for await (const chunk of result.textStream) {
        text += chunk;
      }

      await ctx.reply(text);
    },
  };
}

export type AgentDefinition = ReturnType<typeof createAgentDefinition>;
