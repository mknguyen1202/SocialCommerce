import React, { useState, useRef, useEffect } from 'react';
import { useCrossDomainNav } from '../hooks/useCrossDomainNav';
import type { Money } from '../types/domain';

export interface ShareButtonProps {
  type: 'product' | 'theater';
  id: string;
  title: string;
  thumbnailUrl?: string;
  /** For products, used with promoteProduct during a theater stream. */
  price?: Money;
  shopSlug?: string;
}

function deepLinkFor(type: ShareButtonProps['type'], id: string): string {
  return type === 'product'
    ? `${window.location.origin}/commerce/product/${id}`
    : `${window.location.origin}/streaming/theater/${id}`;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  type,
  id,
  title,
  thumbnailUrl,
  price,
  shopSlug,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { shareToSocial, promoteProduct } = useCrossDomainNav();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Close on Esc
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(deepLinkFor(type, id));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select a temporary input
      const input = document.createElement('input');
      input.value = deepLinkFor(type, id);
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setIsOpen(false);
  };

  const handleShareToSocial = () => {
    shareToSocial(type, id, title, thumbnailUrl);
    setIsOpen(false);
  };

  const handlePromote = () => {
    if (price && shopSlug) {
      promoteProduct(id, title, price, shopSlug, thumbnailUrl);
    }
    setIsOpen(false);
  };

  const menuItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    width: '100%',
    padding: 'var(--space-2) var(--space-3)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-primary)',
    borderRadius: 'var(--radius-sm)',
    transition: 'background var(--transition-fast)',
    whiteSpace: 'nowrap',
  };

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        aria-label={`Share ${type}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          padding: '4px 10px',
          height: 28,
          background: 'var(--color-surface-3)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-primary)',
          transition: 'background var(--transition-fast)',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-surface-4, var(--color-surface-3))')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-surface-3)')}
      >
        <span>↗️</span>
        <span>Share</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + var(--space-1))',
            right: 0,
            minWidth: 180,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-surface-3)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            padding: 'var(--space-1)',
            zIndex: 100,
          }}
        >
          {/* Share to Social Feed */}
          <button
            role="menuitem"
            onClick={handleShareToSocial}
            style={menuItemStyle}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-surface-3)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'none')}
          >
            <span>📰</span>
            <span>Share to Social Feed</span>
          </button>

          {/* Promote in Theater (products only, when price/shopSlug provided) */}
          {type === 'product' && price && shopSlug && (
            <button
              role="menuitem"
              onClick={handlePromote}
              style={menuItemStyle}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-surface-3)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'none')}
            >
              <span>🎬</span>
              <span>Promote in Theater</span>
            </button>
          )}

          {/* Divider */}
          <div
            style={{
              height: 1,
              background: 'var(--color-surface-3)',
              margin: 'var(--space-1) 0',
            }}
          />

          {/* Copy link */}
          <button
            role="menuitem"
            onClick={() => void handleCopyLink()}
            style={menuItemStyle}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-surface-3)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'none')}
          >
            <span>{copied ? '✅' : '🔗'}</span>
            <span>{copied ? 'Copied!' : 'Copy link'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
