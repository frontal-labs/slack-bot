import { z } from "zod";

/**
 * Shared Zod schemas for tool inputs and agent messages.
 * TS types are derived via `z.infer` so there is a single source of truth.
 */

/** Slack channel/user identifiers are branded to avoid accidental mixing. */
export const SlackChannelId = z.string().min(1).brand("SlackChannelId");

export type SlackChannelId = z.infer<typeof SlackChannelId>;

export const SlackUserId = z.string().min(1).brand("SlackUserId");

export type SlackUserId = z.infer<typeof SlackUserId>;

export const SlackMessageId = z.string().min(1).brand("SlackMessageId");

export type SlackMessageId = z.infer<typeof SlackMessageId>;

/** Input for the `echo` tool. */
export const EchoInputSchema = z.object({
  text: z.string().min(1),
});

export type EchoInput = z.infer<typeof EchoInputSchema>;

/** Output of the `echo` tool. */
export const EchoOutputSchema = z.object({
  text: z.string(),
});

export type EchoOutput = z.infer<typeof EchoOutputSchema>;

/** Input for the `slack-post` tool. */
export const SlackPostInputSchema = z.object({
  channelId: SlackChannelId,
  text: z.string().min(1).max(4000),
});

export type SlackPostInput = z.infer<typeof SlackPostInputSchema>;

/** Output of the `slack-post` tool. */
export const SlackPostOutputSchema = z.object({
  messageId: SlackMessageId.optional(),
});

export type SlackPostOutput = z.infer<typeof SlackPostOutputSchema>;
