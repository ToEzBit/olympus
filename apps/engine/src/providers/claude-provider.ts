import { spawn } from "node:child_process";
import type { ModelProvider, ModelResponse } from "@olympus/shared";

interface ClaudeJsonResult {
  type: string;
  subtype: string;
  is_error: boolean;
  result?: string;
  total_cost_usd?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

/**
 * ModelProvider backed by `claude -p` (per ADR-0002 / docs/notes/cli-backend-flags.md).
 *
 * Squeezed to "prompt in -> text out": persona via --system-prompt, all
 * built-in tools disabled via --tools "", JSON output for text + token
 * usage. Deliberately does NOT use --bare, which would force
 * ANTHROPIC_API_KEY auth and break subscription OAuth (the whole point of
 * ADR-0002) — --exclude-dynamic-system-prompt-sections is used instead to
 * get an equivalent "neutral" run while keeping subscription auth.
 */
export class ClaudeProvider implements ModelProvider {
  async generate({ systemPrompt, prompt }: { systemPrompt: string; prompt: string }): Promise<ModelResponse> {
    const args = [
      "-p",
      "--output-format",
      "json",
      "--system-prompt",
      systemPrompt,
      "--tools",
      "",
      "--exclude-dynamic-system-prompt-sections",
      "--no-session-persistence",
    ];

    const { stdout, stderr, exitCode } = await runClaude(args, prompt);

    if (exitCode !== 0) {
      throw new Error(`claude -p exited with code ${exitCode}: ${stderr.trim()}`);
    }

    let parsed: ClaudeJsonResult;
    try {
      parsed = JSON.parse(stdout);
    } catch (err) {
      throw new Error(
        `Failed to parse claude JSON output: ${(err as Error).message}\nstdout: ${stdout.slice(0, 500)}`,
      );
    }

    if (parsed.is_error || parsed.subtype !== "success") {
      throw new Error(`claude returned error (${parsed.subtype ?? "unknown"}): ${parsed.result ?? stderr}`);
    }

    return {
      text: parsed.result ?? "",
      usage: {
        inputTokens: parsed.usage?.input_tokens ?? 0,
        outputTokens: parsed.usage?.output_tokens ?? 0,
        cacheCreationInputTokens: parsed.usage?.cache_creation_input_tokens,
        cacheReadInputTokens: parsed.usage?.cache_read_input_tokens,
        totalCostUsd: parsed.total_cost_usd,
      },
    };
  }
}

function runClaude(args: string[], stdin: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn("claude", args, { stdio: ["pipe", "pipe", "pipe"] });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk) => stderrChunks.push(chunk));

    child.on("error", reject);
    child.on("close", (code) =>
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        exitCode: code ?? -1,
      }),
    );

    child.stdin.write(stdin);
    child.stdin.end();
  });
}
