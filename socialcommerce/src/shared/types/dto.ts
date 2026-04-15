/**
 * DTOs — raw API response shapes, 1-to-1 with backend JSON.
 * Never use these directly in component logic.
 */

export interface UserDTO {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  presence: string;
  last_seen: string; // ISO string
  roles: string[];
  permissions: string[];
}

export interface MessageDTO {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachment_ids: string[];
  reaction_ids: string[];
  reply_to_id?: string;
  edited_at?: string;
  created_at: string;
  status: string;
}

export interface PaginatedDTO<T> {
  data: T[];
  next_cursor: string | null;
  has_more: boolean;
  total?: number;
}
