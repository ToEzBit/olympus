import { WebSocket, WebSocketServer } from "ws";
import type { AgentStatus, OlympusEvent, ServerMessage } from "@olympus/shared";
import type { EventBus } from "./event-bus.js";
import type { AgentRegistry } from "./agent-registry.js";

/**
 * Engine -> UI WebSocket server (per docs/contracts/0002-websocket-protocol.md).
 *
 * On connect, sends a ServerSnapshotMessage built from the last-known status
 * of every registered agent. From then on, every OlympusEvent published on
 * the bus is forwarded verbatim as a ServerEventMessage to all clients.
 */
interface AgentSnapshotState {
  status: AgentStatus;
  lastAnswer?: string;
}

export function startWsServer(port: number, bus: EventBus, registry: AgentRegistry): WebSocketServer {
  const wss = new WebSocketServer({ port });

  const snapshotState = new Map<string, AgentSnapshotState>();
  for (const agent of registry.list()) {
    snapshotState.set(agent.id, { status: "idle" });
  }

  bus.subscribe((event) => {
    trackSnapshotState(event, snapshotState);
    broadcast(wss, { channel: "event", event });
  });

  wss.on("connection", (socket) => {
    const snapshot: ServerMessage = {
      channel: "snapshot",
      agents: registry.list().map((agent) => {
        const state = snapshotState.get(agent.id);
        return {
          agentId: agent.id,
          name: agent.persona.name,
          status: state?.status ?? "idle",
          lastAnswer: state?.lastAnswer,
        };
      }),
    };
    socket.send(JSON.stringify(snapshot));
  });

  return wss;
}

function trackSnapshotState(event: OlympusEvent, snapshotState: Map<string, AgentSnapshotState>): void {
  if (event.type === "agent.status_changed") {
    const state = snapshotState.get(event.agentId) ?? { status: event.status };
    state.status = event.status;
    snapshotState.set(event.agentId, state);
  }
  if (event.type === "agent.answer") {
    const state = snapshotState.get(event.agentId) ?? { status: "idle" as AgentStatus };
    state.lastAnswer = event.text;
    snapshotState.set(event.agentId, state);
  }
}

function broadcast(wss: WebSocketServer, message: ServerMessage): void {
  const payload = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
