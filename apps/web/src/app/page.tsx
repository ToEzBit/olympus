"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { toErrorMessage, type ServerMessage } from "@olympus/shared";
import { PhaserOffice } from "../phaser/PhaserOffice";
import { connectToEngine } from "../lib/ws-client";
import { initialOfficeState, reduceOfficeState, type OfficeState } from "../lib/agent-state-store";

const ENGINE_HTTP_URL = process.env.NEXT_PUBLIC_ENGINE_HTTP_URL ?? "http://localhost:3001";
const ENGINE_WS_URL = process.env.NEXT_PUBLIC_ENGINE_WS_URL ?? "ws://localhost:3002";

export default function Home() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [agentId, setAgentId] = useState("");

  const stateRef = useRef<OfficeState>(initialOfficeState);
  const getState = useCallback(() => stateRef.current, []);

  useEffect(() => {
    const disconnect = connectToEngine(ENGINE_WS_URL, (message: ServerMessage) => {
      stateRef.current = reduceOfficeState(stateRef.current, message);

      if (message.channel === "snapshot") {
        const snapshotAgents = message.agents.map((agent) => ({ id: agent.agentId, name: agent.name }));
        setAgents(snapshotAgents);
        setAgentId((current) => current || snapshotAgents[0]?.id || "");
      }
    });

    return disconnect;
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || !agentId) return;

    setStatus("sending...");
    try {
      const res = await fetch(`${ENGINE_HTTP_URL}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, text }),
      });

      const body = (await res.json().catch(() => ({}))) as { taskId?: string; error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      setStatus(`sent (task ${body.taskId})`);
      setText("");
    } catch (err) {
      setStatus(`error: ${toErrorMessage(err)}`);
    }
  }

  return (
    <main style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
      <h1>Olympus — Office</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, width: "100%", maxWidth: 800 }}>
        <select value={agentId} onChange={(e) => setAgentId(e.target.value)} style={{ padding: 8, fontSize: 16 }}>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell the agent what to do..."
          style={{ flex: 1, padding: 8, fontSize: 16 }}
        />
        <button type="submit" style={{ padding: "8px 16px", fontSize: 16 }}>
          Send
        </button>
      </form>

      {status && <p style={{ opacity: 0.7 }}>{status}</p>}

      <PhaserOffice getState={getState} />
    </main>
  );
}
