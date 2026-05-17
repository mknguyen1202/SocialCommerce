import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TheaterPlayer } from '../TheaterPlayer';
import { installVideoMocks, videoMocks, TEST_VIDEO_SRC } from '../../../../test/mockVideo';
import type { Theater, PlaybackState, DomainUser } from '../../../../shared/types/domain';

// ─── Shared test fixtures ─────────────────────────────────────────────────────

const mockHost: DomainUser = {
    id: 'user-host',
    username: 'hostuser',
    displayName: 'Host User',
    avatarUrl: '',
    presence: 'online',
    lastSeen: new Date(),
};

function makeTheater(overrides: Partial<Theater> = {}): Theater {
    return {
        id: 'theater-1',
        host: mockHost,
        title: 'Test Stream',
        description: '',
        category: 'gaming',
        tags: [],
        visibility: 'public',
        status: 'live',
        contentSource: { type: 'external_url', url: TEST_VIDEO_SRC },
        viewerCount: 10,
        createdAt: new Date(),
        ...overrides,
    };
}

function makePlayback(overrides: Partial<PlaybackState> = {}): PlaybackState {
    return {
        position: 0,
        isPlaying: true,
        updatedAt: new Date(),
        ...overrides,
    };
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
    installVideoMocks();
});

afterEach(() => {
    videoMocks.reset();
    vi.restoreAllMocks();  // restores vi.spyOn patches on HTMLMediaElement.prototype
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TheaterPlayer — video element', () => {
    it('renders a <video> element with the correct src from the test MP4 fixture', () => {
        render(
            <TheaterPlayer
                theater={makeTheater()}
                playback={null}
                isHost={false}
            />
        );

        const videoEl = document.querySelector('video') as HTMLVideoElement;
        expect(videoEl).not.toBeNull();
        // jsdom sets the full URL so check with toContain
        expect(videoEl.src).toContain('test-video.mp4');
    });

    it('shows native controls for the host', () => {
        render(
            <TheaterPlayer theater={makeTheater()} playback={null} isHost={true} />
        );

        const videoEl = document.querySelector('video') as HTMLVideoElement;
        expect(videoEl.controls).toBe(true);
    });

    it('does not show native controls for a viewer', () => {
        render(
            <TheaterPlayer theater={makeTheater()} playback={null} isHost={false} />
        );

        const videoEl = document.querySelector('video') as HTMLVideoElement;
        expect(videoEl.controls).toBe(false);
    });

    it('uses the theater title as the video aria-label', () => {
        render(
            <TheaterPlayer
                theater={makeTheater({ title: 'My Gaming Stream' })}
                playback={null}
                isHost={false}
            />
        );

        expect(document.querySelector('video')?.getAttribute('aria-label')).toBe('My Gaming Stream');
    });
});

describe('TheaterPlayer — viewer playback sync with mock video', () => {
    it('calls play() when playback.isPlaying=true and video is paused', async () => {
        // Start paused (default)
        videoMocks.setPaused(true);

        render(
            <TheaterPlayer
                theater={makeTheater()}
                playback={makePlayback({ isPlaying: true })}
                isHost={false}
            />
        );

        await waitFor(() => {
            expect(videoMocks.play).toHaveBeenCalledOnce();
        });
        expect(videoMocks.pause).not.toHaveBeenCalled();
    });

    it('calls pause() when playback.isPlaying=false and video is playing', async () => {
        // Simulate video already playing
        videoMocks.setPaused(false);

        render(
            <TheaterPlayer
                theater={makeTheater()}
                playback={makePlayback({ isPlaying: false })}
                isHost={false}
            />
        );

        await waitFor(() => {
            expect(videoMocks.pause).toHaveBeenCalledOnce();
        });
        expect(videoMocks.play).not.toHaveBeenCalled();
    });

    it('does not call play() or pause() when playback state already matches', async () => {
        // Video already paused, playback says paused → no action
        videoMocks.setPaused(true);

        render(
            <TheaterPlayer
                theater={makeTheater()}
                playback={makePlayback({ isPlaying: false })}
                isHost={false}
            />
        );

        // Give the effect time to run
        await act(async () => {});

        expect(videoMocks.play).not.toHaveBeenCalled();
        expect(videoMocks.pause).not.toHaveBeenCalled();
    });

    it('seeks (sets currentTime) when drift exceeds 2 seconds', async () => {
        videoMocks.setCurrentTime(10);   // video is at 10 s
        videoMocks.setPaused(true);

        render(
            <TheaterPlayer
                theater={makeTheater()}
                playback={makePlayback({ position: 30, isPlaying: false })} // 20 s drift
                isHost={false}
            />
        );

        await waitFor(() => {
            // currentTime should have been set to the playback position
            expect(videoMocks.setCurrentTime).toBeDefined();
        });

        // After the effect, currentTime should equal the playback position
        const videoEl = document.querySelector('video') as HTMLVideoElement;
        expect(videoEl.currentTime).toBe(30);
    });

    it('does NOT seek when drift is within the 2-second tolerance', async () => {
        videoMocks.setCurrentTime(10);   // video at 10 s
        videoMocks.setPaused(false);

        render(
            <TheaterPlayer
                theater={makeTheater()}
                playback={makePlayback({ position: 11, isPlaying: true })} // 1 s drift — OK
                isHost={false}
            />
        );

        await act(async () => {});

        const videoEl = document.querySelector('video') as HTMLVideoElement;
        // Should still be at 10, not jumped to 11
        expect(videoEl.currentTime).toBe(10);
    });

    it('does not apply sync logic for the host', async () => {
        videoMocks.setCurrentTime(0);
        videoMocks.setPaused(true);

        render(
            <TheaterPlayer
                theater={makeTheater()}
                playback={makePlayback({ position: 60, isPlaying: true })}
                isHost={true}   // host — effect exits early
            />
        );

        await act(async () => {});

        expect(videoMocks.play).not.toHaveBeenCalled();
        expect(videoMocks.pause).not.toHaveBeenCalled();
        // currentTime was not changed by the sync logic
        const videoEl = document.querySelector('video') as HTMLVideoElement;
        expect(videoEl.currentTime).toBe(0);
    });

    it('re-syncs when playback state updates (seek during live stream)', async () => {
        videoMocks.setCurrentTime(50);
        videoMocks.setPaused(false);

        const { rerender } = render(
            <TheaterPlayer
                theater={makeTheater()}
                playback={makePlayback({ position: 50, isPlaying: true })}
                isHost={false}
            />
        );

        await act(async () => {});
        // Initial render: no seek (drift = 0), already playing
        expect(videoMocks.play).not.toHaveBeenCalled();

        // Host seeks to 90 s (e.g. after ad break) — viewer must jump
        videoMocks.setCurrentTime(50); // video hasn't caught up yet
        rerender(
            <TheaterPlayer
                theater={makeTheater()}
                playback={makePlayback({ position: 90, isPlaying: true })}
                isHost={false}
            />
        );

        await waitFor(() => {
            expect(document.querySelector('video')!.currentTime).toBe(90);
        });
    });
});

describe('TheaterPlayer — onSeek callback for host', () => {
    it('fires onSeek with the video currentTime when host seeks', async () => {
        const onSeek = vi.fn();
        videoMocks.setCurrentTime(0);

        render(
            <TheaterPlayer
                theater={makeTheater()}
                playback={null}
                isHost={true}
                onSeek={onSeek}
            />
        );

        const videoEl = document.querySelector('video') as HTMLVideoElement;

        // Simulate the host dragging the scrubber — currentTime changes then 'seeked' fires
        videoMocks.setCurrentTime(45);
        fireEvent(videoEl, new Event('seeked'));

        expect(onSeek).toHaveBeenCalledOnce();
        expect(onSeek).toHaveBeenCalledWith(45);
    });

    it('does not fire onSeek for a viewer', async () => {
        const onSeek = vi.fn();

        render(
            <TheaterPlayer
                theater={makeTheater()}
                playback={null}
                isHost={false}
                onSeek={onSeek}
            />
        );

        const videoEl = document.querySelector('video') as HTMLVideoElement;
        videoMocks.setCurrentTime(20);
        fireEvent(videoEl, new Event('seeked'));

        // onSeek handler is only wired when isHost=true
        expect(onSeek).not.toHaveBeenCalled();
    });
});

describe('TheaterPlayer — screen_share placeholder', () => {
    const screenShareTheater = makeTheater({
        contentSource: { type: 'screen_share' },
    });

    it('renders a placeholder (no <video>) for screen_share content', () => {
        render(
            <TheaterPlayer theater={screenShareTheater} playback={null} isHost={false} />
        );

        expect(document.querySelector('video')).toBeNull();
    });

    it('shows "Screen share active" when live', () => {
        render(
            <TheaterPlayer
                theater={{ ...screenShareTheater, status: 'live' }}
                playback={null}
                isHost={false}
            />
        );

        expect(screen.getByText('Screen share active')).toBeInTheDocument();
    });

    it('shows "Stream paused" when paused', () => {
        render(
            <TheaterPlayer
                theater={{ ...screenShareTheater, status: 'paused' }}
                playback={null}
                isHost={false}
            />
        );

        expect(screen.getByText('Stream paused')).toBeInTheDocument();
    });

    it('shows "Stream ended" when ended', () => {
        render(
            <TheaterPlayer
                theater={{ ...screenShareTheater, status: 'ended' }}
                playback={null}
                isHost={false}
            />
        );

        expect(screen.getByText('Stream ended')).toBeInTheDocument();
    });

    it('shows host prompt when created and user is host', () => {
        render(
            <TheaterPlayer
                theater={{ ...screenShareTheater, status: 'created' }}
                playback={null}
                isHost={true}
            />
        );

        expect(screen.getByText('Start streaming to go live')).toBeInTheDocument();
    });
});

describe('TheaterPlayer — empty src fallback', () => {
    it('shows "Go live" prompt to host when no src is set', () => {
        const theater = makeTheater({
            status: 'created',
            contentSource: { type: 'external_url', url: undefined },
        });

        render(<TheaterPlayer theater={theater} playback={null} isHost={true} />);

        expect(screen.getByText('Go live to start the stream')).toBeInTheDocument();
    });
});
