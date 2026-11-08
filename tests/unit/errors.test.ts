import { describe, expect, it } from "vitest";

import {
  AppError,
  ConfigError,
  ErrorCode,
  SignatureError,
  SlackApiError,
  ToolError,
  ValidationError,
} from "../../src/errors.js";

describe("AppError", () => {
  it("extends Error with defaults", () => {
    const error = new AppError("boom");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe("boom");
    expect(error.name).toBe("AppError");
    expect(error.code).toBe(ErrorCode.UNKNOWN);
    expect(error.status).toBe(500);
    expect(error.details).toEqual({});
    expect(error.isOperational).toBe(true);
    expect(error.stack).toBeTypeOf("string");
  });

  it("accepts code, status, details, and isOperational", () => {
    const error = new AppError("nope", {
      code: ErrorCode.VALIDATION,
      status: 422,
      details: { field: "text" },
      isOperational: false,
    });

    expect(error.code).toBe(ErrorCode.VALIDATION);
    expect(error.status).toBe(422);
    expect(error.details).toEqual({ field: "text" });
    expect(error.isOperational).toBe(false);
  });

  it("keeps the native cause", () => {
    const inner = new Error("inner");
    const error = new AppError("outer", { cause: inner });

    expect(error.cause).toBe(inner);
  });

  it("returns the same instance from from() when given an AppError", () => {
    const original = new AppError("kept");

    expect(AppError.from(original)).toBe(original);
  });

  it("wraps a plain Error, keeping its message as the cause", () => {
    const inner = new TypeError("bad type");
    const wrapped = AppError.from(inner, { code: ErrorCode.TOOL });

    expect(wrapped).toBeInstanceOf(AppError);
    expect(wrapped.message).toBe("bad type");
    expect(wrapped.code).toBe(ErrorCode.TOOL);
    expect(wrapped.cause).toBe(inner);
  });

  it("wraps a string and an unknown value", () => {
    expect(AppError.from("text failure").message).toBe("text failure");
    expect(AppError.from({ weird: true }).message).toBe("Unknown error");
  });

  it("lets from() override the derived message", () => {
    const wrapped = AppError.from(new Error("raw"), { message: "friendly" });

    expect(wrapped.message).toBe("friendly");
    expect(wrapped.cause).toBeInstanceOf(Error);
  });

  it("type-guards with isAppError", () => {
    expect(AppError.isAppError(new AppError("x"))).toBe(true);
    expect(AppError.isAppError(new Error("x"))).toBe(false);
    expect(AppError.isAppError("x")).toBe(false);
  });

  it("walks the cause chain and finds the root cause", () => {
    const root = new Error("root");
    const middle = new AppError("middle", { cause: root });
    const top = new AppError("top", { cause: middle });

    expect(top.causeChain()).toEqual([top, middle, root]);
    expect(top.rootCause()).toBe(root);
  });

  it("returns itself as the root cause when there is no cause", () => {
    const error = new AppError("solo");

    expect(error.rootCause()).toBe(error);
    expect(error.causeChain()).toEqual([error]);
  });

  it("serializes to JSON without the stack", () => {
    const error = new AppError("oops", {
      code: ErrorCode.CONFIG,
      status: 500,
      details: { key: "PORT" },
      cause: new Error("parse failed"),
    });

    const json = error.toJSON();

    expect(json).toEqual({
      name: "AppError",
      code: ErrorCode.CONFIG,
      message: "oops",
      status: 500,
      details: { key: "PORT" },
      isOperational: true,
      timestamp: error.timestamp,
      cause: { name: "Error", message: "parse failed" },
    });
    expect(JSON.stringify(error)).not.toContain("stack");
  });
});

describe("AppError subclasses", () => {
  it("ConfigError uses the CONFIG code and 500 status", () => {
    const error = new ConfigError("missing key");

    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe("ConfigError");
    expect(error.code).toBe(ErrorCode.CONFIG);
    expect(error.status).toBe(500);
  });

  it("ValidationError maps to 400", () => {
    const error = new ValidationError("bad input", {
      details: { issues: [] },
    });

    expect(error.name).toBe("ValidationError");
    expect(error.code).toBe(ErrorCode.VALIDATION);
    expect(error.status).toBe(400);
    expect(error.details).toEqual({ issues: [] });
  });

  it("SignatureError maps to 401 with a default message", () => {
    const error = new SignatureError();

    expect(error.message).toBe("Invalid Slack request signature");
    expect(error.code).toBe(ErrorCode.SIGNATURE);
    expect(error.status).toBe(401);
  });

  it("SlackApiError exposes the Slack error and merges details", () => {
    const error = new SlackApiError("channel_not_found", {
      details: { channelId: "C1" },
    });

    expect(error.message).toBe("Slack API error: channel_not_found");
    expect(error.slackError).toBe("channel_not_found");
    expect(error.code).toBe(ErrorCode.SLACK);
    expect(error.status).toBe(502);
    expect(error.details).toEqual({
      slackError: "channel_not_found",
      channelId: "C1",
    });
  });

  it("ToolError exposes the tool name", () => {
    const error = new ToolError("slackPost", "network down");

    expect(error.message).toBe('Tool "slackPost" failed: network down');
    expect(error.toolName).toBe("slackPost");
    expect(error.code).toBe(ErrorCode.TOOL);
    expect(error.status).toBe(500);
    expect(error.details).toEqual({ toolName: "slackPost" });
  });
});
