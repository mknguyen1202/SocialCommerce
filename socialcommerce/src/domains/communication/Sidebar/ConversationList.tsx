import React, { useState } from 'react';
import { Skeleton } from '../../../shared/components/Skeleton';
import { useConversations } from '../hooks/useConversations';
import { useConversationStore } from '../stores/conversationStore';
import { ConversationListItem } from './ConversationListItem';
import { RoomCreateModal } from './RoomCreateModal';
import { useAuthContext } from '../../../app/providers/AuthProvider';
import type { DomainUser, Conversation } from '../../../shared/types/domain';

export const ConversationList: React.FC = () => {
  const { data: conversations, isLoading } = useConversations();
  const { activeConversationId, setActiveConversation } = useConversationStore();
  const { user } = useAuthContext();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Build a minimal DomainUser from auth context
  const currentUser: DomainUser | null = user
    ? {
        id: user.id,
        username: user.email ?? '',
        displayName: user.name ?? user.email ?? 'Me',
        avatarUrl: '',
        presence: 'online',
        lastSeen: new Date(),
      }
    : null;

  const dms: Conversation[] = (conversations ?? []).filter((c) => c.type === 'dm');
  const rooms: Conversation[] = (conversations ?? []).filter((c) => c.type === 'room');

  const filterConv = (list: Conversation[]) =>
    search.trim()
      ? list.filter((c) => {
          const name =
            c.name ??
            c.participants.find((p) => p.id !== user?.id)?.displayName ??
            '';
          return name.toLowerCase().includes(search.toLowerCase());
        })
      : list;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Search */}
      <div style={{ padding: '10px 8px 6px' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations"
          aria-label="Search conversations"
          style={{
            width: '100%',
            background: 'var(--color-surface-0)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px' }}>
        {/* Direct Messages section */}
        <Section label="Direct Messages">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <ConvSkeleton key={i} />)
            : filterConv(dms).map((c) => (
                <ConversationListItem
                  key={c.id}
                  conversation={c}
                  currentUser={currentUser}
                  isActive={activeConversationId === c.id}
                  onClick={() => setActiveConversation(c.id)}
                />
              ))}
        </Section>

        {/* Rooms section */}
        <Section
          label="Rooms"
          action={
            <button
              aria-label="Create room"
              onClick={() => setCreateModalOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1,
                padding: '0 2px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              ＋
            </button>
          }
        >
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <ConvSkeleton key={i} />)
            : filterConv(rooms).map((c) => (
                <ConversationListItem
                  key={c.id}
                  conversation={c}
                  currentUser={currentUser}
                  isActive={activeConversationId === c.id}
                  onClick={() => setActiveConversation(c.id)}
                />
              ))}
          {!isLoading && filterConv(rooms).length === 0 && (
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', padding: '6px 10px' }}>
              No rooms yet
            </p>
          )}
        </Section>
      </div>

      <RoomCreateModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} />
    </div>
  );
};

const Section: React.FC<{
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, action, children }) => (
  <div style={{ marginBottom: 'var(--space-4)' }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 10px 4px',
      }}
    >
      <span
        style={{
          fontSize: 'var(--font-size-xs)',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
        }}
      >
        {label}
      </span>
      {action}
    </div>
    {children}
  </div>
);

const ConvSkeleton: React.FC = () => (
  <div style={{ display: 'flex', gap: 10, padding: '8px 10px', alignItems: 'center' }}>
    <Skeleton variant="circle" width={32} height={32} />
    <div style={{ flex: 1 }}>
      <Skeleton width="60%" height={12} style={{ marginBottom: 6 }} />
      <Skeleton width="90%" height={10} />
    </div>
  </div>
);
