import { describe, expect, it } from "vitest";

import {
  EchoInputSchema,
  SlackPostInputSchema,
} from "../../src/schemas/agent.js";

describe("schemas", () => {
  it("parses a valid echo input", () => {
    const result = EchoInputSchema.parse({ text: "hello" });
    expect(result.text).toBe("hello");
  });

  it("rejects an empty echo text", () => {
    const result = EchoInputSchema.safeParse({ text: "" });
    expect(result.success).toBe(false);
  });

  it("parses a valid slack-post input", () => {
    const result = SlackPostInputSchema.parse({
      channelId: "C123",
      text: "hi",
    });
    expect(result.channelId).toBe("C123");
  });

  it("rejects an empty slack-post text", () => {
    const result = SlackPostInputSchema.safeParse({
      channelId: "C123",
      text: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a too-long slack-post text", () => {
    const result = SlackPostInputSchema.safeParse({
      channelId: "C123",
      text: "x".repeat(4001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing channelId", () => {
    const result = SlackPostInputSchema.safeParse({ text: "hi" });
    expect(result.success).toBe(false);
  });
});
