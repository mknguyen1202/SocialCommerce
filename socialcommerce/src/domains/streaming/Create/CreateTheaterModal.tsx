import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { SourcePicker } from './SourcePicker';
import { InviteFriends } from './InviteFriends';
import { useCreateTheater, THEATER_CATEGORIES } from '../hooks/useTheaters';
import type { ContentSourceType, TheaterVisibility } from '../../../shared/types/domain';

interface CreateTheaterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'details' | 'source' | 'invite';

export const CreateTheaterModal: React.FC<CreateTheaterModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const createTheater = useCreateTheater();

  const [step, setStep] = useState<Step>('details');
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(THEATER_CATEGORIES[0]);
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<TheaterVisibility>('public');
  const [sourceType, setSourceType] = useState<ContentSourceType>('screen_share');
  const [sourceUrl, setSourceUrl] = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--color-surface-0)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-sm)',
    padding: 'var(--space-2) var(--space-3)',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    marginBottom: 4,
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    const theater = await createTheater.mutateAsync({
      title: title.trim(),
      description,
      category,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      visibility,
      contentSource: {
        type: sourceType,
        url: sourceUrl || undefined,
      },
    });
    setCreatedId(theater.id);
    if (visibility !== 'public') {
      setStep('invite');
    } else {
      onClose();
      navigate(`/streaming/theater/${theater.id}`);
    }
  };

  const handleClose = () => {
    onClose();
    if (createdId) navigate(`/streaming/theater/${createdId}`);
    setStep('details');
    setCreatedId(null);
    setTitle('');
    setDescription('');
    setTags('');
    setSourceUrl('');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Theater" width={520}>
      <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {step === 'details' && (
          <>
            <div>
              <label htmlFor="theater-title" style={labelStyle}>Title *</label>
              <input
                id="theater-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My awesome theater"
                maxLength={100}
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="theater-desc" style={labelStyle}>Description</label>
              <textarea
                id="theater-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are you streaming?"
                maxLength={500}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div>
              <label htmlFor="theater-category" style={labelStyle}>Category</label>
              <select
                id="theater-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={inputStyle}
              >
                {THEATER_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="theater-tags" style={labelStyle}>Tags (comma separated)</label>
              <input
                id="theater-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="gaming, fun, chill"
                style={inputStyle}
              />
            </div>

            <div>
              <p style={{ ...labelStyle, marginBottom: 8 }}>Visibility</p>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {(['public', 'friends', 'private'] as TheaterVisibility[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVisibility(v)}
                    aria-pressed={visibility === v}
                    style={{
                      flex: 1,
                      padding: 'var(--space-2)',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${visibility === v ? 'var(--color-brand-primary)' : 'rgba(255,255,255,0.08)'}`,
                      background: visibility === v ? 'var(--color-brand-primary)' : 'var(--color-surface-3)',
                      color: visibility === v ? '#fff' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
                      textTransform: 'capitalize',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!title.trim()}
                onClick={() => setStep('source')}
              >
                Next: Content Source →
              </Button>
            </div>
          </>
        )}

        {step === 'source' && (
          <>
            <SourcePicker
              value={sourceType}
              onChange={setSourceType}
              url={sourceUrl}
              onUrlChange={setSourceUrl}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
              <Button variant="ghost" size="sm" onClick={() => setStep('details')}>← Back</Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={createTheater.isPending}
                onClick={handleCreate}
              >
                🔴 Create Theater
              </Button>
            </div>
          </>
        )}

        {step === 'invite' && createdId && (
          <>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Theater created! Invite friends to join.
            </p>
            <InviteFriends
              theaterId={createdId}
              onDone={handleClose}
            />
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Skip & Go to Theater
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
};
