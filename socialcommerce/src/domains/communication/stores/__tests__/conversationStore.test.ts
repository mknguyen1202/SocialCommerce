import { act } from '@testing-library/react';
import { useConversationStore } from '../conversationStore';

// Snapshot initial state so we can restore it after each test
const INITIAL = useConversationStore.getState();

afterEach(() => {
    act(() => useConversationStore.setState(INITIAL));
});

// ─── setActiveConversation ────────────────────────────────────────────────────

describe('setActiveConversation', () => {
    it('sets the active conversation id', () => {
        act(() => useConversationStore.getState().setActiveConversation('conv-1'));
        expect(useConversationStore.getState().activeConversationId).toBe('conv-1');
    });

    it('clears the active conversation when called with null', () => {
        act(() => {
            useConversationStore.getState().setActiveConversation('conv-1');
            useConversationStore.getState().setActiveConversation(null);
        });
        expect(useConversationStore.getState().activeConversationId).toBeNull();
    });
});

// ─── toggleSidebar ────────────────────────────────────────────────────────────

describe('toggleSidebar', () => {
    it('flips isSidebarCollapsed from false to true', () => {
        expect(useConversationStore.getState().isSidebarCollapsed).toBe(false);
        act(() => useConversationStore.getState().toggleSidebar());
        expect(useConversationStore.getState().isSidebarCollapsed).toBe(true);
    });

    it('flips isSidebarCollapsed back to false on second call', () => {
        act(() => {
            useConversationStore.getState().toggleSidebar();
            useConversationStore.getState().toggleSidebar();
        });
        expect(useConversationStore.getState().isSidebarCollapsed).toBe(false);
    });
});

// ─── pendingMessages ───────────────────────────────────────────────────────────

describe('pending message queue', () => {
    it('addPendingMessage appends a temp id to the correct conversation queue', () => {
        act(() => useConversationStore.getState().addPendingMessage('conv-1', 'temp-1'));
        expect(useConversationStore.getState().pendingMessages['conv-1']).toEqual(['temp-1']);
    });

    it('addPendingMessage accumulates multiple temp ids', () => {
        act(() => {
            useConversationStore.getState().addPendingMessage('conv-1', 'temp-1');
            useConversationStore.getState().addPendingMessage('conv-1', 'temp-2');
        });
        expect(useConversationStore.getState().pendingMessages['conv-1']).toEqual(['temp-1', 'temp-2']);
    });

    it('removePendingMessage removes only the specified temp id', () => {
        act(() => {
            useConversationStore.getState().addPendingMessage('conv-1', 'temp-1');
            useConversationStore.getState().addPendingMessage('conv-1', 'temp-2');
            useConversationStore.getState().removePendingMessage('conv-1', 'temp-1');
        });
        expect(useConversationStore.getState().pendingMessages['conv-1']).toEqual(['temp-2']);
    });

    it('queues for separate conversations are independent', () => {
        act(() => {
            useConversationStore.getState().addPendingMessage('conv-1', 'temp-a');
            useConversationStore.getState().addPendingMessage('conv-2', 'temp-b');
        });
        expect(useConversationStore.getState().pendingMessages['conv-1']).toEqual(['temp-a']);
        expect(useConversationStore.getState().pendingMessages['conv-2']).toEqual(['temp-b']);
    });
});

// ─── typingUsers ──────────────────────────────────────────────────────────────

describe('setTyping', () => {
    it('adds a userId to the typing set for a conversation', () => {
        act(() => useConversationStore.getState().setTyping('conv-1', 'usr-2', true));
        expect(useConversationStore.getState().typingUsers['conv-1'].has('usr-2')).toBe(true);
    });

    it('removes a userId when isTyping is false', () => {
        act(() => {
            useConversationStore.getState().setTyping('conv-1', 'usr-2', true);
            useConversationStore.getState().setTyping('conv-1', 'usr-2', false);
        });
        expect(useConversationStore.getState().typingUsers['conv-1'].has('usr-2')).toBe(false);
    });

    it('multiple users can type in the same conversation simultaneously', () => {
        act(() => {
            useConversationStore.getState().setTyping('conv-1', 'usr-2', true);
            useConversationStore.getState().setTyping('conv-1', 'usr-3', true);
        });
        const set = useConversationStore.getState().typingUsers['conv-1'];
        expect(set.has('usr-2')).toBe(true);
        expect(set.has('usr-3')).toBe(true);
    });

    it('typing state for separate conversations is independent', () => {
        act(() => {
            useConversationStore.getState().setTyping('conv-1', 'usr-2', true);
            useConversationStore.getState().setTyping('conv-2', 'usr-3', true);
        });
        expect(useConversationStore.getState().typingUsers['conv-1']?.has('usr-3')).toBeFalsy();
        expect(useConversationStore.getState().typingUsers['conv-2']?.has('usr-2')).toBeFalsy();
    });
});
