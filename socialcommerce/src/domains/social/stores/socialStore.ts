import { create } from 'zustand';
import type { FeedSort } from '../../../shared/types/domain';

interface SocialState {
  feedSort: FeedSort;
  setFeedSort: (sort: FeedSort) => void;

  newPostsCount: number;
  setNewPostsCount: (count: number) => void;
  clearNewPosts: () => void;

  isEditorOpen: boolean;
  editorGroupSlug: string | null;
  openEditor: (groupSlug?: string) => void;
  closeEditor: () => void;

  activeGroupSlug: string | null;
  setActiveGroupSlug: (slug: string | null) => void;
}

export const useSocialStore = create<SocialState>((set) => ({
  feedSort: 'hot',
  setFeedSort: (feedSort) => set({ feedSort }),

  newPostsCount: 0,
  setNewPostsCount: (count) => set({ newPostsCount: count }),
  clearNewPosts: () => set({ newPostsCount: 0 }),

  isEditorOpen: false,
  editorGroupSlug: null,
  openEditor: (groupSlug) => set({ isEditorOpen: true, editorGroupSlug: groupSlug ?? null }),
  closeEditor: () => set({ isEditorOpen: false, editorGroupSlug: null }),

  activeGroupSlug: null,
  setActiveGroupSlug: (slug) => set({ activeGroupSlug: slug }),
}));
