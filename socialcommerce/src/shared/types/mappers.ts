/**
 * Mapper utilities: DTO → Domain Model → View Model
 */

import type { UserDTO } from './dto';
import type { DomainUser, Presence } from './domain';
import type { UserViewModel } from './view';

// ─── DTO → Domain ───────────────────────────────────────────────────────────

export function mapUserDTOToDomain(dto: UserDTO): DomainUser {
  return {
    id: dto.id,
    username: dto.username,
    displayName: dto.display_name,
    avatarUrl: dto.avatar_url,
    presence: (dto.presence as Presence) ?? 'offline',
    lastSeen: new Date(dto.last_seen),
  };
}

// ─── Domain → View ──────────────────────────────────────────────────────────

const PRESENCE_LABELS: Record<Presence, string> = {
  online: 'Online',
  offline: 'Offline',
  idle: 'Away',
  dnd: 'Do Not Disturb',
};

function getInitials(displayName: string): string {
  return displayName
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatLastSeen(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function mapUserDomainToView(user: DomainUser): UserViewModel {
  return {
    id: user.id,
    displayName: user.displayName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    presence: user.presence,
    presenceLabel: PRESENCE_LABELS[user.presence],
    lastSeenLabel: user.presence === 'offline' ? formatLastSeen(user.lastSeen) : '',
    initials: getInitials(user.displayName),
  };
}

// ─── Convenience: DTO → View (one-shot) ────────────────────────────────────

export function mapUserDTOToView(dto: UserDTO): UserViewModel {
  return mapUserDomainToView(mapUserDTOToDomain(dto));
}
