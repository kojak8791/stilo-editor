/** A handler for an event payload. */
export type EventHandler<T> = (payload: T) => void;

/**
 * Minimal typed event emitter.
 *
 * - `on` registers a handler; registering the same handler twice for the same event has no
 *   additional effect.
 * - `off` removes a handler; removing an unknown handler is a no-op.
 * - `emit` calls the handlers of the event in registration order. Handlers added or removed
 *   during an `emit` do not affect the current emit.
 * - `clear` removes all handlers of all events.
 */
export class EventEmitter<Events extends object> {
  private handlers: { [E in keyof Events]?: Set<EventHandler<Events[E]>> } = {};

  on<E extends keyof Events>(event: E, handler: EventHandler<Events[E]>): void {
    let handlers = this.handlers[event];
    if (!handlers) {
      handlers = new Set();
      this.handlers[event] = handlers;
    }
    handlers.add(handler);
  }

  off<E extends keyof Events>(event: E, handler: EventHandler<Events[E]>): void {
    this.handlers[event]?.delete(handler);
  }

  emit<E extends keyof Events>(event: E, payload: Events[E]): void {
    for (const handler of [...(this.handlers[event] ?? [])]) handler(payload);
  }

  clear(): void {
    this.handlers = {};
  }
}
