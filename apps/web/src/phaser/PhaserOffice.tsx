"use client";

import { useEffect, useRef } from "react";
import type { Game } from "phaser";
import type { OfficeState } from "../lib/agent-state-store";
import { OFFICE_SCENE_SIZE } from "./constants";

export function PhaserOffice({ getState }: { getState: () => OfficeState }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: Game | undefined;
    let disposed = false;

    // Dynamic import: Phaser touches `window` at module scope, so it must
    // not be imported during Next.js server-side rendering.
    void import("./mount").then(({ mountOffice }) => {
      if (disposed || !containerRef.current) return;
      game = mountOffice(containerRef.current, getState);
    });

    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, [getState]);

  return <div ref={containerRef} style={{ width: OFFICE_SCENE_SIZE.width, height: OFFICE_SCENE_SIZE.height }} />;
}
