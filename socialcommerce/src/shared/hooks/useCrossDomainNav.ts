/**
 * Cross-domain navigation actions.
 * Combines React Router navigation + UIStore domain switching + EventBus events.
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../app/stores/uiStore';
import { eventBus } from '../lib/eventBus';
import type { Money } from '../types/domain';

export function useCrossDomainNav() {
  const navigate = useNavigate();
  const setActiveDomain = useUIStore((s) => s.setActiveDomain);

  /** Navigate to Communication and open (or create) a DM with `userId`. */
  const openDM = useCallback(
    (userId: string, displayName: string, avatarUrl?: string) => {
      setActiveDomain('communication');
      navigate(`/communication?dm=${encodeURIComponent(userId)}`);
      eventBus.emit('cross:open-dm', { userId, displayName, avatarUrl });
    },
    [navigate, setActiveDomain]
  );

  /**
   * Navigate to Social and pre-fill the post composer with a
   * product or theater embed link.
   */
  const shareToSocial = useCallback(
    (
      type: 'product' | 'theater',
      id: string,
      title: string,
      thumbnailUrl?: string
    ) => {
      const url =
        type === 'product'
          ? `/commerce/product/${id}`
          : `/streaming/theater/${id}`;
      setActiveDomain('social');
      navigate(
        `/social?compose=1&shareType=${type}&shareId=${encodeURIComponent(id)}&shareTitle=${encodeURIComponent(title)}`
      );
      eventBus.emit('cross:share-to-social', { type, id, title, url, thumbnailUrl });
    },
    [navigate, setActiveDomain]
  );

  /**
   * Send a theater invite via the Communication domain chat.
   * Emits the event; CommunicationLayout listens and opens the DM.
   */
  const inviteToTheater = useCallback(
    (theaterId: string, theaterTitle: string, toUserId: string, toDisplayName: string) => {
      eventBus.emit('cross:theater-invite', {
        theaterId,
        theaterTitle,
        toUserId,
        toDisplayName,
      });
      setActiveDomain('communication');
      navigate(`/communication?dm=${encodeURIComponent(toUserId)}`);
    },
    [navigate, setActiveDomain]
  );

  /**
   * Promote a product during a stream (emits to the active Theater).
   */
  const promoteProduct = useCallback(
    (
      productId: string,
      title: string,
      price: Money,
      shopSlug: string,
      thumbnailUrl?: string
    ) => {
      eventBus.emit('cross:promote-product', {
        productId,
        title,
        price,
        shopSlug,
        thumbnailUrl,
      });
    },
    []
  );

  return { openDM, shareToSocial, inviteToTheater, promoteProduct };
}
