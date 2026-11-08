import type { ActorRef, ChannelDefinition } from "@openchannelprotocol/sdk";
import { ActorType, createActor } from "@openchannelprotocol/sdk";
import { slackChannel } from "@openchannelprotocol/sdk/slack";
import type { SlackTransport } from "@openchannelprotocol/sdk/slack";

export const AGENT_ID = "agent:mock-slack-assistant";

/**
 * Builds the Slack channel definition for `openChannel({ channels })`.
 *
 * The channel pairs a `ChannelSource` (verifies + normalizes inbound webhooks)
 * with a `ChannelSink` (posts outbound messages via the Slack Web API).
 *
 * `recipient` is the agent actor that inbound messages are routed to.
 */
export function createSlackChannel(options: {
  transport: SlackTransport;
  botUserId?: string;
  recipient?: ActorRef;
}): ChannelDefinition {
  return slackChannel({
    transport: options.transport,
    botUserId: options.botUserId,
    recipient:
      options.recipient ??
      createActor(AGENT_ID, ActorType.AGENT, "Mock Slack Assistant"),
  });
}

export type { ActorRef, ChannelDefinition };
