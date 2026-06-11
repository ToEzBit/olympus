/**
 * Shared constants with zero Phaser import — Phaser touches `window` at
 * module-evaluation time, so anything imported by PhaserOffice.tsx at the
 * top level (i.e. not behind the dynamic `import("./mount")`) must not
 * transitively import "phaser", or SSR breaks with "window is not defined".
 */
export const OFFICE_SCENE_SIZE = { width: 800, height: 600 };
