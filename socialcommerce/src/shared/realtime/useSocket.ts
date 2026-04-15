import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { socketManager, type SocketStatus } from './SocketManager';

/**
 * Subscribe to live socket status (connected / reconnecting / etc.)
 */
export function useSocketStatus(): SocketStatus {
  return useSyncExternalStore(
    (cb) => socketManager.onStatusChange(cb),
    () => socketManager.getStatus()
  );
}

/**
 * Subscribe to a specific topic + event channel.
 * The handler is stable — wrap in useCallback at the call site if needed.
 */
export function useChannel<T = unknown>(
  topic: string,
  event: string,
  handler: (payload: T) => void
): void {
  useEffect(() => {
    const unsubscribe = socketManager.subscribe(topic, event, handler as (p: unknown) => void);
    return unsubscribe;
  }, [topic, event, handler]);
}

/**
 * Returns a stable `send` helper scoped to a topic.
 */
export function useSocket(topic: string) {
  const send = useCallback(
    (event: string, payload: unknown) => socketManager.send(topic, event, payload),
    [topic]
  );
  const status = useSocketStatus();
  return { send, status };
}

/**
 * Convenience hook: subscribe to presence updates.
 */
export function usePresence(onUpdate: (userId: string, presence: string) => void): void {
  const stableHandler = useCallback(
    (payload: unknown) => {
      const p = payload as { userId: string; presence: string };
      onUpdate(p.userId, p.presence);
    },
    [onUpdate]
  );
  useChannel('presence', 'presence:update', stableHandler);
}
