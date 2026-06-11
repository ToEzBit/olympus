import { describe, expect, it } from "vitest";
import { colorForAgent } from "./agent-color.js";

describe("colorForAgent", () => {
  it("is deterministic for the same agentId", () => {
    expect(colorForAgent("apollo")).toBe(colorForAgent("apollo"));
  });

  it("gives different agents different colors", () => {
    expect(colorForAgent("apollo")).not.toBe(colorForAgent("hermes"));
  });
});
