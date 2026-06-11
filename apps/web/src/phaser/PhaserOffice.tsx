"use client";

import { useEffect, useRef } from "react";
import type { Game } from "phaser";
import type { ServerMessage } from "@olympus/shared";
import { connectToEngine } from "../lib/ws-client";
import { initialOfficeState, reduceOfficeState, type OfficeState } from "../lib/agent-state-store";
import { OFFICE_SCENE_SIZE } from "./constants";

export function PhaserOffice({ wsUrl }: { wsUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<OfficeState>(initialOfficeState);

  useEffect(() => {
    let game: Game | undefined;
    let disposed = false;

    // Dynamic import: Phaser touches `window` at module scope, so it must
    // not be imported during Next.js server-side rendering.
    void import("./mount").then(({ mountOffice }) => {
      if (disposed || !containerRef.current) return;
      game = mountOffice(containerRef.current, () => stateRef.current);
    });

    const disconnect = connectToEngine(wsUrl, (message: ServerMessage) => {
      stateRef.current = reduceOfficeState(stateRef.current, message);
    });

    return () => {
      disposed = true;
      disconnect();
      game?.destroy(true);
    };
  }, [wsUrl]);

  return <div ref={containerRef} style={{ width: OFFICE_SCENE_SIZE.width, height: OFFICE_SCENE_SIZE.height }} />;
}
