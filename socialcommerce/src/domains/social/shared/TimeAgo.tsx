import React, { useSyncExternalStore } from 'react';

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(mo / 12)}y`;
}

// Single shared tick that all TimeAgo instances subscribe to
let tick = 0;
const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (listeners.size === 1) {
    intervalId = setInterval(() => {
      tick++;
      listeners.forEach((fn) => fn());
    }, 60_000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function getSnapshot() {
  return tick;
}

interface TimeAgoProps {
  date: Date;
}

export const TimeAgo: React.FC<TimeAgoProps> = React.memo(({ date }) => {
  useSyncExternalStore(subscribe, getSnapshot);

  return (
    <time
      dateTime={date.toISOString()}
      title={date.toLocaleString()}
      style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}
    >
      {formatTimeAgo(date)}
    </time>
  );
});
