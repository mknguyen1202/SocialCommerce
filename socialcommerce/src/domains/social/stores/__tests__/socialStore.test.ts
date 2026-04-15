import { act } from '@testing-library/react';
import { useSocialStore } from '../socialStore';

const INITIAL = useSocialStore.getState();

afterEach(() => {
    act(() => useSocialStore.setState(INITIAL));
});

// ─── feedSort ─────────────────────────────────────────────────────────────────

describe('setFeedSort', () => {
    it('defaults to "hot"', () => {
        expect(useSocialStore.getState().feedSort).toBe('hot');
    });

    it('updates feedSort to the requested value', () => {
        act(() => useSocialStore.getState().setFeedSort('new'));
        expect(useSocialStore.getState().feedSort).toBe('new');
    });

    it('can cycle through all three sort values', () => {
        for (const sort of ['hot', 'new', 'top'] as const) {
            act(() => useSocialStore.getState().setFeedSort(sort));
            expect(useSocialStore.getState().feedSort).toBe(sort);
        }
    });
});

// ─── newPostsCount ────────────────────────────────────────────────────────────

describe('newPostsCount', () => {
    it('setNewPostsCount updates the count', () => {
        act(() => useSocialStore.getState().setNewPostsCount(5));
        expect(useSocialStore.getState().newPostsCount).toBe(5);
    });

    it('clearNewPosts resets count to 0', () => {
        act(() => {
            useSocialStore.getState().setNewPostsCount(5);
            useSocialStore.getState().clearNewPosts();
        });
        expect(useSocialStore.getState().newPostsCount).toBe(0);
    });
});

// ─── editor ───────────────────────────────────────────────────────────────────

describe('openEditor / closeEditor', () => {
    it('openEditor sets isEditorOpen to true with no group', () => {
        act(() => useSocialStore.getState().openEditor());
        expect(useSocialStore.getState().isEditorOpen).toBe(true);
        expect(useSocialStore.getState().editorGroupSlug).toBeNull();
    });

    it('openEditor stores the provided group slug', () => {
        act(() => useSocialStore.getState().openEditor('gear-talk'));
        expect(useSocialStore.getState().isEditorOpen).toBe(true);
        expect(useSocialStore.getState().editorGroupSlug).toBe('gear-talk');
    });

    it('closeEditor sets isEditorOpen to false and clears the group slug', () => {
        act(() => {
            useSocialStore.getState().openEditor('gear-talk');
            useSocialStore.getState().closeEditor();
        });
        expect(useSocialStore.getState().isEditorOpen).toBe(false);
        expect(useSocialStore.getState().editorGroupSlug).toBeNull();
    });
});

// ─── activeGroupSlug ──────────────────────────────────────────────────────────

describe('setActiveGroupSlug', () => {
    it('stores a group slug', () => {
        act(() => useSocialStore.getState().setActiveGroupSlug('gear-talk'));
        expect(useSocialStore.getState().activeGroupSlug).toBe('gear-talk');
    });

    it('clears the slug when called with null', () => {
        act(() => {
            useSocialStore.getState().setActiveGroupSlug('gear-talk');
            useSocialStore.getState().setActiveGroupSlug(null);
        });
        expect(useSocialStore.getState().activeGroupSlug).toBeNull();
    });
});
