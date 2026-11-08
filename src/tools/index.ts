import type { SlackTransport } from "../slack/transport.js";
import { echoTool } from "./echo.js";
import { createSlackPostTool } from "./slack-post.js";

/** Registry of all tools the agent can use. */
export function createToolRegistry(transport: SlackTransport) {
  return {
    echo: echoTool,
    slackPost: createSlackPostTool(transport),
  };
}

export type ToolRegistry = ReturnType<typeof createToolRegistry>;
