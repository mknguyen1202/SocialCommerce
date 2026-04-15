/**
 * Singleton WebSocket manager with channel multiplexing,
 * reconnection + exponential backoff.
 */

type MessageHandler = (payload: unknown) => void;

interface SocketMessage {
  topic: string;
  event: string;
  payload: unknown;
}

interface ChannelKey {
  topic: string;
  event: string;
}

const MAX_RECONNECT_DELAY_MS = 30_000;
const INITIAL_DELAY_MS = 1_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

type StatusListener = (status: SocketStatus) => void;

class SocketManager {
  private ws: WebSocket | null = null;
  private url = '';
  private handlers = new Map<string, Set<MessageHandler>>();
  private statusListeners = new Set<StatusListener>();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private intentionalClose = false;
  private status: SocketStatus = 'disconnected';

  connect(url: string): void {
    this.url = url;
    this.intentionalClose = false;
    this.openSocket();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.clearTimers();
    this.ws?.close();
    this.ws = null;
    this.setStatus('disconnected');
  }

  subscribe(topic: string, event: string, handler: MessageHandler): () => void {
    const key = this.channelKey({ topic, event });
    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set());
    }
    this.handlers.get(key)!.add(handler);
    return () => this.unsubscribe(topic, event, handler);
  }

  unsubscribe(topic: string, event: string, handler: MessageHandler): void {
    const key = this.channelKey({ topic, event });
    this.handlers.get(key)?.delete(handler);
  }

  send(topic: string, event: string, payload: unknown): void {
    const msg: SocketMessage = { topic, event, payload };
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn('[SocketManager] Cannot send — socket not open', msg);
    }
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  getStatus(): SocketStatus {
    return this.status;
  }

  private openSocket(): void {
    if (!this.url) return;
    this.setStatus(this.reconnectAttempt === 0 ? 'connecting' : 'reconnecting');

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.setStatus('connected');
      this.startHeartbeat();
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as SocketMessage;
        const key = this.channelKey({ topic: msg.topic, event: msg.event });
        this.handlers.get(key)?.forEach((h) => h(msg.payload));

        // Wildcard handlers subscribed with '*' event receive everything
        const wildcard = this.channelKey({ topic: msg.topic, event: '*' });
        this.handlers.get(wildcard)?.forEach((h) => h(msg));
      } catch (err) {
        console.error('[SocketManager] Failed to parse message:', err);
      }
    };

    this.ws.onerror = (ev) => {
      console.error('[SocketManager] WebSocket error', ev);
    };

    this.ws.onclose = () => {
      this.clearHeartbeat();
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      INITIAL_DELAY_MS * 2 ** this.reconnectAttempt,
      MAX_RECONNECT_DELAY_MS
    );
    this.reconnectAttempt++;
    this.setStatus('reconnecting');
    this.reconnectTimer = setTimeout(() => this.openSocket(), delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send('__heartbeat__', 'ping', {});
    }, HEARTBEAT_INTERVAL_MS);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearHeartbeat();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private channelKey(ck: ChannelKey): string {
    return `${ck.topic}::${ck.event}`;
  }

  private setStatus(s: SocketStatus): void {
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
  }
}

// Singleton instance
export const socketManager = new SocketManager();
