import { createServer, type IncomingMessage, type Server } from "node:http";
import { toErrorMessage } from "@olympus/shared";
import type { AgentRuntime } from "./agent-runtime.js";

/**
 * Boss command endpoint (per docs/contracts/0002-websocket-protocol.md):
 *
 *   POST /command  { agentId, text }  ->  202 { taskId, correlationId }
 *
 * Returns immediately after task.created + agent.status_changed(thinking)
 * are published — the answer streams back over WS.
 */
export function startHttpServer(port: number, runtime: AgentRuntime): Server {
  const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "POST" && req.url === "/command") {
      try {
        const body = (await readJsonBody(req)) as { agentId?: unknown; text?: unknown };
        if (typeof body.agentId !== "string" || typeof body.text !== "string" || !body.text.trim()) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "agentId and text (non-empty string) are required" }));
          return;
        }

        const result = await runtime.submitCommand(body.agentId, body.text);
        res.writeHead(202, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        const message = toErrorMessage(err);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
      }
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });

  server.listen(port);
  return server;
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}
