import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { useUnifiedSearch } from '../../shared/hooks/useUnifiedSearch';
import { Avatar } from '../../shared/components/Avatar';
import { Skeleton } from '../../shared/components/Skeleton';
import { Icon } from '../../shared/components/Icon';
import {
  Search, X, User, Newspaper, Pencil, Clapperboard, ShoppingBag,
} from '../../shared/components/iconRegistry';
import { useUIStore } from '../stores/uiStore';
import type { NotificationDomain } from '../../shared/types/domain';

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const DOMAIN_COLORS: Record<NotificationDomain, string> = {
  communication: 'var(--color-brand-primary)',
  social: 'var(--color-success)',
  streaming: 'var(--color-danger)',
  commerce: 'var(--color-warning)',
};

interface SectionHeaderProps { label: string; icon: LucideIcon; count: number }
const SectionHeader: React.FC<SectionHeaderProps> = ({ label, icon, count }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: 'var(--space-2) var(--space-4)',
      fontSize: 'var(--font-size-xs)',
      fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
      color: 'var(--color-text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }}
  >
    <Icon icon={icon} size={12} />
    <span>{label}</span>
    <span style={{ marginLeft: 'auto', fontWeight: 'var(--font-weight-normal)' as React.CSSProperties['fontWeight'] }}>
      {count}
    </span>
  </div>
);

interface ResultRowProps {
  onClick: () => void;
  children: React.ReactNode;
}
const ResultRow: React.FC<ResultRowProps> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      width: '100%',
      padding: 'var(--space-2) var(--space-4)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'left',
      borderRadius: 'var(--radius-sm)',
      transition: 'background var(--transition-fast)',
      color: 'var(--color-text-primary)',
      fontSize: 'var(--font-size-base)',
    }}
    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-surface-3)')}
    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'none')}
  >
    {children}
  </button>
);

export interface UnifiedSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnifiedSearch: React.FC<UnifiedSearchProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const setActiveDomain = useUIStore((s) => s.setActiveDomain);

  const { data: results, isFetching } = useUnifiedSearch(debouncedQuery);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const go = useCallback(
    (domain: NotificationDomain, path: string) => {
      setActiveDomain(domain);
      navigate(path);
      onClose();
    },
    [navigate, setActiveDomain, onClose]
  );

  if (!isOpen) return null;

  const hasResults =
    results &&
    (results.users.length + results.posts.length + results.theaters.length + results.products.length) > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 'var(--z-modal-backdrop)' as unknown as number,
        }}
      />

      {/* Search panel */}
      <div
        role="dialog"
        aria-label="Search"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 600,
          background: 'var(--color-surface-2)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 'var(--z-modal)' as unknown as number,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 160px)',
        }}
      >
        {/* Input row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)',
            borderBottom: '1px solid var(--color-surface-3)',
          }}
        >
          <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
            <Icon icon={Search} size={18} />
          </span>
          <input
            ref={inputRef}
            type="search"
            aria-label="Search across all domains"
            placeholder="Search users, posts, theaters, products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-md)',
              fontFamily: 'inherit',
            }}
          />
          {isFetching && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Searching…
            </span>
          )}
          <button
            aria-label="Close search"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon icon={X} size={16} />
          </button>
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {debouncedQuery.trim().length < 2 && (
            <p
              style={{
                padding: 'var(--space-6)',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              Type at least 2 characters to search
            </p>
          )}

          {debouncedQuery.trim().length >= 2 && isFetching && !results && (
            <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} width="80%" height={20} />
              ))}
            </div>
          )}

          {debouncedQuery.trim().length >= 2 && !isFetching && !hasResults && (
            <p
              style={{
                padding: 'var(--space-6)',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              No results for &ldquo;{debouncedQuery}&rdquo;
            </p>
          )}

          {/* Users */}
          {results && results.users.length > 0 && (
            <section aria-label="Users">
              <SectionHeader label="Users" icon={User} count={results.users.length} />
              {results.users.map((u) => (
                <ResultRow key={u.id} onClick={() => go('communication', `/communication?dm=${encodeURIComponent(u.id)}`)}>
                  <Avatar src={u.avatarUrl} name={u.displayName} size="md" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'] }}>
                      {u.displayName}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      @{u.username}
                    </div>
                  </div>
                  <span
                    style={{
                      marginLeft: 'auto',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: u.presence === 'online' ? 'var(--color-success)' : 'var(--color-text-muted)',
                      flexShrink: 0,
                    }}
                  />
                </ResultRow>
              ))}
            </section>
          )}

          {/* Posts */}
          {results && results.posts.length > 0 && (
            <section aria-label="Posts">
              <SectionHeader label="Posts" icon={Newspaper} count={results.posts.length} />
              {results.posts.map((p) => (
                <ResultRow key={p.id} onClick={() => go('social', `/social/post/${p.id}`)}>
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-sm)',
                      background: DOMAIN_COLORS.social,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    <Icon icon={Pencil} size={14} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.title}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      by {p.authorName}{p.groupName ? ` · ${p.groupName}` : ''}
                    </div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    ▲ {p.score}
                  </span>
                </ResultRow>
              ))}
            </section>
          )}

          {/* Theaters */}
          {results && results.theaters.length > 0 && (
            <section aria-label="Theaters">
              <SectionHeader label="Theaters" icon={Clapperboard} count={results.theaters.length} />
              {results.theaters.map((t) => (
                <ResultRow key={t.id} onClick={() => go('streaming', `/streaming/theater/${t.id}`)}>
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-sm)',
                      background: DOMAIN_COLORS.streaming,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    <Icon icon={Clapperboard} size={14} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.title}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {t.hostName}
                      {t.status === 'live' && (
                        <span style={{ color: 'var(--color-danger)', marginLeft: 'var(--space-2)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'] }}>
                          LIVE · {t.viewerCount}
                        </span>
                      )}
                    </div>
                  </div>
                </ResultRow>
              ))}
            </section>
          )}

          {/* Products */}
          {results && results.products.length > 0 && (
            <section aria-label="Products">
              <SectionHeader label="Products" icon={ShoppingBag} count={results.products.length} />
              {results.products.map((p) => (
                <ResultRow key={p.id} onClick={() => go('commerce', `/commerce/product/${p.id}`)}>
                  {p.thumbnailUrl ? (
                    <img
                      src={p.thumbnailUrl}
                      alt={p.title}
                      loading="lazy"
                      style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                    />
                  ) : (
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-sm)',
                        background: DOMAIN_COLORS.commerce,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      <Icon icon={ShoppingBag} size={14} />
                    </span>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.title}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {p.vendorName}
                    </div>
                  </div>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
                      color: 'var(--color-text-primary)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.price.currency} {p.price.amount.toFixed(2)}
                  </span>
                </ResultRow>
              ))}
            </section>
          )}
        </div>

        {/* Footer keyboard hint */}
        <div
          style={{
            padding: 'var(--space-2) var(--space-4)',
            borderTop: '1px solid var(--color-surface-3)',
            display: 'flex',
            gap: 'var(--space-4)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
          }}
        >
          <span><kbd style={{ padding: '1px 4px', background: 'var(--color-surface-3)', borderRadius: 3 }}>↵</kbd> open</span>
          <span><kbd style={{ padding: '1px 4px', background: 'var(--color-surface-3)', borderRadius: 3 }}>Esc</kbd> close</span>
        </div>
      </div>
    </>
  );
};
