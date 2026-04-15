import { act } from '@testing-library/react';
import { useCallStore } from '../callStore';
import type { CallSession, CallParticipant } from '../../../../shared/types/domain';

const INITIAL = useCallStore.getState();

afterEach(() => {
    act(() => useCallStore.setState(INITIAL));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(id: string) {
    return { id, username: id, displayName: id, avatarUrl: '', presence: 'online' as const, lastSeen: new Date() };
}

function makeParticipant(userId: string): CallParticipant {
    return { user: makeUser(userId), isMuted: false, isDeafened: false, isCameraOn: true, isScreenSharing: false, joinedAt: new Date() };
}

function makeCall(id: string, participantIds: string[] = []): CallSession {
    return {
        id,
        conversationId: id,
        type: 'voice',
        status: 'active',
        participants: participantIds.map(makeParticipant),
        startedAt: new Date(),
    };
}

// ─── setActiveCall / setIncomingCall / setMinimized ──────────────────────────

describe('setActiveCall', () => {
    it('stores a call session', () => {
        const call = makeCall('call-1');
        act(() => useCallStore.getState().setActiveCall(call));
        expect(useCallStore.getState().activeCall?.id).toBe('call-1');
    });

    it('clears the incoming call when a call becomes active', () => {
        act(() => {
            useCallStore.getState().setIncomingCall(makeCall('call-1'));
            useCallStore.getState().setActiveCall(makeCall('call-1'));
        });
        expect(useCallStore.getState().incomingCall).toBeNull();
    });

    it('accepts null to clear the active call', () => {
        act(() => {
            useCallStore.getState().setActiveCall(makeCall('call-1'));
            useCallStore.getState().setActiveCall(null);
        });
        expect(useCallStore.getState().activeCall).toBeNull();
    });
});

describe('setIncomingCall', () => {
    it('stores the incoming call session', () => {
        const call = makeCall('call-2');
        act(() => useCallStore.getState().setIncomingCall(call));
        expect(useCallStore.getState().incomingCall?.id).toBe('call-2');
    });
});

describe('setMinimized', () => {
    it('sets isMinimized to true', () => {
        act(() => useCallStore.getState().setMinimized(true));
        expect(useCallStore.getState().isMinimized).toBe(true);
    });

    it('sets isMinimized back to false', () => {
        act(() => {
            useCallStore.getState().setMinimized(true);
            useCallStore.getState().setMinimized(false);
        });
        expect(useCallStore.getState().isMinimized).toBe(false);
    });
});

// ─── addParticipant ───────────────────────────────────────────────────────────

describe('addParticipant', () => {
    it('appends a new participant to the active call', () => {
        act(() => {
            useCallStore.getState().setActiveCall(makeCall('call-1', ['usr-1']));
            useCallStore.getState().addParticipant(makeParticipant('usr-2'));
        });
        expect(useCallStore.getState().activeCall?.participants).toHaveLength(2);
    });

    it('does not add a duplicate participant', () => {
        act(() => {
            useCallStore.getState().setActiveCall(makeCall('call-1', ['usr-1']));
            useCallStore.getState().addParticipant(makeParticipant('usr-1'));
        });
        expect(useCallStore.getState().activeCall?.participants).toHaveLength(1);
    });

    it('is a no-op when no active call exists', () => {
        act(() => useCallStore.getState().addParticipant(makeParticipant('usr-1')));
        expect(useCallStore.getState().activeCall).toBeNull();
    });
});

// ─── removeParticipant ────────────────────────────────────────────────────────

describe('removeParticipant', () => {
    it('removes the participant matching the userId', () => {
        act(() => {
            useCallStore.getState().setActiveCall(makeCall('call-1', ['usr-1', 'usr-2']));
            useCallStore.getState().removeParticipant('usr-1');
        });
        const ids = useCallStore.getState().activeCall?.participants.map((p) => p.user.id);
        expect(ids).toEqual(['usr-2']);
    });

    it('is a no-op for a userId not in the participants list', () => {
        act(() => {
            useCallStore.getState().setActiveCall(makeCall('call-1', ['usr-1']));
            useCallStore.getState().removeParticipant('usr-99');
        });
        expect(useCallStore.getState().activeCall?.participants).toHaveLength(1);
    });
});

// ─── updateParticipant ────────────────────────────────────────────────────────

describe('updateParticipant', () => {
    it('patches isMuted on the matching participant', () => {
        act(() => {
            useCallStore.getState().setActiveCall(makeCall('call-1', ['usr-1', 'usr-2']));
            useCallStore.getState().updateParticipant('usr-1', { isMuted: true });
        });
        const p = useCallStore.getState().activeCall?.participants.find((x) => x.user.id === 'usr-1');
        expect(p?.isMuted).toBe(true);
    });

    it('does not mutate other participants', () => {
        act(() => {
            useCallStore.getState().setActiveCall(makeCall('call-1', ['usr-1', 'usr-2']));
            useCallStore.getState().updateParticipant('usr-1', { isCameraOn: false });
        });
        const p2 = useCallStore.getState().activeCall?.participants.find((x) => x.user.id === 'usr-2');
        expect(p2?.isCameraOn).toBe(true);
    });

    it('is a no-op when no active call exists', () => {
        act(() => useCallStore.getState().updateParticipant('usr-1', { isMuted: true }));
        expect(useCallStore.getState().activeCall).toBeNull();
    });
});
