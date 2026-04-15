import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../shared/api/client';
import type { DomainUser } from '../../../shared/types/domain';
import { WallHeader } from './WallHeader';
import { FeedView } from '../Feed/FeedView';
import { Skeleton } from '../../../shared/components/Skeleton';

interface UserProfileDTO {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  post_count: number;
  follower_count: number;
  following_count: number;
}

function useUserProfile(userId: string) {
  return useQuery<{ user: DomainUser; postCount: number; followerCount: number; followingCount: number }>({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      const dto = await apiGet<UserProfileDTO>(`/api/users/${userId}/profile`);
      return {
        user: {
          id: dto.id,
          username: dto.username,
          displayName: dto.display_name,
          avatarUrl: dto.avatar_url,
          presence: 'offline',
          lastSeen: new Date(),
        },
        postCount: dto.post_count,
        followerCount: dto.follower_count,
        followingCount: dto.following_count,
      };
    },
    enabled: !!userId,
  });
}

export const UserWall: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { data, isLoading } = useUserProfile(userId ?? '');

  if (!userId) return null;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'var(--space-6)', height: '100%', overflowY: 'auto' }}>
      {isLoading || !data ? (
        <Skeleton variant="rect" width="100%" height={120} />
      ) : (
        <WallHeader
          user={data.user}
          postCount={data.postCount}
          followerCount={data.followerCount}
          followingCount={data.followingCount}
        />
      )}
      <FeedView feedType={`group:wall:${userId}` as `group:${string}`} />
    </div>
  );
};
