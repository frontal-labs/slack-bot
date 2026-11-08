import { ActorType, createActor } from "@openchannelprotocol/sdk";
import type { EventEnvelope } from "@openchannelprotocol/sdk";
import {
  type SlackWebhookRequest,
  normalizeSlackEvent,
  verifySlackWebhook,
} from "@openchannelprotocol/sdk/slack";

import { AGENT } from "../config.js";
import { env } from "../env.js";

export interface WebhookResult {
  envelope: EventEnvelope | null;
}

/**
 * Verifies and normalizes an inbound Slack Events API webhook.
 *
 * `normalizeSlackEvent` returns either an empty array (for non-message events,
 * bot posts, URL verification handshakes, etc.) or a single `message.received`
 * envelope. This helper normalizes that union into a nullable envelope.
 */
export async function handleSlackWebhook(
  request: SlackWebhookRequest,
): Promise<WebhookResult> {
  verifySlackWebhook(request, env.SLACK_SIGNING_SECRET);

  // The SDK expects the parsed payload, not the raw signed string.
  const rawBody =
    typeof request.body === "string"
      ? request.body
      : new TextDecoder().decode(request.body);

  // `recipient` is required: the runtime routes only by it, so without it the
  // message reaches no agent.
  const normalized = await normalizeSlackEvent(JSON.parse(rawBody), undefined, {
    botUserId: env.SLACK_BOT_USER_ID,
    recipient: createActor(AGENT.id, ActorType.AGENT, AGENT.name),
  });

  // `normalizeSlackEvent` returns `never[] | EventEnvelope`. An array means
  // the payload was not an inbound human message.
  if (Array.isArray(normalized)) {
    return { envelope: null };
  }

  return { envelope: normalized };
}

/** Build a SlackWebhookRequest from raw inputs. */
export function toWebhookRequest(
  body: string,
  headers: Record<string, string | undefined>,
): SlackWebhookRequest {
  return { body, headers };
}
