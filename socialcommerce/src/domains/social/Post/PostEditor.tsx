import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { useCreatePost } from '../hooks/usePost';
import type { PostType, GroupVisibility } from '../../../shared/types/domain';

interface PostEditorProps {
  isOpen: boolean;
  onClose: () => void;
  groupSlug?: string;
}

const POST_TYPES: { value: PostType; label: string; icon: string }[] = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'image', label: 'Image', icon: '🖼️' },
  { value: 'link', label: 'Link', icon: '🔗' },
  { value: 'poll', label: 'Poll', icon: '📊' },
];

export const PostEditor: React.FC<PostEditorProps> = ({ isOpen, onClose, groupSlug }) => {
  const [type, setType] = useState<PostType>('text');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const createPost = useCreatePost();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await createPost.mutateAsync({
      type,
      title: title.trim(),
      body: body.trim(),
      groupSlug,
      linkUrl: type === 'link' ? linkUrl.trim() : undefined,
    });
    setTitle('');
    setBody('');
    setLinkUrl('');
    onClose();
    navigate('/social');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--color-surface-2)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-sm)',
    padding: 'var(--space-2) var(--space-3)',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={groupSlug ? `Post in g/${groupSlug}` : 'Create Post'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%', boxSizing: 'border-box' }}>
        {/* Type tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {POST_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              style={{
                flex: 1,
                padding: 'var(--space-2)',
                border: 'none',
                borderBottom: `2px solid ${type === t.value ? 'var(--color-brand-primary)' : 'transparent'}`,
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 'var(--font-size-xs)',
                color: type === t.value ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                transition: 'border-color var(--transition-fast)',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div>
          <label
            htmlFor="post-title"
            style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}
          >
            Title *
          </label>
          <input
            id="post-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="An interesting title"
            maxLength={300}
            style={inputStyle}
          />
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', float: 'right' }}>
            {title.length}/300
          </span>
        </div>

        {(type === 'text' || type === 'image') && (
          <div>
            <label
              htmlFor="post-body"
              style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}
            >
              {type === 'text' ? 'Body (optional)' : 'Caption (optional)'}
            </label>
            <textarea
              id="post-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Share your thoughts..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        )}

        {type === 'link' && (
          <div>
            <label
              htmlFor="post-link"
              style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}
            >
              URL *
            </label>
            <input
              id="post-link"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              style={inputStyle}
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={createPost.isPending}
            disabled={!title.trim() || (type === 'link' && !linkUrl.trim())}
          >
            Post
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Re-export GroupVisibility to avoid unused import warning
export type { GroupVisibility };
