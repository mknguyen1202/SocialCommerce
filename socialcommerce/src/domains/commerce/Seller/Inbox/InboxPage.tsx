import React, { useEffect, useRef, useState } from 'react';
import {
  useShopConversations,
  useShopMessages,
  useSendShopMessage,
  useUpdateShopConversation,
  useShopCannedReplies,
} from '../../hooks/useShopConversations';
import { useSellerStore } from '../../stores/sellerStore';
import type { ShopConvStatus, ShopConversation } from '../types';

interface InboxPageProps {
  shopId: string | null;
}

const FILTER_OPTIONS: { label: string; value: ShopConvStatus | 'ALL' | 'UNASSIGNED' | 'MINE' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Closed', value: 'CLOSED' },
];

const fmtTime = (d: Date | string) => {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const InboxPage: React.FC<InboxPageProps> = ({ shopId }) => {
  const inboxFilter = useSellerStore((s) => s.inboxFilter);
  const setInboxFilter = useSellerStore((s) => s.setInboxFilter);
  const activeConversationId = useSellerStore((s) => s.activeConversationId);
  const setActiveConversation = useSellerStore((s) => s.setActiveConversationId);
  const { data: conversations, isLoading } = useShopConversations(shopId);
  const [search, setSearch] = useState('');

  const filtered = conversations?.filter(c => {
    const matchesFilter = inboxFilter === 'ALL' || c.status === inboxFilter;
    const matchesSearch = !search || c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage?.content?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }) ?? [];

  const activeConversation = conversations?.find(c => c.id === activeConversationId) ?? filtered[0] ?? null;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Conversation list */}
      <div style={{
        width: 300, flexShrink: 0, borderRight: '1px solid var(--color-border-default)',
        display: 'flex', flexDirection: 'column', height: '100%',
      }}>
        {/* Header */}
        <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--color-border-default)', flexShrink: 0 }}>
          <h2 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)', fontWeight: 600 }}>Inbox</h2>
          <input
            type="search"
            aria-label="Search conversations"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-xs)', boxSizing: 'border-box' }}
          />
        </div>

        {/* Filter tabs */}
        <div role="tablist" aria-label="Filter conversations" style={{ display: 'flex', borderBottom: '1px solid var(--color-border-default)', flexShrink: 0 }}>
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              role="tab"
              aria-selected={inboxFilter === opt.value}
              onClick={() => setInboxFilter(opt.value as ShopConvStatus | 'ALL')}
              style={{
                flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer',
                background: 'transparent', fontSize: 'var(--font-size-xs)',
                color: inboxFilter === opt.value ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                borderBottom: inboxFilter === opt.value ? '2px solid var(--color-brand-primary)' : '2px solid transparent',
                fontWeight: inboxFilter === opt.value ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div role="list" aria-label="Conversations" style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: 60, borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-2)' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
              No conversations found.
            </div>
          ) : (
            filtered.map(conv => (
              <ConvListItem
                key={conv.id}
                conv={conv}
                active={conv.id === (activeConversation?.id)}
                onClick={() => setActiveConversation(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Message panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {activeConversation ? (
          <MessagePanel shopId={shopId} conversation={activeConversation} />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
            Select a conversation to view messages.
          </div>
        )}
      </div>
    </div>
  );
};

const ConvListItem: React.FC<{ conv: ShopConversation; active: boolean; onClick: () => void }> = ({ conv, active, onClick }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      role="listitem"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-current={active ? 'true' : undefined}
      style={{
        padding: 'var(--space-3)', cursor: 'pointer', transition: 'background 120ms',
        background: active ? 'var(--color-surface-3)' : hover ? 'var(--color-surface-2)' : 'transparent',
        borderBottom: '1px solid var(--color-border-default)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {conv.customerName[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: conv.unreadByStaff > 0 ? 700 : 500, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {conv.customerName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {conv.subject}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{conv.lastMessageAt ? fmtTime(conv.lastMessageAt) : ''}</span>
          {conv.unreadByStaff > 0 && (
            <span style={{ minWidth: 16, height: 16, borderRadius: 8, background: 'var(--color-danger)', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, paddingInline: 3 }}>
              {conv.unreadByStaff}
            </span>
          )}
        </div>
      </div>
      {conv.lastMessage && (
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 38 }}>
          {conv.lastMessage.content}
        </div>
      )}
      {conv.tags.length > 0 && (
        <div style={{ marginTop: 4, paddingLeft: 38, display: 'flex', gap: 4 }}>
          {conv.tags.slice(0, 2).map(tag => (
            <span key={tag} style={{ fontSize: 10, padding: '1px 6px', background: 'var(--color-surface-3)', borderRadius: 10, color: 'var(--color-text-muted)' }}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
};

const MessagePanel: React.FC<{ shopId: string | null; conversation: ShopConversation }> = ({ shopId, conversation }) => {
  const { data: messages } = useShopMessages(shopId, conversation.id);
  const { data: cannedReplies } = useShopCannedReplies(shopId);
  const sendMessage = useSendShopMessage(shopId!);
  const updateConv = useUpdateShopConversation(shopId!);

  const [text, setText] = useState('');
  const [showCanned, setShowCanned] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await sendMessage.mutateAsync({ conversationId: conversation.id, content: text.trim() });
    setText('');
  };

  const handleStatusChange = async (status: ShopConvStatus) => {
    await updateConv.mutateAsync({ conversationId: conversation.id, status });
  };

  return (
    <>
      {/* Conv header */}
      <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border-default)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>{conversation.customerName}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{conversation.subject}</div>
        </div>
        {conversation.linkedOrderId && (
          <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--color-surface-3)', borderRadius: 'var(--radius-full)', color: 'var(--color-text-secondary)' }}>
            Order #{conversation.linkedOrderNumber ?? conversation.linkedOrderId.slice(-6).toUpperCase()}
          </span>
        )}
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {(['OPEN', 'PENDING', 'CLOSED'] as ShopConvStatus[]).filter(s => s !== conversation.status).map(s => (
            <button key={s} onClick={() => handleStatusChange(s)} style={smallBtnStyle}>
              → {s}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {(messages ?? []).map(msg => {
          const isStaff = !msg.senderIsCustomer;
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: isStaff ? 'row-reverse' : 'row', gap: 8 }}>
              {!isStaff && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, color: 'var(--color-text-secondary)' }}>
                  {conversation.customerName[0]}
                </div>
              )}
              <div style={{
                maxWidth: '70%', padding: 'var(--space-2) var(--space-3)',
                borderRadius: isStaff ? '12px 12px 0 12px' : '12px 12px 12px 0',
                background: isStaff ? 'var(--color-brand-primary)' : 'var(--color-surface-2)',
                color: isStaff ? '#fff' : 'var(--color-text-primary)',
                fontSize: 'var(--font-size-sm)', lineHeight: 1.5,
              }}>
                {msg.content}
                <div style={{ fontSize: 10, color: isStaff ? 'rgba(255,255,255,0.6)' : 'var(--color-text-muted)', marginTop: 4, textAlign: 'right' }}>
                  {fmtTime(msg.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <form onSubmit={handleSend} style={{ padding: 'var(--space-3)', borderTop: '1px solid var(--color-border-default)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flexShrink: 0 }}>
        {showCanned && (
          <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden', maxHeight: 160, overflowY: 'auto' }}>
            {(cannedReplies ?? []).map(cr => (
              <button
                key={cr.id}
                type="button"
                onClick={() => { setText(cr.body); setShowCanned(false); }}
                style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-default)' }}
              >
                <strong style={{ color: 'var(--color-text-primary)' }}>{cr.title}</strong>
                <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>{cr.body.slice(0, 80)}{cr.body.length > 80 ? '…' : ''}</div>
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
          <textarea
            aria-label="Message text"
            rows={2}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', resize: 'none', lineHeight: 1.4 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              type="button"
              onClick={() => setShowCanned(s => !s)}
              title="Canned replies"
              aria-label="Canned replies"
              style={smallBtnStyle}
            >
              💬
            </button>
            <button type="submit" disabled={!text.trim() || sendMessage.isPending} style={{ ...smallBtnStyle, background: 'var(--color-brand-primary)', color: '#fff', border: 'none', opacity: !text.trim() ? 0.5 : 1 }}>
              ↑
            </button>
          </div>
        </div>
      </form>
    </>
  );
};

const smallBtnStyle: React.CSSProperties = {
  padding: '6px 10px', background: 'transparent', border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 12,
  color: 'var(--color-text-secondary)',
};
