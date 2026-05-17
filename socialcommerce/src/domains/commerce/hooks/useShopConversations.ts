import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from '../../../shared/api/client';
import { useSellerStore } from '../stores/sellerStore';
import type { ShopConversation, ShopMessage, ShopConvStatus } from '../Seller/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapConv(dto: any): ShopConversation {
  return {
    id: dto.id, shopId: dto.shop_id, customerId: dto.customer_id,
    customerName: dto.customer_name, customerAvatarUrl: dto.customer_avatar_url, customerEmail: dto.customer_email,
    subject: dto.subject, status: dto.status as ShopConvStatus,
    assigneeId: dto.assignee_id ?? null, assigneeName: dto.assignee_name ?? null,
    linkedOrderId: dto.linked_order_id ?? null, linkedOrderNumber: dto.linked_order_number ?? null,
    tags: dto.tags ?? [], unreadByStaff: dto.unread_by_staff ?? 0,
    lastMessage: dto.last_message ? {
      content: dto.last_message.content,
      senderIsCustomer: dto.last_message.sender_is_customer,
      at: new Date(dto.last_message.at),
    } : null,
    createdAt: new Date(dto.created_at), updatedAt: new Date(dto.updated_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMessage(dto: any): ShopMessage {
  return {
    id: dto.id, conversationId: dto.conversation_id,
    senderId: dto.sender_id, senderName: dto.sender_name, senderAvatarUrl: dto.sender_avatar_url,
    senderIsCustomer: dto.sender_is_customer, content: dto.content,
    isInternalNote: dto.is_internal_note ?? false,
    createdAt: new Date(dto.created_at),
  };
}

export function useShopConversations(shopId: string | null) {
  const filter = useSellerStore((s) => s.inboxFilter);

  const statusParam = ['OPEN', 'PENDING', 'CLOSED'].includes(filter) ? filter : 'ALL';
  const assigneeParam = filter === 'UNASSIGNED' ? 'unassigned' : filter === 'MINE' ? 'me' : undefined;

  return useQuery({
    queryKey: ['seller', 'conversations', shopId, filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusParam !== 'ALL') params.set('status', statusParam);
      if (assigneeParam) params.set('assignee', assigneeParam);
      const data = await apiGet<unknown[]>(`/api/seller/shops/${shopId}/conversations?${params}`);
      return data.map(mapConv);
    },
    enabled: !!shopId,
    refetchInterval: 20_000,
  });
}

export function useShopMessages(shopId: string | null, conversationId: string | null) {
  return useQuery({
    queryKey: ['seller', 'messages', shopId, conversationId],
    queryFn: async () => {
      const data = await apiGet<unknown[]>(`/api/seller/shops/${shopId}/conversations/${conversationId}/messages`);
      return data.map(mapMessage);
    },
    enabled: !!shopId && !!conversationId,
    refetchInterval: 10_000,
  });
}

export function useSendShopMessage(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content, isInternalNote = false }: { conversationId: string; content: string; isInternalNote?: boolean }) =>
      apiPost(`/api/seller/shops/${shopId}/conversations/${conversationId}/messages`, { content, is_internal_note: isInternalNote }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['seller', 'messages', shopId, vars.conversationId] });
      qc.invalidateQueries({ queryKey: ['seller', 'conversations', shopId] });
    },
  });
}

export function useUpdateShopConversation(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, data }: { conversationId: string; data: { status?: ShopConvStatus; assignee_id?: string | null; tags?: string[] } }) =>
      apiPatch(`/api/seller/shops/${shopId}/conversations/${conversationId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'conversations', shopId] }),
  });
}

export function useCreateShopConversation(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { subject: string; customer_id?: string; linked_order_id?: string; linked_order_number?: string }) =>
      apiPost(`/api/seller/shops/${shopId}/conversations`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'conversations', shopId] }),
  });
}

export function useShopCannedReplies(shopId: string | null) {
  return useQuery({
    queryKey: ['seller', 'canned-replies', shopId],
    queryFn: () => apiGet<unknown[]>(`/api/seller/shops/${shopId}/canned-replies`),
    enabled: !!shopId,
  });
}
