import { act } from '@testing-library/react';
import { useStreamingStore } from '../streamingStore';
import type { TheaterChatMessage } from '../../../../shared/types/domain';

const INITIAL = useStreamingStore.getState();

afterEach(() => {
    act(() => useStreamingStore.setState(INITIAL));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMsg(id: string): TheaterChatMessage {
    return {
        id,
        theaterId: 'thtr-1',
        sender: { id: 'usr-1', username: 'alexj', displayName: 'Alex', avatarUrl: '', presence: 'online', lastSeen: new Date() },
        content: `Message ${id}`,
        emotes: [],
        createdAt: new Date(),
        isDeleted: false,
    };
}

// ─── chat messages ────────────────────────────────────────────────────────────

describe('addChatMessage', () => {
    it('appends a message to the chat list', () => {
        act(() => useStreamingStore.getState().addChatMessage(makeMsg('msg-1')));
        expect(useStreamingStore.getState().chatMessages).toHaveLength(1);
        expect(useStreamingStore.getState().chatMessages[0].id).toBe('msg-1');
    });

    it('keeps at most 500 messages (drops oldest when over cap)', () => {
        act(() => {
            for (let i = 0; i < 502; i++) {
                useStreamingStore.getState().addChatMessage(makeMsg(`msg-${i}`));
            }
        });
        const msgs = useStreamingStore.getState().chatMessages;
        expect(msgs.length).toBe(500);
        // The newest message should be the last one added
        expect(msgs[msgs.length - 1].id).toBe('msg-501');
    });
});

describe('deleteChatMessage', () => {
    it('marks the message as isDeleted=true (does not remove it from the list)', () => {
        act(() => {
            useStreamingStore.getState().addChatMessage(makeMsg('msg-1'));
            useStreamingStore.getState().deleteChatMessage('msg-1');
        });
        const msgs = useStreamingStore.getState().chatMessages;
        expect(msgs).toHaveLength(1);
        expect(msgs[0].isDeleted).toBe(true);
    });

    it('leaves unrelated messages intact', () => {
        act(() => {
            useStreamingStore.getState().addChatMessage(makeMsg('msg-1'));
            useStreamingStore.getState().addChatMessage(makeMsg('msg-2'));
            useStreamingStore.getState().deleteChatMessage('msg-1');
        });
        expect(useStreamingStore.getState().chatMessages.find((m) => m.id === 'msg-2')?.isDeleted).toBe(false);
    });
});

describe('clearChat', () => {
    it('removes all messages', () => {
        act(() => {
            useStreamingStore.getState().addChatMessage(makeMsg('msg-1'));
            useStreamingStore.getState().addChatMessage(makeMsg('msg-2'));
            useStreamingStore.getState().clearChat();
        });
        expect(useStreamingStore.getState().chatMessages).toHaveLength(0);
    });
});

// ─── playback ─────────────────────────────────────────────────────────────────

describe('setPlayback', () => {
    it('stores playback state', () => {
        const state = { position: 120, isPlaying: true, updatedAt: new Date() };
        act(() => useStreamingStore.getState().setPlayback(state));
        expect(useStreamingStore.getState().playback?.position).toBe(120);
        expect(useStreamingStore.getState().playback?.isPlaying).toBe(true);
    });

    it('overwrites previous playback state', () => {
        act(() => {
            useStreamingStore.getState().setPlayback({ position: 10, isPlaying: true, updatedAt: new Date() });
            useStreamingStore.getState().setPlayback({ position: 60, isPlaying: false, updatedAt: new Date() });
        });
        expect(useStreamingStore.getState().playback?.position).toBe(60);
        expect(useStreamingStore.getState().playback?.isPlaying).toBe(false);
    });
});

// ─── create modal ─────────────────────────────────────────────────────────────

describe('create theater modal', () => {
    it('openCreateModal sets isCreateModalOpen=true', () => {
        act(() => useStreamingStore.getState().openCreateModal());
        expect(useStreamingStore.getState().isCreateModalOpen).toBe(true);
    });

    it('closeCreateModal sets isCreateModalOpen=false', () => {
        act(() => {
            useStreamingStore.getState().openCreateModal();
            useStreamingStore.getState().closeCreateModal();
        });
        expect(useStreamingStore.getState().isCreateModalOpen).toBe(false);
    });
});

// ─── PiP ──────────────────────────────────────────────────────────────────────

describe('setPiPActive', () => {
    it('sets isPiPActive to true', () => {
        act(() => useStreamingStore.getState().setPiPActive(true));
        expect(useStreamingStore.getState().isPiPActive).toBe(true);
    });

    it('sets isPiPActive to false', () => {
        act(() => {
            useStreamingStore.getState().setPiPActive(true);
            useStreamingStore.getState().setPiPActive(false);
        });
        expect(useStreamingStore.getState().isPiPActive).toBe(false);
    });
});

// ─── filters ──────────────────────────────────────────────────────────────────

describe('setCategoryFilter', () => {
    it('stores a category filter string', () => {
        act(() => useStreamingStore.getState().setCategoryFilter('Gaming'));
        expect(useStreamingStore.getState().categoryFilter).toBe('Gaming');
    });

    it('clears the category filter when called with null', () => {
        act(() => {
            useStreamingStore.getState().setCategoryFilter('Gaming');
            useStreamingStore.getState().setCategoryFilter(null);
        });
        expect(useStreamingStore.getState().categoryFilter).toBeNull();
    });
});

describe('setSearchQuery', () => {
    it('stores the search query', () => {
        act(() => useStreamingStore.getState().setSearchQuery('lofi hip hop'));
        expect(useStreamingStore.getState().searchQuery).toBe('lofi hip hop');
    });

    it('can be cleared back to empty string', () => {
        act(() => {
            useStreamingStore.getState().setSearchQuery('lofi hip hop');
            useStreamingStore.getState().setSearchQuery('');
        });
        expect(useStreamingStore.getState().searchQuery).toBe('');
    });
});
