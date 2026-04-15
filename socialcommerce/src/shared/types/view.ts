/**
 * View Models — UI-specific shapes derived from domain models.
 * Add display-ready fields (formatted dates, truncated text, etc.)
 */

import type { Presence } from './domain';

export interface UserViewModel {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  presence: Presence;
  presenceLabel: string;       // e.g., "Online", "Do Not Disturb"
  lastSeenLabel: string;       // e.g., "2 minutes ago"
  initials: string;            // fallback when avatar missing
}

export interface MessageViewModel {
  id: string;
  conversationId: string;
  senderName: string;
  senderAvatarUrl: string;
  senderInitials: string;
  content: string;
  timeLabel: string;           // e.g., "Today at 3:45 PM"
  isEdited: boolean;
  status: string;
  hasAttachments: boolean;
  reactionSummary: ReactionSummaryViewModel[];
  isGrouped: boolean;          // visually grouped with previous message from same sender
}

export interface ReactionSummaryViewModel {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  label: string;               // e.g., "👍 12"
}

export interface NotificationViewModel {
  id: string;
  domain: 'communication' | 'social' | 'streaming' | 'commerce';
  iconEmoji: string;
  title: string;
  body: string;
  timeLabel: string;
  isRead: boolean;
  actionUrl?: string;
}
