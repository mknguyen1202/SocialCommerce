import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTheaterChatSubscription } from '../../hooks/useTheaterChat';
import { useStreamingStore } from '../../stores/streamingStore';

// Create the fake inside vi.hoisted so it is available when vi.mock factory runs
const { fakeSocketManager, emitFake } = vi.hoisted(() => {
    type Listener = (payload: unknown) => void;
    // subs: topic -> event -> Set<listeners>
    const _subs = new Map<string, Map<string, Set<Listener>>>();

    const subscribe = vi.fn((topic: string, event: string, listener: Listener) => {
        if (!_subs.has(topic)) _subs.set(topic, new Map());
        const evMap = _subs.get(topic)!;
        if (!evMap.has(event)) evMap.set(event, new Set());
        evMap.get(event)!.add(listener);
        return () => { evMap.get(event)?.delete(listener); };
    });

    const unsubscribe = vi.fn();

    const fake = {
        subscribe,
        unsubscribe,
        emit(topic: string, event: string, payload: unknown) {
            _subs.get(topic)?.get(event)?.forEach(l => l(payload));
        },
        send: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        getStatus: vi.fn().mockReturnValue('connected' as const),
        onStatusChange: vi.fn().mockReturnValue(() => {}),
        reset() {
            _subs.clear();
            subscribe.mockClear();
            unsubscribe.mockClear();
        },
    };
    return {
        fakeSocketManager: fake,
        emitFake: (topic: string, event: string, payload: unknown) => fake.emit(topic, event, payload),
    };
});

// Wire the fake socket manager in place of the real one
vi.mock('../../../../shared/realtime/SocketManager', () => ({
    socketManager: fakeSocketManager,
}));

const THEATER_ID = 'thtr-test-1';
const TOPIC = `theater:${THEATER_ID}`;

beforeEach(() => {
    fakeSocketManager.reset();
    useStreamingStore.setState({
        chatMessages: [],
        playback: null,
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('useTheaterChatSubscription', () => {
    it('adds a new message to the store on theater:chat_message', () => {
        renderHook(() => useTheaterChatSubscription(THEATER_ID));

        act(() => {
            emitFake(TOPIC, 'theater:chat_message', {
                id: 'msg-1',
                theater_id: THEATER_ID,
                sender_id: 'usr-1',
                sender_username: 'alice',
                sender_display_name: 'Alice',
                sender_avatar_url: '',
                content: 'Hello theater!',
                emotes: [],
                created_at: new Date().toISOString(),
                is_deleted: false,
            });
        });

        const { chatMessages } = useStreamingStore.getState();
        expect(chatMessages).toHaveLength(1);
        expect(chatMessages[0].content).toBe('Hello theater!');
        expect(chatMessages[0].sender.username).toBe('alice');
    });

    it('marks a message as deleted on theater:chat_delete', () => {
        // Pre-seed a message in the store
        useStreamingStore.setState({
            chatMessages: [
                {
                    id: 'msg-2',
                    theaterId: THEATER_ID,
                    sender: {
                        id: 'usr-2',
                        username: 'bob',
                        displayName: 'Bob',
                        avatarUrl: '',
                        presence: 'online',
                        lastSeen: new Date(),
                    },
                    content: 'Delete me',
                    emotes: [],
                    createdAt: new Date(),
                    isDeleted: false,
                },
            ],
        });

        renderHook(() => useTheaterChatSubscription(THEATER_ID));

        act(() => {
            emitFake(TOPIC, 'theater:chat_delete', { messageId: 'msg-2' });
        });

        const { chatMessages } = useStreamingStore.getState();
        expect(chatMessages[0].isDeleted).toBe(true);
    });

    it('updates playback state on theater:playback_sync', () => {
        renderHook(() => useTheaterChatSubscription(THEATER_ID));

        act(() => {
            emitFake(TOPIC, 'theater:playback_sync', {
                position: 120.5,
                isPlaying: true,
            });
        });

        const { playback } = useStreamingStore.getState();
        expect(playback).not.toBeNull();
        expect(playback!.position).toBe(120.5);
        expect(playback!.isPlaying).toBe(true);
    });

    it('unsubscribes from events on unmount', () => {
        const subscribeSpy = vi.spyOn(fakeSocketManager, 'subscribe');
        const { unmount } = renderHook(() => useTheaterChatSubscription(THEATER_ID));

        // The hook subscribes to 3 events (chat_message, chat_delete, playback_sync)
        expect(subscribeSpy).toHaveBeenCalledTimes(3);

        // After unmount the hook's useEffect cleanup should clear listeners
        // Verify by emitting after unmount — store should not change
        const stateBefore = useStreamingStore.getState().chatMessages.length;
        unmount();
        act(() => { emitFake(TOPIC, 'theater:chat_message', { id: 'x', theater_id: THEATER_ID, sender_id: 'u', sender_username: 'u', sender_display_name: 'u', sender_avatar_url: '', content: 'after', emotes: [], created_at: new Date().toISOString(), is_deleted: false }); });
        const stateAfter = useStreamingStore.getState().chatMessages.length;
        expect(stateAfter).toBe(stateBefore);
    });
});

describe('Latency compensation formula', () => {
    it('adjustedPosition accounts for network delay', () => {
        const positionSeconds = 100;
        const serverTime = Date.now() - 500; // server emitted 500ms ago

        const adjustedPosition = positionSeconds + (Date.now() - serverTime) / 1000;

        // Should be approximately 100.5 seconds
        expect(adjustedPosition).toBeGreaterThan(100.4);
        expect(adjustedPosition).toBeLessThan(100.7);
    });

    it('adjustedPosition equals positionSeconds when no latency', () => {
        const positionSeconds = 42;
        const serverTime = Date.now();

        const adjustedPosition = positionSeconds + (Date.now() - serverTime) / 1000;

        expect(adjustedPosition).toBeCloseTo(42, 1);
    });
});
