/**
 * In-memory fake SocketManager for use in Vitest tests.
 *
 * Usage:
 *   import { fakeSocketManager, emitFake } from '../../../test/fakeSocketManager';
 *
 *   vi.mock('../../../shared/realtime/SocketManager', () => ({
 *     socketManager: fakeSocketManager,
 *   }));
 *
 *   // Then in a test, fire a real-time event:
 *   emitFake('theater:abc', 'theater:status', { status: 'live' });
 */

type MessageHandler = (payload: unknown) => void;

class FakeSocketManager {
  private handlers = new Map<string, Set<MessageHandler>>();
  private _status: 'connected' | 'disconnected' = 'connected';
  private statusListeners = new Set<() => void>();

  subscribe(topic: string, event: string, handler: MessageHandler): () => void {
    const key = `${topic}::${event}`;
    if (!this.handlers.has(key)) this.handlers.set(key, new Set());
    this.handlers.get(key)!.add(handler);
    return () => this.handlers.get(key)?.delete(handler);
  }

  unsubscribe(topic: string, event: string, handler: MessageHandler): void {
    this.handlers.get(`${topic}::${event}`)?.delete(handler);
  }

  /** Fire a fake incoming event, just like the real hub would push. */
  emit(topic: string, event: string, payload: unknown): void {
    const key = `${topic}::${event}`;
    this.handlers.get(key)?.forEach((h) => h(payload));
  }

  send(_topic: string, _event: string, _payload: unknown): void {
    // no-op in tests — assert via side effects on store/UI
  }

  connect(_url: string): void {
    this._status = 'connected';
    this.statusListeners.forEach((l) => l());
  }

  disconnect(): void {
    this._status = 'disconnected';
    this.statusListeners.forEach((l) => l());
  }

  getStatus() {
    return this._status;
  }

  onStatusChange(listener: () => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  /** Clear all registered handlers between tests. */
  reset(): void {
    this.handlers.clear();
    this.statusListeners.clear();
    this._status = 'connected';
  }
}

export const fakeSocketManager = new FakeSocketManager();

/**
 * Convenience helper: emit an event on the fake manager from inside a test.
 * @example emitFake('theater:thtr-1', 'theater:status', { status: 'live' });
 */
export function emitFake(topic: string, event: string, payload: unknown): void {
  fakeSocketManager.emit(topic, event, payload);
}
