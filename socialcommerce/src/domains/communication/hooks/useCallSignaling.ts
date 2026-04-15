import { useCallback } from 'react';
import { useChannel } from '../../../shared/realtime/useSocket';
import { useCallStore } from '../stores/callStore';
import type { CallSession, CallParticipant } from '../../../shared/types/domain';

/**
 * Subscribes to call-related WebSocket events and updates the call store.
 */
export function useCallSignaling() {
  const {
    setIncomingCall,
    setActiveCall,
    addParticipant,
    removeParticipant,
    updateParticipant,
    activeCall,
  } = useCallStore();

  const handleIncoming = useCallback(
    (payload: unknown) => {
      setIncomingCall(payload as CallSession);
    },
    [setIncomingCall]
  );

  const handleJoined = useCallback(
    (payload: unknown) => {
      addParticipant(payload as CallParticipant);
    },
    [addParticipant]
  );

  const handleLeft = useCallback(
    (payload: unknown) => {
      const p = payload as { userId: string };
      removeParticipant(p.userId);
      // End call if no participants left (just us)
      if (activeCall && activeCall.participants.length <= 1) {
        setActiveCall(null);
      }
    },
    [removeParticipant, activeCall, setActiveCall]
  );

  const handleParticipantUpdate = useCallback(
    (payload: unknown) => {
      const p = payload as {
        userId: string;
        isMuted?: boolean;
        isCameraOn?: boolean;
        isScreenSharing?: boolean;
      };
      updateParticipant(p.userId, {
        isMuted: p.isMuted,
        isCameraOn: p.isCameraOn,
        isScreenSharing: p.isScreenSharing,
      });
    },
    [updateParticipant]
  );

  const handleEnded = useCallback(() => {
    setActiveCall(null);
  }, [setActiveCall]);

  useChannel('call', 'call:incoming', handleIncoming);
  useChannel('call', 'call:joined', handleJoined);
  useChannel('call', 'call:left', handleLeft);
  useChannel('call', 'call:participant_update', handleParticipantUpdate);
  useChannel('call', 'call:ended', handleEnded);
}
