/**
 * TaskStore interface.
 *
 * Async-first by design: S1 ships an in-memory implementation, but the
 * signature must not change when S6 swaps in a durable SQLite-backed
 * implementation.
 */

export type TaskStatus = "pending" | "in_progress" | "completed" | "failed";

export interface Task {
  id: string;
  agentId: string;
  input: string;
  status: TaskStatus;
  output?: string;
  error?: string;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  agentId: string;
  input: string;
  correlationId: string;
}

export type TaskUpdate = Partial<Pick<Task, "status" | "output" | "error">>;

export interface TaskStore {
  create(input: CreateTaskInput): Promise<Task>;
  get(taskId: string): Promise<Task | undefined>;
  update(taskId: string, patch: TaskUpdate): Promise<Task>;
  list(filter?: { agentId?: string; status?: TaskStatus }): Promise<Task[]>;
}
