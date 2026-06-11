/**
 * Agent / Persona / AgentRegistry config types.
 *
 * v1 has no UI for creating agents — AgentRegistry is seeded from a static
 * config array at engine start (see apps/engine/src/agents.config.ts).
 */

export interface Persona {
  /** Display name, e.g. "Apollo". */
  name: string;
  /** Short description shown in the UI. */
  tone: string;
  /** Compiled system prompt injected via --system-prompt. */
  systemPrompt: string;
}

/** S1: only "claude". S2 (issue #3) adds "gemini". */
export type ModelBackend = "claude";

export interface AgentConfig {
  /** Stable agent id, e.g. "apollo". */
  id: string;
  persona: Persona;
  brain: {
    backend: ModelBackend;
  };
}
