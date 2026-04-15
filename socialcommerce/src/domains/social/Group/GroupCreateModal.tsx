import React, { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { useCreateGroup } from '../hooks/useGroups';
import type { GroupVisibility } from '../../../shared/types/domain';
import { useNavigate } from 'react-router-dom';

interface GroupCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VISIBILITY_OPTIONS: { value: GroupVisibility; label: string; desc: string }[] = [
  { value: 'public', label: 'Public', desc: 'Anyone can view and join' },
  { value: 'restricted', label: 'Restricted', desc: 'Anyone can view, approval required to join' },
  { value: 'private', label: 'Private', desc: 'Only members can view and join' },
];

export const GroupCreateModal: React.FC<GroupCreateModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const createGroup = useCreateGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<GroupVisibility>('public');

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

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const group = await createGroup.mutateAsync({ name: name.trim(), description, visibility });
    onClose();
    navigate(`/social/group/${group.slug}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Community">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: 460 }}>
        <div>
          <label
            htmlFor="group-name"
            style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}
          >
            Community name *
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <span
              style={{
                background: 'var(--color-surface-0)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRight: 'none',
                borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                padding: 'var(--space-2) var(--space-3)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-muted)',
              }}
            >
              g/
            </span>
            <input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="community_name"
              maxLength={50}
              style={{ ...inputStyle, borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}
            />
          </div>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', float: 'right' }}>
            {name.length}/50
          </span>
        </div>

        <div>
          <label
            htmlFor="group-desc"
            style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}
          >
            Description (optional)
          </label>
          <textarea
            id="group-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What is your community about?"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div>
          <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            Visibility
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {VISIBILITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  alignItems: 'flex-start',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${visibility === opt.value ? 'var(--color-brand-primary)' : 'rgba(255,255,255,0.08)'}`,
                  cursor: 'pointer',
                  transition: 'border-color var(--transition-fast)',
                }}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={opt.value}
                  checked={visibility === opt.value}
                  onChange={() => setVisibility(opt.value)}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'] }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    {opt.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={createGroup.isPending}
            disabled={!name.trim()}
          >
            Create Community
          </Button>
        </div>
      </div>
    </Modal>
  );
};
