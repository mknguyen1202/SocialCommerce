import React, { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { DomainMessage, DomainUser } from '../../../shared/types/domain';
import { MessageItem } from './MessageItem';
import { Skeleton } from '../../../shared/components/Skeleton';

const GROUPING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function isGrouped(messages: DomainMessage[], index: number): boolean {
  if (index === 0) return false;
  const prev = messages[index - 1];
  const curr = messages[index];
  return (
    prev.sender.id === curr.sender.id &&
    curr.createdAt.getTime() - prev.createdAt.getTime() < GROUPING_THRESHOLD_MS
  );
}

interface MessageListProps {
  messages: DomainMessage[];
  currentUser: DomainUser | null;
  isFetchingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onReply: (message: DomainMessage) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUser,
  isFetchingMore,
  hasMore,
  onLoadMore,
  onReply,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(messages.length);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => (isGrouped(messages, i) ? 36 : 64),
    overscan: 5,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  // Load more on scroll to top via IntersectionObserver
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const isFetchingMoreRef = useRef(isFetchingMore);
  isFetchingMoreRef.current = isFetchingMore;

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMoreRef.current && !isFetchingMoreRef.current) {
          onLoadMoreRef.current();
        }
      },
      { root: parentRef.current, rootMargin: '100px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={parentRef}
      style={{ flex: 1, overflowY: 'auto', position: 'relative' }}
      role="log"
      aria-label="Messages"
      aria-live="polite"
    >
      {/* Sentinel for load-more IntersectionObserver */}
      <div ref={topSentinelRef} style={{ height: 1 }} />

      {/* Load more indicator at top */}
      {isFetchingMore && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Skeleton variant="circle" width={40} height={40} />
              <Skeleton variant="text" lines={2} style={{ flex: 1 }} />
            </div>
          ))}
        </div>
      )}

      {/* Virtualized items */}
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const message = messages[virtualRow.index];
          return (
            <div
              key={message.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <MessageItem
                message={message}
                currentUser={currentUser}
                isGrouped={isGrouped(messages, virtualRow.index)}
                onReply={onReply}
              />
            </div>
          );
        })}
      </div>

      {/* Scroll anchor */}
      <div ref={bottomRef} style={{ height: 1 }} />
    </div>
  );
};
