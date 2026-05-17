import React, { useRef, useEffect, useState } from 'react';
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
  const [isMuted, setIsMuted] = useState(true);

  // Viewer auto-start: rely on the `autoPlay` HTML attribute rather than
  // calling video.play() imperatively. The browser defers playback until
  // enough data is buffered, so this is far more reliable than a useEffect.
  // The `muted` attribute satisfies the browser's autoplay policy.
  const viewerAutoPlay = !isHost && theater.status === 'live';

  // Sync-to-server playback position/state (received via WebSocket).
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

  // Keep the video element's muted property in sync with our state.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

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
        <>
          <video
            ref={videoRef}
            src={src}
            muted={isMuted}
            autoPlay={viewerAutoPlay}
            playsInline
            controls={isHost}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onSeeked={() => {
              if (isHost && videoRef.current && onSeek) {
                onSeek(videoRef.current.currentTime);
              }
            }}
            aria-label={theater.title}
          />
          {/* Unmute button — shown to viewers when audio is muted and theater is live */}
          {!isHost && isMuted && theater.status === 'live' && (
            <button
              onClick={() => setIsMuted(false)}
              aria-label="Unmute"
              style={{
                position: 'absolute',
                bottom: 'var(--space-3)',
                left: 'var(--space-3)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: '6px 12px',
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                backdropFilter: 'blur(4px)',
              }}
            >
              🔇 Tap to unmute
            </button>
          )}
        </>
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
