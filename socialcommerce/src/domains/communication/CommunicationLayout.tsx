import React, { Suspense, lazy, useState } from 'react';
import { ConversationList } from './Sidebar/ConversationList';
import { ActivityFeed } from './Activity/ActivityFeed';
import { ChatView } from './Chat/ChatView';
import { useCallSignaling } from './hooks/useCallSignaling';
import { useConversationStore } from './stores/conversationStore';
import { useConversations } from './hooks/useConversations';
import { useCallStore } from './stores/callStore';
import { useAuthContext } from '../../app/providers/AuthProvider';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import type { DomainUser } from '../../shared/types/domain';

const CallFloatingWindow = lazy(() => import('./Call/CallFloatingWindow').then(m => ({ default: m.CallFloatingWindow })));
const IncomingCallModal = lazy(() => import('./Call/IncomingCallModal').then(m => ({ default: m.IncomingCallModal })));

const SIDEBAR_WIDTH = 240;

export const CommunicationLayout: React.FC = () => {
  // Wire up call signaling once at layout level
  useCallSignaling();

  const isMobile = useIsMobile();
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'activity'>('chats');

  const { activeConversationId, setActiveConversation } = useConversationStore();
  const { data: conversations } = useConversations();
  const { user } = useAuthContext();
  const activeCall = useCallStore((s) => s.activeCall);
  const incomingCall = useCallStore((s) => s.incomingCall);

  const activeConversation = conversations?.find((c) => c.id === activeConversationId) ?? null;

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

  // On mobile, show list panel OR chat panel — never both at once
  const showList = !isMobile || !activeConversationId;
  const showChat = !isMobile || !!activeConversationId;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Conversations panel
          - Desktop: fixed sidebar on the left
          - Mobile: full-width, shown only when no conversation is active */}
      <aside
        aria-label="Conversations"
        style={{
          width: isMobile ? '100%' : SIDEBAR_WIDTH,
          flexShrink: 0,
          background: 'var(--color-surface-0)',
          display: showList ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100%',
          borderRight: isMobile ? 'none' : '1px solid var(--color-border-default)',
        }}
      >
        {/* Tab bar */}
        <div
          role="tablist"
          aria-label="Sidebar tabs"
          style={{
            display: 'flex',
            flexShrink: 0,
            borderBottom: '1px solid var(--color-border-default)',
          }}
        >
          {(
            [{ id: 'chats', label: 'Chats', icon: '💬' }, { id: 'activity', label: 'Activity', icon: '🔔' }] as const
          ).map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={sidebarTab === tab.id}
              onClick={() => setSidebarTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-1)',
                height: 40,
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${sidebarTab === tab.id ? 'var(--color-brand-primary)' : 'transparent'
                  }`,
                cursor: 'pointer',
                fontSize: 'var(--font-size-xs)',
                fontWeight: sidebarTab === tab.id
                  ? ('var(--font-weight-semibold)' as React.CSSProperties['fontWeight'])
                  : ('var(--font-weight-normal)' as React.CSSProperties['fontWeight']),
                color: sidebarTab === tab.id
                  ? 'var(--color-text-primary)'
                  : 'var(--color-text-muted)',
                transition: 'color var(--transition-fast)',
              }}
            >
              <span aria-hidden="true">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div
          role="tabpanel"
          aria-label={sidebarTab === 'chats' ? 'Chats' : 'Activity'}
          style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          {sidebarTab === 'chats' ? <ConversationList /> : <ActivityFeed />}
        </div>
      </aside>

      {/* Main chat area
          - Desktop: fills remaining space
          - Mobile: full-width, shown only when a conversation is active */}
      <section
        aria-label="Chat"
        style={{ flex: 1, display: showChat ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}
      >
        {activeConversation ? (
          <>
            {/* Chat header */}
            <header
              style={{
                height: 48,
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid var(--color-surface-0)',
                gap: 8,
                flexShrink: 0,
              }}
            >
              {/* Back button — mobile only */}
              {isMobile && (
                <button
                  aria-label="Back to conversations"
                  onClick={() => setActiveConversation(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    fontSize: 20,
                    padding: '0 var(--space-2) 0 0',
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  ←
                </button>
              )}
              <span style={{ fontSize: 18 }}>
                {activeConversation.type === 'room' ? '#' : '💬'}
              </span>
              <span
                style={{
                  fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-md)',
                }}
              >
                {activeConversation.name ??
                  activeConversation.participants.find((p) => p.id !== user?.id)?.displayName ??
                  'Conversation'}
              </span>
              {activeConversation.participants.length > 2 && (
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                  {activeConversation.participants.length} members
                </span>
              )}
            </header>

            <ChatView conversation={activeConversation} currentUser={currentUser} />
          </>
        ) : (
          <EmptyState />
        )}
      </section>

      {/* Floating call window — only mount when call is active */}
      {activeCall && activeCall.status !== 'ended' && (
        <Suspense fallback={null}>
          <CallFloatingWindow />
        </Suspense>
      )}
      {incomingCall && (
        <Suspense fallback={null}>
          <IncomingCallModal />
        </Suspense>
      )}
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div
    style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-4)',
      color: 'var(--color-text-muted)',
    }}
  >
    <span style={{ fontSize: 64 }}>💬</span>
    <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-secondary)' }}>
      Select a conversation to start chatting
    </p>
  </div>
);
