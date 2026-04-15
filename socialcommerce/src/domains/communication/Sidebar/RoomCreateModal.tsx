import React, { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { useCreateRoom } from '../hooks/useConversations';

interface RoomCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoomCreateModal: React.FC<RoomCreateModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { mutate: createRoom, isPending } = useCreateRoom();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createRoom(
      { name: name.trim(), description: description.trim() || undefined },
      { onSuccess: () => { setName(''); setDescription(''); onClose(); } }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create a Room" width={440}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Room Name <span aria-hidden style={{ color: 'var(--color-danger)' }}>*</span>
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. general"
            maxLength={80}
            required
            autoFocus
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Description
          </span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this room for?"
            maxLength={200}
            style={inputStyle}
          />
        </label>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isPending} disabled={!name.trim()}>
            Create Room
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const inputStyle: React.CSSProperties = {
  background: 'var(--color-surface-0)',
  border: '1px solid var(--color-surface-3)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 10px',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--font-size-base)',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color var(--transition-fast)',
};
