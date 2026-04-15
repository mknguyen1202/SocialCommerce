import { create } from 'zustand';

interface ConversationState {
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;

  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Optimistic message queue: conversationId → temp messages
  pendingMessages: Record<string, string[]>;
  addPendingMessage: (conversationId: string, tempId: string) => void;
  removePendingMessage: (conversationId: string, tempId: string) => void;

  // Typing users per conversation
  typingUsers: Record<string, Set<string>>;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  activeConversationId: null,
  setActiveConversation: (id) => set({ activeConversationId: id }),

  isSidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),

  pendingMessages: {},
  addPendingMessage: (conversationId, tempId) =>
    set((s) => ({
      pendingMessages: {
        ...s.pendingMessages,
        [conversationId]: [...(s.pendingMessages[conversationId] ?? []), tempId],
      },
    })),
  removePendingMessage: (conversationId, tempId) =>
    set((s) => ({
      pendingMessages: {
        ...s.pendingMessages,
        [conversationId]: (s.pendingMessages[conversationId] ?? []).filter((id) => id !== tempId),
      },
    })),

  typingUsers: {},
  setTyping: (conversationId, userId, isTyping) =>
    set((s) => {
      const current = new Set(s.typingUsers[conversationId] ?? []);
      if (isTyping) {
        current.add(userId);
      } else {
        current.delete(userId);
      }
      return { typingUsers: { ...s.typingUsers, [conversationId]: current } };
    }),
}));
