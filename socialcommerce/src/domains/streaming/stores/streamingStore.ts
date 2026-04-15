import { create } from 'zustand';
import type { TheaterChatMessage, PlaybackState } from '../../../shared/types/domain';

interface StreamingState {
  activeTheaterId: string | null;
  setActiveTheaterId: (id: string | null) => void;

  playback: PlaybackState | null;
  setPlayback: (state: PlaybackState) => void;

  chatMessages: TheaterChatMessage[];
  addChatMessage: (msg: TheaterChatMessage) => void;
  deleteChatMessage: (messageId: string) => void;
  clearChat: () => void;

  viewerCount: number;
  setViewerCount: (count: number) => void;

  isCreateModalOpen: boolean;
  openCreateModal: () => void;
  closeCreateModal: () => void;

  isPiPActive: boolean;
  setPiPActive: (active: boolean) => void;

  categoryFilter: string | null;
  setCategoryFilter: (cat: string | null) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const useStreamingStore = create<StreamingState>((set) => ({
  activeTheaterId: null,
  setActiveTheaterId: (id) => set({ activeTheaterId: id }),

  playback: null,
  setPlayback: (state) => set({ playback: state }),

  chatMessages: [],
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages.slice(-499), msg] })),
  deleteChatMessage: (messageId) =>
    set((s) => ({
      chatMessages: s.chatMessages.map((m) =>
        m.id === messageId ? { ...m, isDeleted: true } : m
      ),
    })),
  clearChat: () => set({ chatMessages: [] }),

  viewerCount: 0,
  setViewerCount: (count) => set({ viewerCount: count }),

  isCreateModalOpen: false,
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),

  isPiPActive: false,
  setPiPActive: (active) => set({ isPiPActive: active }),

  categoryFilter: null,
  setCategoryFilter: (cat) => set({ categoryFilter: cat }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
