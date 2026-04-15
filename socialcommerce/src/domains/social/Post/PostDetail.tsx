import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePost, useVotePost, useSavePost, useEditPost, useDeletePost } from '../hooks/usePost';
import { PostVoteControls } from '../Feed/PostVoteControls';
import { PostActions } from '../Feed/PostActions';
import { MediaGallery } from './MediaGallery';
import { PollWidget } from './PollWidget';
import { CommentTree } from './CommentSection/CommentTree';
import { Avatar } from '../../../shared/components/Avatar';
import { TimeAgo } from '../shared/TimeAgo';
import { Skeleton } from '../../../shared/components/Skeleton';
import { useAuthContext } from '../../../app/providers/AuthProvider';

export const PostDetail: React.FC = () => {
	const { postId } = useParams<{ postId: string }>();
	const navigate = useNavigate();
	const { user } = useAuthContext();

	const { data: post, isLoading } = usePost(postId ?? '');
	const votePost = useVotePost();
	const savePost = useSavePost();
	const editPost = useEditPost();
	const deletePost = useDeletePost();

	const [isEditing, setIsEditing] = useState(false);
	const [editTitle, setEditTitle] = useState('');
	const [editBody, setEditBody] = useState('');

	if (!postId) return null;

	if (isLoading) {
		return (
			<div style={{ padding: 'var(--space-6)', maxWidth: 760, margin: '0 auto' }}>
				<Skeleton variant="rect" width="100%" height={200} />
			</div>
		);
	}

	if (!post) {
		return (
			<div
				style={{
					padding: 'var(--space-12)',
					textAlign: 'center',
					color: 'var(--color-text-muted)',
				}}
			>
				Post not found.
			</div>
		);
	}

	const isAuthor = user?.id === post.author.id;

	const inputStyle: React.CSSProperties = {
		width: '100%',
		background: 'var(--color-surface-2)',
		border: '1px solid rgba(255,255,255,0.1)',
		borderRadius: 'var(--radius-sm)',
		color: 'var(--color-text-primary)',
		fontSize: 'var(--font-size-sm)',
		padding: 'var(--space-2) var(--space-3)',
		fontFamily: 'inherit',
		boxSizing: 'border-box',
		marginBottom: 'var(--space-2)',
	};

	return (
		<div style={{ maxWidth: 760, margin: '0 auto', padding: 'var(--space-6)' }}>
			{/* Back button */}
			<button
				onClick={() => navigate(-1)}
				style={{
					background: 'none',
					border: 'none',
					cursor: 'pointer',
					color: 'var(--color-text-secondary)',
					fontSize: 'var(--font-size-sm)',
					marginBottom: 'var(--space-4)',
					padding: 0,
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--space-1)',
				}}
			>
				← Back
			</button>

			<article
				style={{
					background: 'var(--color-surface-3)',
					borderRadius: 'var(--radius-lg)',
					padding: 'var(--space-6)',
					marginBottom: 'var(--space-6)',
				}}
			>
				<div style={{ display: 'flex', gap: 'var(--space-4)' }}>
					{/* Vote column */}
					<PostVoteControls
						score={post.score}
						userVote={post.userVote}
						onVote={(dir) => votePost.mutate({ postId: post.id, direction: dir })}
					/>

					<div style={{ flex: 1, minWidth: 0 }}>
						{/* Meta */}
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 'var(--space-2)',
								marginBottom: 'var(--space-3)',
								flexWrap: 'wrap',
							}}
						>
							{post.group && (
								<button
									onClick={() => navigate(`/social/group/${post.group!.slug}`)}
									style={{
										background: 'none',
										border: 'none',
										cursor: 'pointer',
										fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
										fontSize: 'var(--font-size-sm)',
										color: 'var(--color-text-primary)',
										padding: 0,
									}}
								>
									g/{post.group.slug}
								</button>
							)}
							<button
								onClick={() => navigate(`/social/wall/${post.author.id}`)}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 6,
									background: 'none',
									border: 'none',
									cursor: 'pointer',
									padding: 0,
								}}
							>
								<Avatar src={post.author.avatarUrl} alt={post.author.displayName} size="xs" />
								<span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
									{post.author.displayName}
								</span>
							</button>
							<TimeAgo date={post.createdAt} />
						</div>

						{/* Title */}
						{isEditing ? (
							<input
								value={editTitle}
								onChange={(e) => setEditTitle(e.target.value)}
								style={{ ...inputStyle, fontSize: 'var(--font-size-lg)' }}
							/>
						) : (
							<h1
								style={{
									fontSize: 'var(--font-size-xl)',
									fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
									color: 'var(--color-text-primary)',
									margin: 0,
									marginBottom: 'var(--space-4)',
									lineHeight: 'var(--line-height-tight)',
								}}
							>
								{post.title}
							</h1>
						)}

						{/* Media */}
						{post.type === 'image' && <MediaGallery urls={post.mediaUrls} />}

						{/* Link */}
						{post.type === 'link' && post.linkUrl && (
							<a
								href={post.linkUrl}
								target="_blank"
								rel="noopener noreferrer"
								style={{
									display: 'block',
									color: 'var(--color-text-link)',
									fontSize: 'var(--font-size-sm)',
									marginBottom: 'var(--space-4)',
									wordBreak: 'break-all',
								}}
							>
								🔗 {post.linkUrl}
							</a>
						)}

						{/* Body */}
						{post.body && (
							isEditing ? (
								<textarea
									value={editBody}
									onChange={(e) => setEditBody(e.target.value)}
									rows={6}
									style={{ ...inputStyle, resize: 'vertical' }}
								/>
							) : (
								<p
									style={{
										fontSize: 'var(--font-size-base)',
										color: 'var(--color-text-primary)',
										lineHeight: 'var(--line-height-base)',
										margin: 0,
										marginBottom: 'var(--space-4)',
										whiteSpace: 'pre-wrap',
									}}
								>
									{post.body}
								</p>
							)
						)}

						{/* Poll */}
						{post.type === 'poll' && post.poll && (
							<PollWidget poll={post.poll} postId={post.id} />
						)}

						{/* Edit buttons */}
						{isEditing && (
							<div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
								<button
									onClick={() => {
										editPost.mutate({ postId: post.id, title: editTitle, body: editBody });
										setIsEditing(false);
									}}
									style={{
										background: 'var(--color-brand-primary)',
										border: 'none',
										borderRadius: 'var(--radius-sm)',
										color: '#fff',
										padding: '4px 12px',
										cursor: 'pointer',
										fontSize: 'var(--font-size-sm)',
									}}
								>
									Save
								</button>
								<button
									onClick={() => setIsEditing(false)}
									style={{
										background: 'var(--color-surface-2)',
										border: 'none',
										borderRadius: 'var(--radius-sm)',
										color: 'var(--color-text-secondary)',
										padding: '4px 12px',
										cursor: 'pointer',
										fontSize: 'var(--font-size-sm)',
									}}
								>
									Cancel
								</button>
							</div>
						)}

						{/* Actions */}
						<PostActions
							post={post}
							isAuthor={isAuthor}
							onComment={() => document.getElementById('comment-composer')?.focus()}
							onShare={() => navigator.clipboard.writeText(window.location.href)}
							onSave={(save) => savePost.mutate({ postId: post.id, save })}
							onReport={() => { }}
							onEdit={
								isAuthor
									? () => {
										setEditTitle(post.title);
										setEditBody(post.body);
										setIsEditing(true);
									}
									: undefined
							}
							onDelete={
								isAuthor
									? () => {
										deletePost.mutate(post.id);
										navigate(-1);
									}
									: undefined
							}
						/>
					</div>
				</div>
			</article>

			{/* Comments */}
			<CommentTree postId={post.id} />
		</div>
	);
};
