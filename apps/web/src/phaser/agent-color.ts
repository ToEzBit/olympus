/**
 * Per-agent identity color, independent of `AgentVisualState.status`.
 *
 * Pure + zero Phaser import (see constants.ts) so it can be unit tested and
 * reused outside the renderer. Deterministic hash of `agentId` into a fixed
 * palette — gives each agent a stable "character" color without any change
 * to the Persona/AgentConfig schema.
 */
const AGENT_COLOR_PALETTE: readonly number[] = [
  0xe6c34f, // gold
  0x9b6bdf, // violet
  0x4fd1c5, // teal
  0xff7a59, // coral
  0x6bdf7a, // green
  0xdf6b9b, // pink
];

export function colorForAgent(agentId: string): number {
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) {
    hash = (hash * 31 + agentId.charCodeAt(i)) >>> 0;
  }
  return AGENT_COLOR_PALETTE[hash % AGENT_COLOR_PALETTE.length];
}
