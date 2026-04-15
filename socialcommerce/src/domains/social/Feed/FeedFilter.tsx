import React from 'react';
import type { FeedSort } from '../../../shared/types/domain';

interface FeedFilterProps {
	sort: FeedSort;
	onChange: (sort: FeedSort) => void;
}

const OPTIONS: { value: FeedSort; label: string; icon: string }[] = [
	{ value: 'hot', label: 'Hot', icon: '🔥' },
	{ value: 'new', label: 'New', icon: '✨' },
	{ value: 'top', label: 'Top', icon: '📈' },
];

export const FeedFilter: React.FC<FeedFilterProps> = ({ sort, onChange }) => (
	<div
		role="tablist"
		aria-label="Feed sort"
		style={{
			display: 'flex',
			gap: 'var(--space-1)',
			justifyContent: 'space-around',
			background: 'var(--color-surface-2)',
			padding: 'var(--space-1)',
			borderRadius: 'var(--radius-md)',
			border: '1px solid var(--color-border-default)',
		}}
	>
		{OPTIONS.map((opt) => {
			const active = sort === opt.value;
			return (
				<button
					key={opt.value}
					role="tab"
					aria-selected={active}
					onClick={() => onChange(opt.value)}
					style={{
						flex: 1,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 'var(--space-1)',
						padding: 'var(--space-2) var(--space-3)',
						border: 'none',
						borderRadius: 'var(--radius-md)',
						cursor: 'pointer',
						fontSize: 'var(--font-size-sm)',
						fontWeight: (active
							? 'var(--font-weight-semibold)'
							: 'var(--font-weight-normal)') as React.CSSProperties['fontWeight'],
						background: active ? 'var(--color-surface-3)' : 'transparent',
						color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
						transition: 'background var(--transition-fast), color var(--transition-fast)',
					}}
				>
					<span>{opt.icon}</span>
					<span>{opt.label}</span>
				</button>
			);
		})}
	</div>
);
