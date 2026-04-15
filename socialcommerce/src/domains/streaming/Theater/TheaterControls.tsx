import React from 'react';
import type { Theater, TheaterStatus } from '../../../shared/types/domain';
import { Button } from '../../../shared/components/Button';
import { useUpdateTheaterStatus } from '../hooks/useTheaters';
import { useSyncPlayback } from '../hooks/useTheaterChat';
import { useStreamingStore } from '../stores/streamingStore';

interface TheaterControlsProps {
  theater: Theater;
}

export const TheaterControls: React.FC<TheaterControlsProps> = ({ theater }) => {
  const updateStatus = useUpdateTheaterStatus();
  const syncPlayback = useSyncPlayback(theater.id);
  const { playback } = useStreamingStore();

  const handleStatusChange = (status: TheaterStatus) => {
    updateStatus.mutate({ theaterId: theater.id, status });
  };

  const handlePlay = () => {
    const pos = playback?.position ?? 0;
    syncPlayback(pos, true);
  };

  const handlePause = () => {
    const pos = playback?.position ?? 0;
    syncPlayback(pos, false);
  };

  return (
    <div
      aria-label="Theater controls"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--color-surface-0)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        flexWrap: 'wrap',
      }}
    >
      {/* Playback controls (for media/URL sources) */}
      {theater.contentSource.type !== 'screen_share' && (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {playback?.isPlaying ? (
            <Button variant="secondary" size="sm" onClick={handlePause} leftIcon="⏸">
              Pause
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={handlePlay} leftIcon="▶">
              Play
            </Button>
          )}
        </div>
      )}

      {/* Theater lifecycle controls */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginLeft: 'auto' }}>
        {theater.status === 'created' && (
          <Button
            variant="primary"
            size="sm"
            isLoading={updateStatus.isPending}
            onClick={() => handleStatusChange('live')}
          >
            🔴 Go Live
          </Button>
        )}

        {theater.status === 'live' && (
          <Button
            variant="secondary"
            size="sm"
            isLoading={updateStatus.isPending}
            onClick={() => handleStatusChange('paused')}
          >
            ⏸ Pause Stream
          </Button>
        )}

        {theater.status === 'paused' && (
          <Button
            variant="primary"
            size="sm"
            isLoading={updateStatus.isPending}
            onClick={() => handleStatusChange('live')}
          >
            ▶ Resume Stream
          </Button>
        )}

        {(theater.status === 'live' || theater.status === 'paused') && (
          <Button
            variant="danger"
            size="sm"
            isLoading={updateStatus.isPending}
            onClick={() => handleStatusChange('ended')}
          >
            End Stream
          </Button>
        )}
      </div>
    </div>
  );
};
