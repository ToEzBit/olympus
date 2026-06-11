# Contract 0004 — TaskStore interface

**Status:** accepted
**Source of truth:** `packages/shared/src/task-store.ts`

## Purpose

`TaskStore` is the persistence boundary for Tasks. S1 ships an **in-memory**
implementation (`apps/engine/src/task-store/in-memory-task-store.ts`). S6
(issue #7) replaces it with a durable SQLite-backed implementation —
**without changing this interface**, which is why every method is async from
the start.

## Types

```typescript
type TaskStatus = "pending" | "in_progress" | "completed" | "failed";

interface Task {
  id: string;
  agentId: string;
  input: string;
  status: TaskStatus;
  output?: string;
  error?: string;
  correlationId: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

interface CreateTaskInput {
  agentId: string;
  input: string;
  correlationId: string;
}

type TaskUpdate = Partial<Pick<Task, "status" | "output" | "error">>;

interface TaskStore {
  create(input: CreateTaskInput): Promise<Task>;
  get(taskId: string): Promise<Task | undefined>;
  update(taskId: string, patch: TaskUpdate): Promise<Task>;
  list(filter?: { agentId?: string; status?: TaskStatus }): Promise<Task[]>;
}
```

## Lifecycle (S1)

1. `create()` — called when `POST /command` is received. Status starts at
   `"pending"`, immediately moved to `"in_progress"` (or `create()` could
   accept an initial status — S1 sets it directly via a follow-up `update()`
   for clarity).
2. `update(taskId, { status: "in_progress" })` — when the Brain call starts.
3. On success: `update(taskId, { status: "completed", output })`.
4. On failure: `update(taskId, { status: "failed", error })`.

`updatedAt` is refreshed by the implementation on every `update()` call;
callers do not set it directly.

## In-memory implementation notes (S1)

- Backed by a `Map<string, Task>`.
- `id` generated via `crypto.randomUUID()`.
- No persistence across Engine restarts — acceptable for S1 (durable queue
  is explicitly S6 / issue #7, per ADR-0002).

## Relationship to EventBus

The Engine publishes `OlympusEvent`s (`task.created`, `task.completed`,
`task.failed`) on the EventBus **and** calls the corresponding `TaskStore`
methods directly from `agent-runtime.ts` — the TaskStore is not driven by
subscribing to the bus. This avoids ordering ambiguity between "is the task
record updated yet" and "has the event been broadcast yet". Future slices
may revisit this if TaskStore needs to react to events it doesn't originate
(e.g. delegation).

## Decisions

- `list()` filter shape (`agentId` / `status`) confirmed as sufficient for
  S1 and realistic for S6's query needs.
