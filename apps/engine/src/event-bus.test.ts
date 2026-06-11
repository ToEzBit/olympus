import { describe, expect, it } from "vitest";
import type { TaskCompletedEvent, TaskCreatedEvent } from "@olympus/shared";
import { EventBus } from "./event-bus.js";

function taskCreated(correlationId: string, taskId: string): TaskCreatedEvent {
  return {
    type: "task.created",
    id: `evt_${taskId}_created`,
    timestamp: new Date().toISOString(),
    correlationId,
    taskId,
    agentId: "apollo",
    origin: "boss",
    input: "hello",
  };
}

function taskCompleted(correlationId: string, taskId: string, output: string): TaskCompletedEvent {
  return {
    type: "task.completed",
    id: `evt_${taskId}_completed`,
    timestamp: new Date().toISOString(),
    correlationId,
    taskId,
    agentId: "apollo",
    output,
  };
}

describe("EventBus", () => {
  it("request() resolves with the event matching correlationId + type", async () => {
    const bus = new EventBus();

    const result = bus.request<TaskCompletedEvent>(
      taskCreated("task_1", "task_1"),
      "task.completed",
    );

    // Simulate the async work completing and publishing the return event.
    bus.publish(taskCompleted("task_1", "task_1", "the answer"));

    await expect(result).resolves.toMatchObject({
      type: "task.completed",
      taskId: "task_1",
      output: "the answer",
    });
  });

  it("resolves concurrent requests independently by correlationId, with no cross-talk", async () => {
    const bus = new EventBus();

    const resultA = bus.request<TaskCompletedEvent>(taskCreated("task_a", "task_a"), "task.completed");
    const resultB = bus.request<TaskCompletedEvent>(taskCreated("task_b", "task_b"), "task.completed");

    // Publish B's answer first, then A's — order should not matter.
    bus.publish(taskCompleted("task_b", "task_b", "answer B"));
    bus.publish(taskCompleted("task_a", "task_a", "answer A"));

    const [a, b] = await Promise.all([resultA, resultB]);

    expect(a.taskId).toBe("task_a");
    expect(a.output).toBe("answer A");
    expect(b.taskId).toBe("task_b");
    expect(b.output).toBe("answer B");
  });

  it("rejects after timeout if no matching event is published", async () => {
    const bus = new EventBus();

    const result = bus.request<TaskCompletedEvent>(
      taskCreated("task_timeout", "task_timeout"),
      "task.completed",
      20,
    );

    await expect(result).rejects.toThrow(/timeout/i);
  });

  it("fans out every published event to all subscribers", () => {
    const bus = new EventBus();
    const seenA: string[] = [];
    const seenB: string[] = [];

    bus.subscribe((event) => seenA.push(event.type));
    bus.subscribe((event) => seenB.push(event.type));

    bus.publish(taskCreated("task_1", "task_1"));
    bus.publish(taskCompleted("task_1", "task_1", "done"));

    expect(seenA).toEqual(["task.created", "task.completed"]);
    expect(seenB).toEqual(["task.created", "task.completed"]);
  });
});
