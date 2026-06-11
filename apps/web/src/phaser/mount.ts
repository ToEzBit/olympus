import * as Phaser from "phaser";
import type { OfficeState } from "../lib/agent-state-store";
import { OFFICE_SCENE_SIZE } from "./constants";
import { OfficeScene } from "./OfficeScene";

/**
 * Imperative mount per ADR-0003: Phaser owns its own canvas inside `parent`,
 * polling `getState()` every frame. Caller is responsible for
 * `game.destroy(true)` on unmount.
 */
export function mountOffice(parent: HTMLElement, getState: () => OfficeState): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: OFFICE_SCENE_SIZE.width,
    height: OFFICE_SCENE_SIZE.height,
    backgroundColor: "#0f1115",
    scene: new OfficeScene(getState),
  });
}
