import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../api/client';
import { useChannel } from '../realtime/useSocket';
import type { AppNotification, NotificationDomain, NotificationType } from '../types/domain';

// ─── DTO ─────────────────────────────────────────────────────────────────────

interface NotificationDTO {
  id: string;
  domain: NotificationDomain;
  type: NotificationType;
  title: string;
  body: string;
  link_url: string;
  actor_id?: string;
  actor_name?: string;
  actor_avatar_url?: string;
  is_read: boolean;
  created_at: string;
}

function mapNotification(dto: NotificationDTO): AppNotification {
  return {
    id: dto.id,
    domain: dto.domain,
    type: dto.type,
    title: dto.title,
    body: dto.body,
    linkUrl: dto.link_url,
    actorId: dto.actor_id,
    actorName: dto.actor_name,
    actorAvatarUrl: dto.actor_avatar_url,
    isRead: dto.is_read,
    createdAt: new Date(dto.created_at),
  };
}

// ─── Keys ────────────────────────────────────────────────────────────────────

export const NOTIFICATIONS_KEY = ['notifications'] as const;

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () =>
      apiGet<NotificationDTO[]>('/api/notifications').then((dtos) =>
        dtos.map(mapNotification)
      ),
    staleTime: 1000 * 30,
  });

  // Real-time push: new notification arrives via WebSocket
  useChannel('notifications', 'notification:new', (payload: unknown) => {
    const notification = mapNotification(payload as NotificationDTO);
    queryClient.setQueryData<AppNotification[]>(NOTIFICATIONS_KEY, (prev = []) => [
      notification,
      ...prev,
    ]);
  });

  return query;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      apiPost(`/api/notifications/${notificationId}/read`, {}),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      queryClient.setQueryData<AppNotification[]>(NOTIFICATIONS_KEY, (prev = []) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost('/api/notifications/read-all', {}),
    onSuccess: () => {
      queryClient.setQueryData<AppNotification[]>(NOTIFICATIONS_KEY, (prev = []) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    },
  });
}
