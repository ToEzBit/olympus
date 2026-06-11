import { describe, expect, it } from "vitest";
import type { ServerMessage } from "@olympus/shared";
import { initialOfficeState, reduceOfficeState } from "./agent-state-store.js";

const messages: ServerMessage[] = [
  {
    channel: "snapshot",
    agents: [{ agentId: "apollo", name: "Apollo", status: "idle" }],
  },
  {
    channel: "event",
    event: {
      type: "agent.status_changed",
      id: "evt_1",
      timestamp: "2026-06-11T10:00:00.000Z",
      correlationId: "task_1",
      agentId: "apollo",
      status: "thinking",
      taskId: "task_1",
    },
  },
  {
    channel: "event",
    event: {
      type: "agent.answer",
      id: "evt_2",
      timestamp: "2026-06-11T10:00:01.000Z",
      correlationId: "task_1",
      agentId: "apollo",
      taskId: "task_1",
      text: "Clear skies, Boss.",
    },
  },
  {
    channel: "event",
    event: {
      type: "agent.status_changed",
      id: "evt_3",
      timestamp: "2026-06-11T10:00:02.000Z",
      correlationId: "task_1",
      agentId: "apollo",
      status: "talking",
      taskId: "task_1",
    },
  },
  {
    channel: "event",
    event: {
      type: "task.completed",
      id: "evt_4",
      timestamp: "2026-06-11T10:00:02.500Z",
      correlationId: "task_1",
      taskId: "task_1",
      agentId: "apollo",
      output: "Clear skies, Boss.",
    },
  },
  {
    channel: "event",
    event: {
      type: "agent.status_changed",
      id: "evt_5",
      timestamp: "2026-06-11T10:00:03.000Z",
      correlationId: "task_1",
      agentId: "apollo",
      status: "idle",
      taskId: "task_1",
    },
  },
];

describe("reduceOfficeState", () => {
  it("starts empty", () => {
    expect(initialOfficeState).toEqual({});
  });

  it("bootstraps from a snapshot message", () => {
    const state = reduceOfficeState(initialOfficeState, messages[0]);
    expect(state).toEqual({
      apollo: { agentId: "apollo", name: "Apollo", status: "idle" },
    });
  });

  it("tracks multiple agents independently from a snapshot with two agents", () => {
    const snapshot: ServerMessage = {
      channel: "snapshot",
      agents: [
        { agentId: "apollo", name: "Apollo", status: "idle" },
        { agentId: "hermes", name: "Hermes", status: "thinking" },
      ],
    };

    const state = reduceOfficeState(initialOfficeState, snapshot);
    expect(state).toEqual({
      apollo: { agentId: "apollo", name: "Apollo", status: "idle", speechText: undefined },
      hermes: { agentId: "hermes", name: "Hermes", status: "thinking", speechText: undefined },
    });

    // An event for one agent must not affect the other's state.
    const next = reduceOfficeState(state, {
      channel: "event",
      event: {
        type: "agent.status_changed",
        id: "evt_h1",
        timestamp: "2026-06-11T10:00:00.000Z",
        correlationId: "task_h1",
        agentId: "hermes",
        status: "talking",
        taskId: "task_h1",
      },
    });
    expect(next.hermes.status).toBe("talking");
    expect(next.apollo).toEqual(state.apollo);
  });

  it("shows the speech bubble while talking, then clears it once idle again", () => {
    const upToTalking = messages.slice(0, 4).reduce(reduceOfficeState, initialOfficeState);
    expect(upToTalking.apollo).toMatchObject({ status: "talking", speechText: "Clear skies, Boss." });

    const final = messages.reduce(reduceOfficeState, initialOfficeState);
    expect(final.apollo.status).toBe("idle");
    expect(final.apollo.speechText).toBeUndefined();
  });

  it("is deterministic: the same fixed sequence always yields the same final state", () => {
    const runA = messages.reduce(reduceOfficeState, initialOfficeState);
    const runB = messages.reduce(reduceOfficeState, initialOfficeState);

    expect(runA).toEqual(runB);
    expect(runA).toEqual({
      apollo: { agentId: "apollo", name: "Apollo", status: "idle", speechText: undefined },
    });
  });
});
