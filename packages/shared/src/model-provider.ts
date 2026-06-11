/**
 * ModelProvider interface (per ADR-0002).
 *
 * A ModelProvider is squeezed down to "prompt in -> text out": no tool
 * calls, no multi-turn state, no agentic behavior of its own. v1
 * implements ClaudeProvider only (apps/engine/src/providers/claude-provider.ts).
 */

import type { ModelUsage } from "./events.js";

export type { ModelUsage };

export interface ModelResponse {
  text: string;
  usage: ModelUsage;
}

export interface ModelProvider {
  generate(params: { systemPrompt: string; prompt: string }): Promise<ModelResponse>;
}
