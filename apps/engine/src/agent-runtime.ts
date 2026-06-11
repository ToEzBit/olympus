import { createEvent, toErrorMessage, type AgentConfig, type AgentStatus, type ModelProvider, type OlympusEvent, type TaskStore } from "@olympus/shared";
import type { EventBus } from "./event-bus.js";
import type { AgentRegistry } from "./agent-registry.js";

export interface AgentRuntimeDeps {
  bus: EventBus;
  registry: AgentRegistry;
  taskStore: TaskStore;
  /** ModelProvider per backend, e.g. { claude: new ClaudeProvider() }. */
  providers: Partial<Record<AgentConfig["brain"]["backend"], ModelProvider>>;
}

export interface SubmitCommandResult {
  taskId: string;
  correlationId: string;
}

/**
 * Wires AgentRegistry + EventBus + TaskStore + ModelProvider together.
 *
 * submitCommand() is the entry point for the HTTP POST /command handler:
 * it creates the task, publishes task.created + agent.status_changed
 * (thinking) synchronously, then runs the Brain call asynchronously
 * (fire-and-forget from the HTTP handler's perspective) — the answer
 * streams back over the EventBus/WS, correlated by correlationId.
 */
export class AgentRuntime {
  constructor(private readonly deps: AgentRuntimeDeps) {}

  async submitCommand(agentId: string, text: string): Promise<SubmitCommandResult> {
    const agent = this.deps.registry.get(agentId);
    if (!agent) {
      throw new Error(`Unknown agent: ${agentId}`);
    }

    const correlationId = crypto.randomUUID();
    const task = await this.deps.taskStore.create({ agentId, input: text, correlationId });

    this.publish(
      createEvent<Extract<OlympusEvent, { type: "task.created" }>>({
        type: "task.created",
        correlationId,
        taskId: task.id,
        agentId,
        origin: "boss",
        input: text,
      }),
    );

    this.publishStatus(agentId, "thinking", correlationId, task.id);

    void this.runTask(agent, task.id, correlationId, text);

    return { taskId: task.id, correlationId };
  }

  private async runTask(agent: AgentConfig, taskId: string, correlationId: string, input: string): Promise<void> {
    try {
      const provider = this.deps.providers[agent.brain.backend];
      if (!provider) {
        throw new Error(`No ModelProvider registered for backend: ${agent.brain.backend}`);
      }

      await this.deps.taskStore.update(taskId, { status: "in_progress" });

      const response = await provider.generate({
        systemPrompt: agent.persona.systemPrompt,
        prompt: input,
      });

      await this.deps.taskStore.update(taskId, { status: "completed", output: response.text });

      this.publish(
        createEvent<Extract<OlympusEvent, { type: "agent.answer" }>>({
          type: "agent.answer",
          correlationId,
          agentId: agent.id,
          taskId,
          text: response.text,
          usage: response.usage,
        }),
      );

      this.publishStatus(agent.id, "talking", correlationId, taskId);

      this.publish(
        createEvent<Extract<OlympusEvent, { type: "task.completed" }>>({
          type: "task.completed",
          correlationId,
          taskId,
          agentId: agent.id,
          output: response.text,
        }),
      );

      this.publishStatus(agent.id, "idle", correlationId, taskId);
    } catch (err) {
      const message = toErrorMessage(err);
      await this.deps.taskStore.update(taskId, { status: "failed", error: message });

      this.publish(
        createEvent<Extract<OlympusEvent, { type: "task.failed" }>>({
          type: "task.failed",
          correlationId,
          taskId,
          agentId: agent.id,
          error: message,
        }),
      );

      this.publishStatus(agent.id, "idle", correlationId, taskId);
    }
  }

  private publishStatus(agentId: string, status: AgentStatus, correlationId: string, taskId: string): void {
    this.publish(
      createEvent<Extract<OlympusEvent, { type: "agent.status_changed" }>>({
        type: "agent.status_changed",
        correlationId,
        agentId,
        status,
        taskId,
      }),
    );
  }

  private publish(event: OlympusEvent): void {
    this.deps.bus.publish(event);
  }
}
