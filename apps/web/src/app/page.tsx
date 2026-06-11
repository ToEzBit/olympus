"use client";

import { useState, type FormEvent } from "react";
import { toErrorMessage } from "@olympus/shared";
import { PhaserOffice } from "../phaser/PhaserOffice";

const ENGINE_HTTP_URL = process.env.NEXT_PUBLIC_ENGINE_HTTP_URL ?? "http://localhost:3001";
const ENGINE_WS_URL = process.env.NEXT_PUBLIC_ENGINE_WS_URL ?? "ws://localhost:3002";

// S1: single seeded agent (see apps/engine/src/agents.config.ts).
const AGENT_ID = "apollo";

export default function Home() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;

    setStatus("sending...");
    try {
      const res = await fetch(`${ENGINE_HTTP_URL}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: AGENT_ID, text }),
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
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell Apollo what to do..."
          style={{ flex: 1, padding: 8, fontSize: 16 }}
        />
        <button type="submit" style={{ padding: "8px 16px", fontSize: 16 }}>
          Send
        </button>
      </form>

      {status && <p style={{ opacity: 0.7 }}>{status}</p>}

      <PhaserOffice wsUrl={ENGINE_WS_URL} />
    </main>
  );
}
