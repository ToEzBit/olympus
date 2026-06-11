# Contract 0002 — WebSocket protocol (Engine <-> Web UI)

**Status:** proposed — needs Boss/architect sign-off (S1 acceptance criteria)
**Source of truth:** `packages/shared/src/ws-protocol.ts`

## Transport split (S1)

- **Boss command (UI -> Engine): HTTP `POST /command`** — not WebSocket.
  See request/response shape below.
- **Status + answers (Engine -> UI): WebSocket**, realtime, one-directional
  in S1.

`ClientCommandMessage` is defined in the shared types as a forward-compatible
placeholder for an eventual WS-based command channel, but is **not sent by
the UI in S1** and the Engine does not need to handle it yet.

## Connection lifecycle

1. Web UI opens a WebSocket connection to the Engine (`NEXT_PUBLIC_ENGINE_WS_URL`).
2. Engine immediately sends a `ServerSnapshotMessage` containing the current
   status of every registered agent. This lets a UI that connects mid-session
   render the correct state immediately, instead of showing stale `idle`
   until the next event.
3. From then on, every `OlympusEvent` published on the EventBus is forwarded
   verbatim as a `ServerEventMessage` to all connected clients.

## Message shapes

### `ServerSnapshotMessage` (sent once, on connect)

```json
{
  "channel": "snapshot",
  "agents": [
    { "agentId": "apollo", "name": "Apollo", "status": "idle" }
  ]
}
```

`AgentSnapshot.lastAnswer` is optional — set if the agent has a previous
answer to show as a speech bubble immediately on load.

### `ServerEventMessage` (one per published OlympusEvent)

```json
{
  "channel": "event",
  "event": { "type": "agent.status_changed", "...": "..." }
}
```

`event` is exactly one of the `OlympusEvent` variants documented in
[0001-event-schema.md](./0001-event-schema.md).

## HTTP command endpoint

```
POST /command
Body:    { "agentId": "apollo", "text": "What's the weather like?" }
Response: 202 Accepted
         { "taskId": "task_abc123", "correlationId": "task_abc123" }
```

The response is returned **immediately** after `task.created` and the first
`agent.status_changed` (-> `thinking`) are published — it does not wait for
the Brain call to finish (Claude calls observed ~20s in spike testing). The
actual answer arrives over the WebSocket as `agent.answer` /
`task.completed`, correlated by `correlationId`.

## Example end-to-end sequence

```
UI --HTTP POST /command--> Engine
Engine --202 {taskId, correlationId}--> UI

Engine --WS ServerEventMessage(task.created)--> UI
Engine --WS ServerEventMessage(agent.status_changed: thinking)--> UI
   ... claude -p running ...
Engine --WS ServerEventMessage(agent.answer)--> UI
Engine --WS ServerEventMessage(agent.status_changed: talking)--> UI
Engine --WS ServerEventMessage(task.completed)--> UI
Engine --WS ServerEventMessage(agent.status_changed: idle)--> UI
```

## Open questions for reviewer

- Confirm HTTP-for-commands / WS-for-events split is acceptable for S1, vs.
  an all-WS protocol. Rationale: simplest possible Boss input path; WS stays
  one-directional which simplifies the S1 server. `ClientCommandMessage` is
  reserved if we want to unify later.
