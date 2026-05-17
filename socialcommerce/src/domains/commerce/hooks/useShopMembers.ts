import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../../shared/api/client';
import type { ShopMember, ShopInvite, ShopRole, ShopPermissions } from '../Seller/types';

function mapMember(dto: Record<string, unknown>): ShopMember {
  return {
    userId: dto.user_id as string, shopId: dto.shop_id as string,
    role: dto.role as ShopRole,
    permissions: dto.permissions as ShopPermissions,
    displayName: dto.display_name as string, email: dto.email as string,
    avatarUrl: dto.avatar_url as string,
    lastActive: dto.last_active ? new Date(dto.last_active as string) : null,
    joinedAt: new Date(dto.joined_at as string),
  };
}

function mapInvite(dto: Record<string, unknown>): ShopInvite {
  return {
    id: dto.id as string, shopId: dto.shop_id as string, email: dto.email as string,
    role: dto.role as ShopRole, permissions: dto.permissions as ShopPermissions,
    invitedBy: dto.invited_by as string,
    createdAt: new Date(dto.created_at as string), expiresAt: new Date(dto.expires_at as string),
  };
}

export function useShopMembers(shopId: string | null) {
  return useQuery({
    queryKey: ['seller', 'members', shopId],
    queryFn: async () => {
      const data = await apiGet<Record<string, unknown>[]>(`/api/seller/shops/${shopId}/members`);
      return data.map(mapMember);
    },
    enabled: !!shopId,
  });
}

export function useShopInvites(shopId: string | null) {
  return useQuery({
    queryKey: ['seller', 'invites', shopId],
    queryFn: async () => {
      const data = await apiGet<Record<string, unknown>[]>(`/api/seller/shops/${shopId}/invites`);
      return data.map(mapInvite);
    },
    enabled: !!shopId,
  });
}

export function useInviteMember(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: ShopRole; permissions: ShopPermissions }) =>
      apiPost(`/api/seller/shops/${shopId}/invites`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller', 'invites', shopId] });
    },
  });
}

export function useUpdateMember(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { role?: ShopRole; permissions?: ShopPermissions } }) =>
      apiPatch(`/api/seller/shops/${shopId}/members/${userId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'members', shopId] }),
  });
}

export function useRemoveMember(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiDelete(`/api/seller/shops/${shopId}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'members', shopId] }),
  });
}

export function useRevokeInvite(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => apiDelete(`/api/seller/shops/${shopId}/invites/${inviteId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'invites', shopId] }),
  });
}
