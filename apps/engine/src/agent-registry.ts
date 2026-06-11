import type { AgentConfig } from "@olympus/shared";

/**
 * Lookup service for seeded AgentConfigs (S1: seeded once at engine start,
 * no runtime registration).
 */
export class AgentRegistry {
  private agents: Map<string, AgentConfig>;

  constructor(seed: AgentConfig[]) {
    this.agents = new Map(seed.map((agent) => [agent.id, agent]));
  }

  get(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId);
  }

  list(): AgentConfig[] {
    return [...this.agents.values()];
  }
}
