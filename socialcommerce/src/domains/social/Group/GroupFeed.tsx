import React from 'react';
import { useParams } from 'react-router-dom';
import { useGroup } from '../hooks/useGroups';
import { GroupHeader } from './GroupHeader';
import { GroupSidebar } from './GroupSidebar';
import { FeedView } from '../Feed/FeedView';
import { Skeleton } from '../../../shared/components/Skeleton';
import type { FeedType } from '../hooks/useFeed';

export const GroupFeed: React.FC = () => {
  const { groupSlug } = useParams<{ groupSlug: string }>();
  const { data: group, isLoading } = useGroup(groupSlug ?? '');

  if (!groupSlug) return null;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
        {isLoading || !group ? (
          <Skeleton variant="rect" width="100%" height={180} />
        ) : (
          <GroupHeader group={group} />
        )}
        <FeedView feedType={`group:${groupSlug}` as FeedType} />
      </div>

      {/* Sidebar */}
      {group && (
        <aside
          style={{
            width: 280,
            flexShrink: 0,
            overflowY: 'auto',
            padding: 'var(--space-4)',
            borderLeft: '1px solid var(--color-border-default)',
          }}
        >
          <GroupSidebar group={group} />
        </aside>
      )}
    </div>
  );
};
