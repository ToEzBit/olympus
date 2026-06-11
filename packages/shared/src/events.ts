/**
 * Internal EventBus event schema.
 *
 * Every event carries a correlationId tying a call to its eventual return
 * (per ADR-0001 call/return). For S1, correlationId === taskId (1:1).
 * Future slices (delegation, discussion) may nest multiple correlationIds
 * under one task.
 *
 * This union is additive: new event types are added as new branches, never
 * by mutating existing ones, so exhaustive switches in consumers force
 * deliberate updates when new event types appear.
 */

export type AgentStatus = "idle" | "thinking" | "talking";

export interface BaseEvent {
  /** Unique id for this event (uuid). */
  id: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Ties a call to its return; for S1, equal to the originating taskId. */
  correlationId: string;
}

export interface TaskCreatedEvent extends BaseEvent {
  type: "task.created";
  taskId: string;
  agentId: string;
  /** S1: only "boss". Later: "agent" | "routine". */
  origin: "boss";
  input: string;
}

export interface TaskCompletedEvent extends BaseEvent {
  type: "task.completed";
  taskId: string;
  agentId: string;
  output: string;
}

export interface TaskFailedEvent extends BaseEvent {
  type: "task.failed";
  taskId: string;
  agentId: string;
  error: string;
}

export interface AgentStatusChangedEvent extends BaseEvent {
  type: "agent.status_changed";
  agentId: string;
  status: AgentStatus;
  taskId?: string;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  totalCostUsd?: number;
}

export interface AgentAnswerEvent extends BaseEvent {
  type: "agent.answer";
  agentId: string;
  taskId: string;
  text: string;
  usage?: ModelUsage;
}

export type OlympusEvent =
  | TaskCreatedEvent
  | TaskCompletedEvent
  | TaskFailedEvent
  | AgentStatusChangedEvent
  | AgentAnswerEvent;

export type OlympusEventType = OlympusEvent["type"];

/** Stamps `id` and `timestamp`, the BaseEvent fields every publisher must set. */
export function createEvent<E extends OlympusEvent>(fields: Omit<E, "id" | "timestamp">): E {
  return {
    ...fields,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  } as E;
}
