import { tool } from "ai";
import type { ToolExecutionOptions } from "ai";

import { EchoInputSchema } from "../schemas/agent.js";
import type { EchoInput, EchoOutput } from "../schemas/agent.js";

/**
 * Example tool: echoes back the given text verbatim.
 *
 * Uses ai-sdk's `tool()` so the schema and execute handler are typed and
 * directly consumable by the agent loop.
 */
export const echoTool = tool({
  description: "Echoes back the given text verbatim.",
  parameters: EchoInputSchema,
  execute: (
    input: EchoInput,
    _options: ToolExecutionOptions,
  ): Promise<EchoOutput> => Promise.resolve({ text: input.text }),
});

export type EchoTool = typeof echoTool;
