import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from './events';

interface TestEvents {
  ping: number;
  pong: string;
}

describe('EventEmitter', () => {
  it('calls the handlers of an event in registration order with the payload', () => {
    const emitter = new EventEmitter<TestEvents>();
    const calls: string[] = [];
    emitter.on('ping', (n) => calls.push(`a${n}`));
    emitter.on('ping', (n) => calls.push(`b${n}`));
    emitter.on('pong', (s) => calls.push(`c${s}`));
    emitter.emit('ping', 1);
    expect(calls).toEqual(['a1', 'b1']);
  });

  it('registers the same handler only once', () => {
    const emitter = new EventEmitter<TestEvents>();
    const handler = vi.fn();
    emitter.on('ping', handler);
    emitter.on('ping', handler);
    emitter.emit('ping', 1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('removes a handler with off, and ignores unknown handlers', () => {
    const emitter = new EventEmitter<TestEvents>();
    const handler = vi.fn();
    emitter.on('ping', handler);
    emitter.off('ping', handler);
    emitter.off('pong', vi.fn());
    emitter.emit('ping', 1);
    expect(handler).not.toHaveBeenCalled();
  });

  it('is not affected by handlers added or removed during an emit', () => {
    const emitter = new EventEmitter<TestEvents>();
    const late = vi.fn();
    const removed = vi.fn();
    emitter.on('ping', () => {
      emitter.on('ping', late);
      emitter.off('ping', removed);
    });
    emitter.on('ping', removed);
    emitter.emit('ping', 1);
    expect(late).not.toHaveBeenCalled();
    expect(removed).toHaveBeenCalledTimes(1);
    emitter.emit('ping', 2);
    expect(late).toHaveBeenCalledTimes(1);
    expect(removed).toHaveBeenCalledTimes(1);
  });

  it('removes all handlers with clear', () => {
    const emitter = new EventEmitter<TestEvents>();
    const handler = vi.fn();
    emitter.on('ping', handler);
    emitter.on('pong', handler);
    emitter.clear();
    emitter.emit('ping', 1);
    emitter.emit('pong', 'x');
    expect(handler).not.toHaveBeenCalled();
  });
});
