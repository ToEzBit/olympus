/**
 * WebSocket protocol between Engine and Web UI.
 *
 * S1 is Engine -> UI only (event stream + initial snapshot). Boss commands
 * go via HTTP POST /command (see docs/contracts/0002-websocket-protocol.md).
 * ClientCommandMessage is part of the contract for forward-compatibility
 * but is not sent by the UI in S1.
 */

import type { AgentStatus, OlympusEvent } from "./events.js";

/** Engine -> UI: a single OlympusEvent, projected 1:1 onto the wire. */
export interface ServerEventMessage {
  channel: "event";
  event: OlympusEvent;
}

/** Engine -> UI: sent once on connect so the UI can bootstrap state. */
export interface ServerSnapshotMessage {
  channel: "snapshot";
  agents: AgentSnapshot[];
}

export interface AgentSnapshot {
  agentId: string;
  name: string;
  status: AgentStatus;
  lastAnswer?: string;
}

export type ServerMessage = ServerEventMessage | ServerSnapshotMessage;

/** UI -> Engine: reserved for future inbound WS commands. Unused in S1. */
export interface ClientCommandMessage {
  channel: "command";
  correlationId: string;
  agentId: string;
  text: string;
}

export type ClientMessage = ClientCommandMessage;
