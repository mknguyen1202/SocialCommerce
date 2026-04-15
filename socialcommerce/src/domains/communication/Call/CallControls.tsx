import React from 'react';
import { useCallStore } from '../stores/callStore';
import { useSocket } from '../../../shared/realtime/useSocket';

export const CallControls: React.FC = () => {
  const { activeCall, updateParticipant, setActiveCall } = useCallStore();
  const { send } = useSocket('call');

  if (!activeCall) return null;

  // Find current user's participant state (first participant for demo)
  const me = activeCall.participants[0];
  if (!me) return null;

  const toggle = (
    field: 'isMuted' | 'isCameraOn' | 'isScreenSharing',
    event: string
  ) => {
    const next = !me[field];
    updateParticipant(me.user.id, { [field]: next });
    send(event, { value: next });
  };

  const hangUp = () => {
    send('call:leave', { callId: activeCall.id });
    setActiveCall(null);
  };

  const btnStyle = (active: boolean, danger = false): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '8px 14px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: 'pointer',
    background: danger
      ? 'var(--color-danger)'
      : active
      ? 'var(--color-surface-2)'
      : 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 22,
    transition: 'background var(--transition-fast)',
  });

  return (
    <div
      role="toolbar"
      aria-label="Call controls"
      style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
    >
      <button
        aria-label={me.isMuted ? 'Unmute' : 'Mute'}
        aria-pressed={me.isMuted}
        onClick={() => toggle('isMuted', 'call:mute')}
        style={btnStyle(me.isMuted)}
      >
        {me.isMuted ? '🔇' : '🎙️'}
        <span style={{ fontSize: 11 }}>{me.isMuted ? 'Unmute' : 'Mute'}</span>
      </button>

      {activeCall.type === 'video' && (
        <button
          aria-label={me.isCameraOn ? 'Turn off camera' : 'Turn on camera'}
          aria-pressed={me.isCameraOn}
          onClick={() => toggle('isCameraOn', 'call:camera')}
          style={btnStyle(me.isCameraOn)}
        >
          {me.isCameraOn ? '📸' : '📷'}
          <span style={{ fontSize: 11 }}>{me.isCameraOn ? 'Camera On' : 'Camera Off'}</span>
        </button>
      )}

      <button
        aria-label={me.isScreenSharing ? 'Stop sharing' : 'Share screen'}
        aria-pressed={me.isScreenSharing}
        onClick={() => toggle('isScreenSharing', 'call:screen')}
        style={btnStyle(me.isScreenSharing)}
      >
        🖥️
        <span style={{ fontSize: 11 }}>{me.isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
      </button>

      <button
        aria-label="End call"
        onClick={hangUp}
        style={btnStyle(false, true)}
      >
        📵
        <span style={{ fontSize: 11 }}>End Call</span>
      </button>
    </div>
  );
};
