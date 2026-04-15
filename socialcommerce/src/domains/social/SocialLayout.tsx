import React, { Suspense, lazy, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useMyGroups } from './hooks/useGroups';
import { useSocialStore } from './stores/socialStore';
import { Button } from '../../shared/components/Button';
import { useIsMobile } from '../../shared/hooks/useIsMobile';

const PostEditor = lazy(() => import('./Post/PostEditor').then(m => ({ default: m.PostEditor })));
const GroupCreateModal = lazy(() => import('./Group/GroupCreateModal').then(m => ({ default: m.GroupCreateModal })));

const SIDEBAR_WIDTH = 220;

export const SocialLayout: React.FC = () => {
	const isMobile = useIsMobile();
	const { data: myGroups } = useMyGroups();
	const { isEditorOpen, editorGroupSlug, openEditor, closeEditor } = useSocialStore();
	const [isGroupCreateOpen, setIsGroupCreateOpen] = useState(false);

	const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
		display: 'flex',
		alignItems: 'center',
		gap: 'var(--space-2)',
		padding: 'var(--space-2) var(--space-3)',
		borderRadius: 'var(--radius-md)',
		textDecoration: 'none',
		fontSize: 'var(--font-size-sm)',
		fontWeight: (isActive
			? 'var(--font-weight-semibold)'
			: 'var(--font-weight-normal)') as React.CSSProperties['fontWeight'],
		color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
		background: isActive ? 'var(--color-surface-3)' : 'transparent',
		transition: 'background var(--transition-fast), color var(--transition-fast)',
		marginBottom: 'var(--space-1)',
	});

	const mobileNavItemStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
		display: 'inline-flex',
		alignItems: 'center',
		gap: 'var(--space-1)',
		paddingInline: 'var(--space-3)',
		height: 28,
		borderRadius: 'var(--radius-full)',
		textDecoration: 'none',
		whiteSpace: 'nowrap',
		fontSize: 'var(--font-size-sm)',
		fontWeight: (isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)') as React.CSSProperties['fontWeight'],
		color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
		background: isActive ? 'var(--color-surface-3)' : 'transparent',
		border: `1px solid ${isActive ? 'var(--color-border-default)' : 'transparent'}`,
		transition: 'background var(--transition-fast)',
	});

	return (
		<div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
			{/* Left sidebar — hidden on mobile (xs/sm) */}
			{!isMobile && (
				<aside
					aria-label="Social navigation"
					style={{
						width: SIDEBAR_WIDTH,
						flexShrink: 0,
						background: 'var(--color-surface-0)',
						display: 'flex',
						flexDirection: 'column',
						height: '100%',
						borderRight: '1px solid var(--color-border-default)',
						overflowY: 'auto',
					}}
				>
					<div style={{ padding: 'var(--space-3) var(--space-3) var(--space-2)' }}>
						<Button
							variant="primary"
							size="sm"
							style={{ width: '100%', marginBottom: 'var(--space-3)' }}
							onClick={() => openEditor()}
						>
							+ Create Post
						</Button>

						<nav>
							<NavLink to="/social" end style={navLinkStyle}>
								🏠 Home
							</NavLink>
							<NavLink to="/social/explore" style={navLinkStyle}>
								🔭 Explore
							</NavLink>
							<NavLink to="/social/groups/discover" style={navLinkStyle}>
								🌐 Communities
							</NavLink>
						</nav>
					</div>

					{/* Joined groups */}
					{myGroups && myGroups.length > 0 && (
						<div style={{ padding: 'var(--space-3)', borderTop: '1px solid var(--color-border-default)' }}>
							<p
								style={{
									fontSize: 'var(--font-size-xs)',
									color: 'var(--color-text-muted)',
									textTransform: 'uppercase',
									letterSpacing: '0.06em',
									margin: '0 0 var(--space-2)',
									padding: '0 var(--space-2)',
								}}
							>
								Your Communities
							</p>
							{myGroups.map((g) => (
								<NavLink
									key={g.id}
									to={`/social/group/${g.slug}`}
									style={navLinkStyle}
								>
									{g.avatarUrl ? (
										<img
											src={g.avatarUrl}
											alt={g.name}
											loading="lazy"
											decoding="async"
											width={18}
											height={18}
											style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover' }}
										/>
									) : (
										<span
											style={{
												width: 18,
												height: 18,
												borderRadius: 4,
												background: 'var(--color-brand-primary)',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												fontSize: 10,
												color: '#fff',
												flexShrink: 0,
											}}
										>
											{g.name[0]?.toUpperCase()}
										</span>
									)}
									<span
										style={{
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
										}}
									>
										g/{g.slug}
									</span>
								</NavLink>
							))}
							<button
								onClick={() => setIsGroupCreateOpen(true)}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 'var(--space-2)',
									width: '100%',
									padding: 'var(--space-2) var(--space-3)',
									borderRadius: 'var(--radius-sm)',
									border: 'none',
									background: 'none',
									cursor: 'pointer',
									fontSize: 'var(--font-size-sm)',
									color: 'var(--color-text-muted)',
									transition: 'background var(--transition-fast)',
								}}
							>
								+ Create Community
							</button>
						</div>
					)}
				</aside>
			)}

			{/* Main content */}
			<main style={{
				flex: 1,
				overflow: 'hidden',
				display: 'flex',
				flexDirection: 'column',
				width: `calc(50% - ${SIDEBAR_WIDTH}px)`,
			}}>
				{/* Mobile sub-nav strip — only visible on xs/sm */}
				{isMobile && (
					<nav aria-label="Social navigation" className="mobile-sub-nav">
						<NavLink to="/social" end style={mobileNavItemStyle}>🏠 Home</NavLink>
						<NavLink to="/social/explore" style={mobileNavItemStyle}>🔭 Explore</NavLink>
						<NavLink to="/social/groups/discover" style={mobileNavItemStyle}>🌐 Communities</NavLink>
						<button
							onClick={() => openEditor()}
							style={{
								...mobileNavItemStyle({ isActive: false }),
								background: 'var(--color-brand-primary)',
								color: '#fff',
								border: 'none',
								cursor: 'pointer',
								marginLeft: 'var(--space-2)',
							}}
						>
							+ Post
						</button>
					</nav>
				)}
				<Outlet />
			</main>

			{/* Modals — only mount when open */}
			{isEditorOpen && (
				<Suspense fallback={null}>
					<PostEditor
						isOpen={isEditorOpen}
						onClose={closeEditor}
						groupSlug={editorGroupSlug ?? undefined}
					/>
				</Suspense>
			)}
			{isGroupCreateOpen && (
				<Suspense fallback={null}>
					<GroupCreateModal
						isOpen={isGroupCreateOpen}
						onClose={() => setIsGroupCreateOpen(false)}
					/>
				</Suspense>
			)}
		</div>
	);
};
