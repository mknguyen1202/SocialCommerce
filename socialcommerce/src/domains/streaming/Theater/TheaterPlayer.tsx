import React, { useRef, useEffect } from 'react';
import type { Theater, PlaybackState } from '../../../shared/types/domain';

interface TheaterPlayerProps {
  theater: Theater;
  playback: PlaybackState | null;
  isHost: boolean;
  onSeek?: (position: number) => void;
}

export const TheaterPlayer: React.FC<TheaterPlayerProps> = ({
  theater,
  playback,
  isHost,
  onSeek,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playback || isHost) return;
    const drift = Math.abs(video.currentTime - playback.position);
    if (drift > 2) video.currentTime = playback.position;
    if (playback.isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!playback.isPlaying && !video.paused) {
      video.pause();
    }
  }, [playback, isHost]);

  const isEnded = theater.status === 'ended';
  const isCreated = theater.status === 'created';
  const isPaused = theater.status === 'paused';
  const src = theater.contentSource.url ?? '';

  if (theater.contentSource.type === 'screen_share') {
    const icon = isEnded ? '🔚' : isPaused ? '⏸' : theater.status === 'live' ? '📡' : '📺';
    const label = isEnded
      ? 'Stream ended'
      : isPaused
      ? 'Stream paused'
      : theater.status === 'live'
      ? 'Screen share active'
      : isHost
      ? 'Start streaming to go live'
      : 'Stream starting soon…';
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          color: 'var(--color-text-muted)',
        }}
      >
        <span style={{ fontSize: 52 }}>{icon}</span>
        <p style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>{label}</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', position: 'relative' }}>
      {src ? (
        <video
          ref={videoRef}
          src={src}
          controls={isHost}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onSeeked={() => {
            if (isHost && videoRef.current && onSeek) {
              onSeek(videoRef.current.currentTime);
            }
          }}
          aria-label={theater.title}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            color: 'var(--color-text-muted)',
          }}
        >
          <span style={{ fontSize: 52 }}>🎬</span>
          <p style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>
            {isEnded
              ? 'Stream ended'
              : isCreated && isHost
              ? 'Go live to start the stream'
              : 'Waiting for host…'}
          </p>
        </div>
      )}
    </div>
  );
};
