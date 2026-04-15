import React, { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { FeedSort } from '../../../shared/types/domain';
import { useFeed } from '../hooks/useFeed';
import type { FeedType } from '../hooks/useFeed';
import { useSocialStore } from '../stores/socialStore';
import { PostCard } from './PostCard';
import { FeedFilter } from './FeedFilter';
import { NewPostsBanner } from './NewPostsBanner';
import { Skeleton } from '../../../shared/components/Skeleton';

interface FeedViewProps {
	feedType: FeedType;
}

export const FeedView: React.FC<FeedViewProps> = ({ feedType }) => {
	const { feedSort, setFeedSort, newPostsCount, clearNewPosts } = useSocialStore();
	const { posts, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useFeed(
		feedType,
		feedSort as FeedSort
	);

	const parentRef = useRef<HTMLDivElement>(null);
	const sentinelRef = useRef<HTMLDivElement>(null);

	const virtualizer = useVirtualizer({
		count: posts.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 160,
		overscan: 3,
	});

	// Load more when sentinel enters viewport via IntersectionObserver
	const fetchNextRef = useRef(fetchNextPage);
	fetchNextRef.current = fetchNextPage;
	const hasNextRef = useRef(hasNextPage);
	hasNextRef.current = hasNextPage;
	const isFetchingRef = useRef(isFetchingNextPage);
	isFetchingRef.current = isFetchingNextPage;

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextRef.current && !isFetchingRef.current) {
					fetchNextRef.current();
				}
			},
			{ root: parentRef.current, rootMargin: '300px' }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, []);

	const handleRefresh = () => {
		clearNewPosts();
		refetch();
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
			<div style={{ padding: 'var(--space-2) 0 var(--space-5)' }}>
				<div style={{ maxWidth: '40%', margin: '0 auto' }}>
					<FeedFilter sort={feedSort} onChange={setFeedSort} />
					<NewPostsBanner count={newPostsCount} onRefresh={handleRefresh} />
				</div>
			</div>

			<div
				ref={parentRef}
				style={{ flex: 1, overflowY: 'auto', scrollbarGutter: 'stable', padding: 'var(--space-2) 0 var(--space-5)' }}
				tabIndex={0}
				aria-label="Post feed"
			>
				<div style={{ maxWidth: '50%', minWidth: '300px', margin: '0 auto' }}>
					{isLoading ? (
						<div style={{
							display: 'flex',
							flexDirection: 'column',
							gap: 'var(--space-3)',
							alignItems: 'center',
						}}>
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} variant="rect" width="100%" height={140} />
							))}
						</div>
					) : posts.length === 0 ? (
						<div
							style={{
								textAlign: 'center',
								padding: 'var(--space-12)',
								color: 'var(--color-text-muted)',
								fontSize: 'var(--font-size-md)',
							}}
						>
							No posts yet. Be the first to post!
						</div>
					) : (
						<div
							style={{
								height: virtualizer.getTotalSize(),
								position: 'relative',
							}}
						>
							{virtualizer.getVirtualItems().map((vItem) => (
								<div
									key={vItem.key}
									data-index={vItem.index}
									ref={virtualizer.measureElement}
									style={{
										position: 'absolute',
										top: 0,
										left: 0,
										width: '100%',
										transform: `translateY(${vItem.start}px)`,
										paddingBottom: 'var(--space-5)',
									}}
								>
									<PostCard post={posts[vItem.index]} />
								</div>
							))}
						</div>
					)}

					{isFetchingNextPage && (
						<div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
							<Skeleton variant="rect" width="100%" height={140} />
						</div>
					)}

					{/* Sentinel for IntersectionObserver-based infinite scroll */}
					<div ref={sentinelRef} style={{ height: 1 }} />
				</div>{/* end 80% centering wrapper */}
			</div>
		</div>
	);
};
