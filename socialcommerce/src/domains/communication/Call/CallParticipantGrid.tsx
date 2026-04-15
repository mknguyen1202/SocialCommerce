import React from 'react';
import { UserAvatar } from '../shared/UserAvatar';
import type { CallParticipant } from '../../../shared/types/domain';

interface CallParticipantGridProps {
  participants: CallParticipant[];
  isVideo: boolean;
}

export const CallParticipantGrid: React.FC<CallParticipantGridProps> = ({
  participants,
  isVideo,
}) => {
  const count = participants.length;

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gap: 4,
    flex: 1,
    padding: 8,
    gridTemplateColumns:
      count <= 1 ? '1fr'
      : count <= 4 ? 'repeat(2, 1fr)'
      : 'repeat(3, 1fr)',
  };

  return (
    <div style={gridStyle}>
      {participants.map((p) => (
        <ParticipantTile key={p.user.id} participant={p} isVideo={isVideo} />
      ))}
    </div>
  );
};

const ParticipantTile: React.FC<{
  participant: CallParticipant;
  isVideo: boolean;
}> = ({ participant: p, isVideo }) => (
  <div
    style={{
      position: 'relative',
      background: 'var(--color-surface-0)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 160,
      border: p.isScreenSharing ? '2px solid var(--color-brand-primary)' : '2px solid transparent',
    }}
  >
    {isVideo && p.isCameraOn ? (
      // Real implementation attaches a MediaStream ref here
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        📹 Video stream
      </div>
    ) : (
      <UserAvatar user={p.user} size="xl" showPresence={false} />
    )}

    {/* Name tag */}
    <div
      style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: 'rgba(0,0,0,0.6)',
        borderRadius: 'var(--radius-sm)',
        padding: '2px 6px',
        fontSize: 'var(--font-size-sm)',
        color: '#fff',
      }}
    >
      {p.isMuted && <span aria-label="Muted">🔇</span>}
      {p.isScreenSharing && <span aria-label="Sharing screen">🖥️</span>}
      <span>{p.user.displayName}</span>
    </div>
  </div>
);
