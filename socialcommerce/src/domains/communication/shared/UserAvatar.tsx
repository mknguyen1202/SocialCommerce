import React from 'react';
import { Avatar } from '../../../shared/components/Avatar';
import type { DomainUser } from '../../../shared/types/domain';
import type { AvatarProps } from '../../../shared/components/Avatar';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface UserAvatarProps {
  user: Pick<DomainUser, 'displayName' | 'avatarUrl' | 'presence'>;
  size?: Size;
  showPresence?: boolean;
  style?: AvatarProps['style'];
}

const INITIALS_FROM = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const UserAvatar: React.FC<UserAvatarProps> = React.memo(({
  user,
  size = 'md',
  showPresence = true,
  style,
}) => (
  <Avatar
    src={user.avatarUrl || null}
    alt={user.displayName}
    initials={INITIALS_FROM(user.displayName)}
    size={size}
    presence={showPresence ? user.presence : undefined}
    style={style}
  />
));
