import { describe, expect, it } from "vitest";

import { echoTool } from "../../src/tools/echo.js";

describe("echoTool", () => {
  it("returns the input text verbatim", async () => {
    const result = await echoTool.execute(
      { text: "hello" },
      { toolCallId: "1", messages: [] },
    );
    expect(result).toEqual({ text: "hello" });
  });

  it("has a description", () => {
    expect(echoTool.description).toBeTruthy();
  });
});
