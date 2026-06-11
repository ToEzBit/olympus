import type { AgentStatus, ServerMessage } from "@olympus/shared";

export interface AgentVisualState {
  agentId: string;
  name: string;
  status: AgentStatus;
  /** Speech bubble text. Set by agent.answer, cleared once status leaves "talking". */
  speechText?: string;
}

export type OfficeState = Record<string, AgentVisualState>;

export const initialOfficeState: OfficeState = {};

/**
 * Pure reducer: a deterministic sequence of ServerMessages yields a
 * deterministic OfficeState (per S1 acceptance criteria). No DOM, timers,
 * or randomness — Phaser reads the resulting state every frame but never
 * feeds back into it.
 */
export function reduceOfficeState(state: OfficeState, message: ServerMessage): OfficeState {
  if (message.channel === "snapshot") {
    const next: OfficeState = {};
    for (const agent of message.agents) {
      next[agent.agentId] = {
        agentId: agent.agentId,
        name: agent.name,
        status: agent.status,
        speechText: agent.lastAnswer,
      };
    }
    return next;
  }

  const event = message.event;
  const existing: AgentVisualState = state[event.agentId] ?? {
    agentId: event.agentId,
    name: event.agentId,
    status: "idle",
  };

  switch (event.type) {
    case "agent.status_changed":
      return {
        ...state,
        [event.agentId]: {
          ...existing,
          status: event.status,
          speechText: event.status === "talking" ? existing.speechText : undefined,
        },
      };
    case "agent.answer":
      return {
        ...state,
        [event.agentId]: { ...existing, speechText: event.text },
      };
    case "task.created":
    case "task.completed":
    case "task.failed":
      return state;
    default:
      return state;
  }
}
