import { create } from 'zustand';
import type { CallSession, CallParticipant } from '../../../shared/types/domain';

interface CallState {
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  isMinimized: boolean;

  setActiveCall: (call: CallSession | null) => void;
  setIncomingCall: (call: CallSession | null) => void;
  setMinimized: (minimized: boolean) => void;

  updateParticipant: (userId: string, updates: Partial<Omit<CallParticipant, 'user' | 'joinedAt'>>) => void;
  addParticipant: (participant: CallParticipant) => void;
  removeParticipant: (userId: string) => void;
}

export const useCallStore = create<CallState>((set) => ({
  activeCall: null,
  incomingCall: null,
  isMinimized: false,

  setActiveCall: (call) => set({ activeCall: call, incomingCall: null }),
  setIncomingCall: (call) => set({ incomingCall: call }),
  setMinimized: (minimized) => set({ isMinimized: minimized }),

  updateParticipant: (userId, updates) =>
    set((s) => {
      if (!s.activeCall) return s;
      return {
        activeCall: {
          ...s.activeCall,
          participants: s.activeCall.participants.map((p) =>
            p.user.id === userId ? { ...p, ...updates } : p
          ),
        },
      };
    }),

  addParticipant: (participant) =>
    set((s) => {
      if (!s.activeCall) return s;
      const already = s.activeCall.participants.some((p) => p.user.id === participant.user.id);
      if (already) return s;
      return {
        activeCall: {
          ...s.activeCall,
          participants: [...s.activeCall.participants, participant],
        },
      };
    }),

  removeParticipant: (userId) =>
    set((s) => {
      if (!s.activeCall) return s;
      return {
        activeCall: {
          ...s.activeCall,
          participants: s.activeCall.participants.filter((p) => p.user.id !== userId),
        },
      };
    }),
}));
