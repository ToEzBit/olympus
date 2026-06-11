# Contract 0001 — Event schema

**Status:** accepted
**Source of truth:** `packages/shared/src/events.ts`

## Overview

The Engine owns an in-process **EventBus**. Every domain occurrence is published
as an `OlympusEvent` — a discriminated union on `type`. Every event shares a
`BaseEvent`:

| Field | Type | Meaning |
|---|---|---|
| `id` | `string` (uuid) | Unique id for this event |
| `timestamp` | `string` (ISO 8601) | When the event was published |
| `correlationId` | `string` | Ties a call to its eventual return (ADR-0001). For S1, equal to the originating `taskId` (1 task = 1 correlation). Future delegation/discussion slices may nest multiple correlationIds under one task. |

## S1 event types

### `task.created`
Published when the Boss issues a command (HTTP `POST /command`).

```json
{
  "type": "task.created",
  "id": "evt_...",
  "timestamp": "2026-06-11T10:00:00.000Z",
  "correlationId": "task_abc123",
  "taskId": "task_abc123",
  "agentId": "apollo",
  "origin": "boss",
  "input": "What's the weather like on Olympus today?"
}
```

`origin` is `"boss"` only in S1. Later slices add `"agent" | "routine"`.

### `agent.status_changed`
Published whenever an agent's visible status changes. Drives the Phaser
character state (idle / thinking / talking).

```json
{
  "type": "agent.status_changed",
  "id": "evt_...",
  "timestamp": "2026-06-11T10:00:00.100Z",
  "correlationId": "task_abc123",
  "agentId": "apollo",
  "status": "thinking",
  "taskId": "task_abc123"
}
```

`status` ∈ `"idle" | "thinking" | "talking"`. `taskId` is present when the
status change is tied to a task (always true in S1).

### `agent.answer`
Published when the Brain (Claude) returns text. Carries the answer and, if
available, token usage.

```json
{
  "type": "agent.answer",
  "id": "evt_...",
  "timestamp": "2026-06-11T10:00:21.000Z",
  "correlationId": "task_abc123",
  "agentId": "apollo",
  "taskId": "task_abc123",
  "text": "Clear skies over Olympus, Boss.",
  "usage": {
    "inputTokens": 412,
    "outputTokens": 18,
    "cacheCreationInputTokens": 0,
    "cacheReadInputTokens": 0,
    "totalCostUsd": 0.0051
  }
}
```

### `task.completed`
Published when a task finishes successfully (after `agent.answer`).

```json
{
  "type": "task.completed",
  "id": "evt_...",
  "timestamp": "2026-06-11T10:00:21.050Z",
  "correlationId": "task_abc123",
  "taskId": "task_abc123",
  "agentId": "apollo",
  "output": "Clear skies over Olympus, Boss."
}
```

### `task.failed`
Published if the Brain call errors (non-zero exit, malformed JSON, etc).

```json
{
  "type": "task.failed",
  "id": "evt_...",
  "timestamp": "2026-06-11T10:00:05.000Z",
  "correlationId": "task_abc123",
  "taskId": "task_abc123",
  "agentId": "apollo",
  "error": "claude -p exited with code 1: ..."
}
```

## Typical sequence for one Boss command

```
task.created              (status stays idle momentarily)
agent.status_changed       status: thinking
agent.answer                text + usage
agent.status_changed       status: talking
task.completed
agent.status_changed       status: idle
```

## Extension policy

This union is **additive only**. New event types (e.g. `task.delegated`,
`discussion.*`, `budget.*`, `routine.*` in later slices) are added as new
branches of `OlympusEvent`. Existing branches are never repurposed —
consumers that `switch` exhaustively on `event.type` will get a compile
error when a new branch is added, which is the intended forcing function.

## Decisions

- `correlationId` and `taskId` remain distinct fields, with S1 setting
  `correlationId === taskId`. No breaking change needed for future
  delegation/discussion slices.
