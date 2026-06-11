import type { CreateTaskInput, Task, TaskStatus, TaskStore, TaskUpdate } from "@olympus/shared";

/**
 * In-memory TaskStore (S1). Replaced by a durable SQLite-backed
 * implementation in S6 (issue #7) without changing the TaskStore interface.
 */
export class InMemoryTaskStore implements TaskStore {
  private tasks = new Map<string, Task>();

  async create(input: CreateTaskInput): Promise<Task> {
    const now = new Date().toISOString();
    const task: Task = {
      id: crypto.randomUUID(),
      agentId: input.agentId,
      input: input.input,
      status: "pending",
      correlationId: input.correlationId,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async get(taskId: string): Promise<Task | undefined> {
    return this.tasks.get(taskId);
  }

  async update(taskId: string, patch: TaskUpdate): Promise<Task> {
    const existing = this.tasks.get(taskId);
    if (!existing) {
      throw new Error(`InMemoryTaskStore: task not found: ${taskId}`);
    }
    const updated: Task = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(taskId, updated);
    return updated;
  }

  async list(filter?: { agentId?: string; status?: TaskStatus }): Promise<Task[]> {
    let results = [...this.tasks.values()];
    if (filter?.agentId) {
      results = results.filter((t) => t.agentId === filter.agentId);
    }
    if (filter?.status) {
      results = results.filter((t) => t.status === filter.status);
    }
    return results;
  }
}
