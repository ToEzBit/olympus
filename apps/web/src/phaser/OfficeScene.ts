import * as Phaser from "phaser";
import type { AgentVisualState, OfficeState } from "../lib/agent-state-store";
import { OFFICE_SCENE_SIZE } from "./constants";

const SCENE_WIDTH = OFFICE_SCENE_SIZE.width;
const SCENE_HEIGHT = OFFICE_SCENE_SIZE.height;
const WANDER_BOUNDS = { x: 80, y: 80, width: 640, height: 440 };
const WANDER_SPEED = 0.04; // px per ms

const STATUS_COLOR: Record<AgentVisualState["status"], number> = {
  idle: 0x4f8cff,
  thinking: 0xf5a623,
  talking: 0x4caf50,
};

interface AgentSprite {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Arc;
  speechBubbleBg: Phaser.GameObjects.Rectangle;
  speechText: Phaser.GameObjects.Text;
  target: { x: number; y: number };
  nextWanderAt: number;
  /** Last text rendered into speechText, so we only resize the bubble when it changes. */
  lastSpeechText?: string;
}

/**
 * Office view (per ADR-0003): pure renderer reflecting AgentVisualState read
 * from `getState()` every frame. Idle wandering is an internal timer/RNG
 * state machine that never touches the EventBus or the reducer — it is
 * ambient flavor only.
 */
export class OfficeScene extends Phaser.Scene {
  private sprites = new Map<string, AgentSprite>();

  constructor(private readonly getState: () => OfficeState) {
    super("OfficeScene");
  }

  create(): void {
    this.add.rectangle(SCENE_WIDTH / 2, SCENE_HEIGHT / 2, SCENE_WIDTH, SCENE_HEIGHT, 0x1b1f27);
    this.add
      .rectangle(
        WANDER_BOUNDS.x + WANDER_BOUNDS.width / 2,
        WANDER_BOUNDS.y + WANDER_BOUNDS.height / 2,
        WANDER_BOUNDS.width,
        WANDER_BOUNDS.height,
      )
      .setStrokeStyle(1, 0x2a3140);
  }

  update(time: number, delta: number): void {
    const state = this.getState();

    for (const agentState of Object.values(state)) {
      let sprite = this.sprites.get(agentState.agentId);
      if (!sprite) {
        sprite = this.createSprite(agentState);
        this.sprites.set(agentState.agentId, sprite);
      }
      this.updateSprite(sprite, agentState, time, delta);
    }
  }

  private createSprite(agentState: AgentVisualState): AgentSprite {
    const x = Phaser.Math.Between(WANDER_BOUNDS.x, WANDER_BOUNDS.x + WANDER_BOUNDS.width);
    const y = Phaser.Math.Between(WANDER_BOUNDS.y, WANDER_BOUNDS.y + WANDER_BOUNDS.height);

    const body = this.add.circle(0, 0, 20, STATUS_COLOR[agentState.status]);
    const nameLabel = this.add.text(0, 28, agentState.name, { fontSize: "14px", color: "#e6e6e6" }).setOrigin(0.5, 0);

    const speechText = this.add
      .text(0, -8, "", {
        fontSize: "12px",
        color: "#1b1f27",
        wordWrap: { width: 160 },
        align: "center",
      })
      .setOrigin(0.5, 1)
      .setPadding(6, 4, 6, 4);

    const bounds = speechText.getBounds();
    const speechBubbleBg = this.add
      .rectangle(0, -8, bounds.width + 12, bounds.height + 8, 0xffffff)
      .setOrigin(0.5, 1)
      .setVisible(false);
    speechText.setVisible(false);

    const container = this.add.container(x, y, [body, nameLabel, speechBubbleBg, speechText]);

    return {
      container,
      body,
      speechBubbleBg,
      speechText,
      target: { x, y },
      nextWanderAt: 0,
    };
  }

  private updateSprite(sprite: AgentSprite, agentState: AgentVisualState, time: number, delta: number): void {
    sprite.body.setFillStyle(STATUS_COLOR[agentState.status]);

    if (agentState.status === "talking" && agentState.speechText) {
      if (agentState.speechText !== sprite.lastSpeechText) {
        sprite.speechText.setText(agentState.speechText);
        const bounds = sprite.speechText.getBounds();
        sprite.speechBubbleBg.setSize(bounds.width + 4, bounds.height + 4);
        sprite.lastSpeechText = agentState.speechText;
      }
      sprite.speechText.setVisible(true);
      sprite.speechBubbleBg.setVisible(true);
      // Stop wandering while talking.
      sprite.target = { x: sprite.container.x, y: sprite.container.y };
    } else {
      sprite.speechText.setVisible(false);
      sprite.speechBubbleBg.setVisible(false);
    }

    if (agentState.status === "idle") {
      this.wander(sprite, time);
      this.stepTowardTarget(sprite, delta);
    } else {
      // thinking/talking: stand still at current position.
      sprite.target = { x: sprite.container.x, y: sprite.container.y };
    }
  }

  private wander(sprite: AgentSprite, time: number): void {
    if (time < sprite.nextWanderAt) return;

    sprite.target = {
      x: Phaser.Math.Between(WANDER_BOUNDS.x, WANDER_BOUNDS.x + WANDER_BOUNDS.width),
      y: Phaser.Math.Between(WANDER_BOUNDS.y, WANDER_BOUNDS.y + WANDER_BOUNDS.height),
    };
    sprite.nextWanderAt = time + Phaser.Math.Between(2000, 5000);
  }

  private stepTowardTarget(sprite: AgentSprite, delta: number): void {
    const dx = sprite.target.x - sprite.container.x;
    const dy = sprite.target.y - sprite.container.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;

    const step = Math.min(dist, WANDER_SPEED * delta);
    sprite.container.x += (dx / dist) * step;
    sprite.container.y += (dy / dist) * step;
  }
}
