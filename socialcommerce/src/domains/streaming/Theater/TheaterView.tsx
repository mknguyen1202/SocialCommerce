import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheater, useTheaterParticipants, useJoinTheater, useLeaveTheater, useKickParticipant, useMuteParticipantChat } from '../hooks/useTheaters';
import { useSyncPlayback } from '../hooks/useTheaterChat';
import { useStreamingStore } from '../stores/streamingStore';
import { useAuthContext } from '../../../app/providers/AuthProvider';
import { TheaterPlayer } from './TheaterPlayer';
import { TheaterControls } from './TheaterControls';
import { TheaterInfo } from './TheaterInfo';
import { TheaterParticipants } from './TheaterParticipants';
import { ChatPanel } from './TheaterChat/ChatPanel';
import { Skeleton } from '../../../shared/components/Skeleton';
import { Button } from '../../../shared/components/Button';

export const TheaterView: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { data: theater, isLoading, isError } = useTheater(id);
  const { data: participants, isLoading: participantsLoading } = useTheaterParticipants(id);
  const joinTheater = useJoinTheater();
  const leaveTheater = useLeaveTheater();
  const kickParticipant = useKickParticipant();
  const muteChat = useMuteParticipantChat();
  const syncPlayback = useSyncPlayback(id);
  const { playback, setActiveTheaterId, setPiPActive } = useStreamingStore();
  const [showParticipants, setShowParticipants] = useState(false);

  const isHost = !!user && !!theater && theater.host.id === user.id;
  const myParticipant = participants?.find((p) => p.user.id === user?.id);
  const canModerate = isHost || myParticipant?.role === 'moderator';

  // Register active theater for PiP
  useEffect(() => {
    if (id) setActiveTheaterId(id);
    return () => setPiPActive(false);
  }, [id, setActiveTheaterId, setPiPActive]);

  // Auto-join on mount for viewers
  useEffect(() => {
    if (theater && !isHost && !myParticipant) {
      joinTheater.mutate(id);
    }
  }, [theater?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-6)' }}>
        <Skeleton variant="rect" width="100%" height={360} />
        <Skeleton variant="rect" width="60%" height={28} />
        <Skeleton variant="rect" width="40%" height={18} />
      </div>
    );
  }

  if (isError || !theater) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <span style={{ fontSize: 48 }}>🎬</span>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-md)' }}>Theater not found.</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/streaming')}>
          Back to Discovery
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Player */}
        <div style={{ flexShrink: 0 }}>
          <TheaterPlayer
            theater={theater}
            playback={playback}
            isHost={isHost}
            onSeek={(pos) => syncPlayback(pos, true)}
          />
        </div>

        {/* Host controls */}
        {isHost && <TheaterControls theater={theater} />}

        {/* Info + participants toggle */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <TheaterInfo theater={theater} />

          {/* Participants section */}
          <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
            <button
              onClick={() => setShowParticipants((s) => !s)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
                padding: 0,
              }}
              aria-expanded={showParticipants}
            >
              <span>{showParticipants ? '▾' : '▸'}</span>
              Viewers ({participants?.length ?? 0})
            </button>

            {showParticipants && (
              <TheaterParticipants
                participants={participants}
                isLoading={participantsLoading}
                canModerate={canModerate}
                onKick={(userId) => kickParticipant.mutate({ theaterId: id, userId })}
                onMuteChat={(userId, mute) => muteChat.mutate({ theaterId: id, userId, mute })}
              />
            )}
          </div>
        </div>

        {/* Leave button for viewers */}
        {!isHost && myParticipant && theater.status !== 'ended' && (
          <div style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { leaveTheater.mutate(id); navigate('/streaming'); }}
            >
              Leave Theater
            </Button>
          </div>
        )}
      </div>

      {/* Chat panel */}
      <ChatPanel theater={theater} canModerate={canModerate} />
    </div>
  );
};
