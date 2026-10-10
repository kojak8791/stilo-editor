import { notImplemented } from './errors';

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
  on<E extends keyof Events>(_event: E, _handler: EventHandler<Events[E]>): void {
    notImplemented('EventEmitter.on');
  }

  off<E extends keyof Events>(_event: E, _handler: EventHandler<Events[E]>): void {
    notImplemented('EventEmitter.off');
  }

  emit<E extends keyof Events>(_event: E, _payload: Events[E]): void {
    notImplemented('EventEmitter.emit');
  }

  clear(): void {
    notImplemented('EventEmitter.clear');
  }
}
