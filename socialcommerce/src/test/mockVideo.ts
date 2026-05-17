/**
 * mockVideo.ts
 *
 * Utilities for testing components that use <video> / HTMLMediaElement.
 *
 * jsdom does not implement actual media decoding or playback, so this module:
 *  1. Provides a stable test video source URL (served from /public in Vite).
 *  2. Installs prototype-level mocks for play(), pause(), currentTime, and
 *     the read-only `paused` property so test assertions work correctly.
 *
 * Usage
 * -----
 *   import { installVideoMocks, videoMocks, TEST_VIDEO_SRC } from '../../../test/mockVideo';
 *
 *   beforeEach(() => { installVideoMocks(); });
 *   afterEach(() => { videoMocks.reset(); });
 *
 * The file `public/test-video.mp4` is a real 32-byte MP4 container (ftyp + free
 * boxes) so it is a genuine MP4, even though jsdom never decodes it.
 */

import { vi, type MockInstance } from 'vitest';

/** URL of the real MP4 fixture in public/. Vite serves it at this path. */
export const TEST_VIDEO_SRC = '/test-video.mp4';

// ─── Internal mutable state ────────────────────────────────────────────────────

let _paused = true;
let _currentTime = 0;
let _playSpy: MockInstance | null = null;
let _pauseSpy: MockInstance | null = null;

// ─── Exported accessors (always read from the current spy) ────────────────────

export const videoMocks = {
    get play(): MockInstance { return _playSpy!; },
    get pause(): MockInstance { return _pauseSpy!; },

    setCurrentTime(t: number) { _currentTime = t; },
    setPaused(p: boolean) { _paused = p; },

    reset() {
        _paused = true;
        _currentTime = 0;
        _playSpy?.mockClear();
        _pauseSpy?.mockClear();
    },
};

// ─── Installer ─────────────────────────────────────────────────────────────────

/**
 * Installs HTMLMediaElement prototype mocks via vi.spyOn so they properly
 * intercept calls on any <video> element rendered during tests.
 * Call in beforeEach; pair with vi.restoreAllMocks() or videoMocks.reset() in afterEach.
 */
export function installVideoMocks(): void {
    _playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function () {
        _paused = false;
        return Promise.resolve();
    });

    _pauseSpy = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function () {
        _paused = true;
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
        get: () => _paused,
        configurable: true,
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
        get: () => _currentTime,
        set: (v: number) => { _currentTime = v; },
        configurable: true,
    });
}

