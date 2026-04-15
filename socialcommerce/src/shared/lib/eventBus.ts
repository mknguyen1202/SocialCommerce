/**
 * Typed cross-domain pub-sub event bus.
 * Allows domains to communicate without direct imports between each other.
 */
import type { Money } from '../types/domain';

export interface CrossDomainEventMap {
  /** Communication: open or create a DM conversation with a user */
  'cross:open-dm': { userId: string; displayName: string; avatarUrl?: string };

  /** Social: pre-fill the post composer with a shared link/embed */
  'cross:share-to-social': {
    type: 'product' | 'theater';
    id: string;
    title: string;
    url: string;
    thumbnailUrl?: string;
  };

  /** Streaming: invite a user to a theater via the Communication domain */
  'cross:theater-invite': {
    theaterId: string;
    theaterTitle: string;
    toUserId: string;
    toDisplayName: string;
  };

  /** Streaming: host promotes a product (shows overlay in theater) */
  'cross:promote-product': {
    productId: string;
    title: string;
    price: Money;
    thumbnailUrl?: string;
    shopSlug: string;
  };
}

type Handler<T> = (payload: T) => void;

class EventBus {
  private readonly listeners = new Map<string, Set<Handler<unknown>>>();

  on<K extends keyof CrossDomainEventMap>(
    event: K,
    handler: Handler<CrossDomainEventMap[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as Handler<unknown>);
    return () => this.off(event, handler);
  }

  off<K extends keyof CrossDomainEventMap>(
    event: K,
    handler: Handler<CrossDomainEventMap[K]>
  ): void {
    this.listeners.get(event)?.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof CrossDomainEventMap>(
    event: K,
    payload: CrossDomainEventMap[K]
  ): void {
    this.listeners.get(event)?.forEach((h) => h(payload));
  }
}

export const eventBus = new EventBus();
