import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { Context } from "hono";

import { RuleBasedPolicyEngine } from "@openchannelprotocol/sdk";
import { openChannel } from "@openchannelprotocol/sdk";
import { createAgentDefinition } from "./agent/index.js";
import { env } from "./env.js";
import { createSlackChannel } from "./slack/channel.js";
import { createInMemoryStore } from "./slack/store.js";
import { createSlackTransport } from "./slack/transport.js";
import { handleSlackWebhook, toWebhookRequest } from "./slack/webhook.js";

/**
 * Wires the OCP runtime, Slack channel, and ai-sdk agent together and starts
 * a Node HTTP server that accepts Slack Events API webhooks.
 */
export async function createApp() {
  // One transport instance is shared by the Slack channel (sink) and the
  // agent's `slackPost` tool, so both talk to the same Slack Web API client.
  const transport = createSlackTransport({ token: env.SLACK_BOT_TOKEN });
  const store = createInMemoryStore();
  const channel = createSlackChannel({ transport });
  const agent = createAgentDefinition(transport);

  const app = openChannel({
    policy: new RuleBasedPolicyEngine({ rules: [] }),
    store,
    channels: [channel],
    agents: [agent],
  });

  const hono = new Hono();

  hono.get("/health", (c: Context) =>
    c.json({ status: "ok", model: env.ANTHROPIC_MODEL }),
  );

  hono.post("/slack/events", async (c: Context) => {
    const body = await c.req.text();
    const headers: Record<string, string | undefined> = {};
    for (const [key, value] of c.req.raw.headers.entries()) {
      headers[key.toLowerCase()] = value;
    }

    // Slack URL verification handshake — answer before OCP ingest.
    const parsed = JSON.parse(body) as { type?: string; challenge?: string };
    if (parsed.type === "url_verification") {
      return c.json({ challenge: parsed.challenge ?? "" });
    }

    try {
      const { envelope } = await handleSlackWebhook(
        toWebhookRequest(body, headers),
      );
      if (!envelope) {
        return c.json({ ok: true });
      }
      await app.ingest(envelope);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      return c.json({ ok: false, error: message }, 500);
    }
  });

  await app.start();

  return { app, hono };
}

export async function main() {
  const { hono } = await createApp();
  const port = env.PORT;
  const server = serve({ fetch: hono.fetch, port }, () => {
    // biome-ignore lint/suspicious/noConsole: startup message for the operator
    // biome-ignore lint/suspicious/noConsoleLog: startup message for the operator
    console.log(`slack-bot listening on http://localhost:${port}`);
  });
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
