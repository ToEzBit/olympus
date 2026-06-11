import type { OlympusEvent, OlympusEventType } from "@olympus/shared";

type Listener = (event: OlympusEvent) => void;
type Unsubscribe = () => void;

interface PendingRequest {
  resolve: (event: OlympusEvent) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  matchType: OlympusEventType;
}

/**
 * In-process pub/sub bus for OlympusEvents, plus a request()/correlation-id
 * mechanism for call/return (ADR-0001): publish a "call" event and await a
 * future event sharing the same correlationId and a matching type.
 */
export class EventBus {
  private listeners = new Set<Listener>();
  private pending = new Map<string, PendingRequest>();

  subscribe(listener: Listener): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(event: OlympusEvent): void {
    const pending = this.pending.get(event.correlationId);
    if (pending && pending.matchType === event.type) {
      clearTimeout(pending.timer);
      this.pending.delete(event.correlationId);
      pending.resolve(event);
    }

    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /**
   * Publish `event`, then wait for a future event with the same
   * correlationId and type === waitForType. Rejects on timeout.
   */
  request<T extends OlympusEvent>(
    event: OlympusEvent,
    waitForType: T["type"],
    timeoutMs = 60_000,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(event.correlationId);
        reject(
          new Error(
            `EventBus.request timeout waiting for "${waitForType}" (correlationId=${event.correlationId})`,
          ),
        );
      }, timeoutMs);

      this.pending.set(event.correlationId, {
        resolve: resolve as (e: OlympusEvent) => void,
        reject,
        timer,
        matchType: waitForType,
      });

      this.publish(event);
    });
  }
}
