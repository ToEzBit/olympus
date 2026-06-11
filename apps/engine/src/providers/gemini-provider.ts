import { spawn } from "node:child_process";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ModelProvider, ModelResponse, ModelUsage } from "@olympus/shared";

/** apps/engine — cwd pinned here so `gemini`'s workspace context is deterministic regardless of process cwd. */
const ENGINE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const RATE_LIMIT_PATTERN = /resource_exhausted|rate.?limit|quota|429/i;

interface GeminiTokenStats {
  input?: number;
  candidates?: number;
  thoughts?: number;
  cached?: number;
}

interface GeminiModelStats {
  tokens?: GeminiTokenStats;
}

interface GeminiJsonResult {
  response?: string;
  error?: { message?: string; type?: string };
  stats?: {
    models?: Record<string, GeminiModelStats>;
  };
}

/**
 * ModelProvider backed by `gemini -p` (per ADR-0002 / docs/notes/cli-backend-flags.md).
 *
 * Squeezed to "prompt in -> text out": persona via GEMINI_SYSTEM_MD (a temp
 * file written per call), JSON output for text + token usage. --skip-trust
 * is required for headless runs — not documented in cli-backend-flags.md,
 * found while verifying this provider against the real CLI.
 *
 * Tool restriction deviates from cli-backend-flags.md: `settings.json`
 * `tools.core: []` makes gemini-cli 0.46.0 send `tools: [{functionDeclarations: []}]`,
 * which the API rejects with a 400 ("tools[0].tool_type ... must have one
 * initialized field") — every call fails. `--approval-mode plan` is used
 * instead: read-only tools stay registered (avoiding the empty-array bug)
 * but write/exec tools are disabled at the policy layer, and in practice the
 * model answers directly without calling any tool (verified: `tools.totalCalls: 0`).
 */
export class GeminiProvider implements ModelProvider {
  async generate({ systemPrompt, prompt }: { systemPrompt: string; prompt: string }): Promise<ModelResponse> {
    const systemPromptFile = join(tmpdir(), `olympus-gemini-system-${crypto.randomUUID()}.md`);
    await writeFile(systemPromptFile, systemPrompt, "utf8");

    try {
      const args = ["-p", prompt, "--output-format", "json", "--skip-trust", "--approval-mode", "plan"];
      const { stdout, stderr, exitCode } = await runGemini(args, systemPromptFile);

      if (exitCode !== 0) {
        throw new Error(annotateRateLimit(`gemini -p exited with code ${exitCode}: ${(stderr || stdout).trim()}`));
      }

      let parsed: GeminiJsonResult;
      try {
        parsed = JSON.parse(stdout);
      } catch (err) {
        throw new Error(
          `Failed to parse gemini JSON output: ${(err as Error).message}\nstdout: ${stdout.slice(0, 500)}`,
        );
      }

      if (parsed.error || typeof parsed.response !== "string") {
        const message = parsed.error?.message ?? (stderr.trim() || "gemini returned no response");
        throw new Error(annotateRateLimit(message));
      }

      return {
        text: parsed.response,
        usage: sumGeminiUsage(parsed.stats),
      };
    } finally {
      await unlink(systemPromptFile).catch(() => {});
    }
  }
}

/** Sums token usage across every model gemini -p reports in `.stats.models` (it routes through more than one). */
export function sumGeminiUsage(stats: GeminiJsonResult["stats"]): ModelUsage {
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadInputTokens = 0;

  for (const model of Object.values(stats?.models ?? {})) {
    const tokens = model.tokens ?? {};
    inputTokens += tokens.input ?? 0;
    outputTokens += (tokens.candidates ?? 0) + (tokens.thoughts ?? 0);
    cacheReadInputTokens += tokens.cached ?? 0;
  }

  return {
    inputTokens,
    outputTokens,
    cacheReadInputTokens: cacheReadInputTokens || undefined,
  };
}

function annotateRateLimit(message: string): string {
  return RATE_LIMIT_PATTERN.test(message) ? `[rate-limit] ${message}` : message;
}

function runGemini(
  args: string[],
  systemPromptFile: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn("gemini", args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: ENGINE_ROOT,
      env: { ...process.env, GEMINI_SYSTEM_MD: systemPromptFile },
    });

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
  });
}
