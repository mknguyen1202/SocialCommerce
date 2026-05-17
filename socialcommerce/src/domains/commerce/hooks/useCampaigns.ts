import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from '../../../shared/api/client';
import type { Campaign, CampaignStatus } from '../Seller/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCampaign(dto: any): Campaign {
  return {
    id: dto.id, shopId: dto.shop_id, name: dto.name,
    status: dto.status as CampaignStatus, productIds: dto.product_ids ?? [],
    dailyBudget: dto.daily_budget, totalBudget: dto.total_budget, spent: dto.spent,
    impressions: dto.impressions, clicks: dto.clicks, conversions: dto.conversions,
    ctr: dto.ctr, cpc: dto.cpc, audienceTags: dto.audience_tags ?? [],
    startDate: dto.start_date, endDate: dto.end_date ?? null,
    series: (dto.series ?? []).map((s: Record<string, unknown>) => ({
      date: s.date, impressions: s.impressions, clicks: s.clicks, conversions: s.conversions,
    })),
    createdAt: new Date(dto.created_at),
  };
}

export function useCampaigns(shopId: string | null) {
  return useQuery({
    queryKey: ['seller', 'campaigns', shopId],
    queryFn: async () => {
      const data = await apiGet<unknown[]>(`/api/seller/shops/${shopId}/campaigns`);
      return data.map(mapCampaign);
    },
    enabled: !!shopId,
  });
}

export function useCampaign(shopId: string | null, campaignId: string | null) {
  return useQuery({
    queryKey: ['seller', 'campaign', shopId, campaignId],
    queryFn: () => apiGet<unknown>(`/api/seller/shops/${shopId}/campaigns/${campaignId}`).then(mapCampaign),
    enabled: !!shopId && !!campaignId,
  });
}

export function useCreateCampaign(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Campaign, 'id' | 'shopId' | 'impressions' | 'clicks' | 'conversions' | 'ctr' | 'cpc' | 'spent' | 'series' | 'createdAt'>) =>
      apiPost(`/api/seller/shops/${shopId}/campaigns`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'campaigns', shopId] }),
  });
}

export function useUpdateCampaign(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: string; data: Partial<Campaign> }) =>
      apiPatch(`/api/seller/shops/${shopId}/campaigns/${campaignId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'campaigns', shopId] }),
  });
}

export function usePauseCampaign(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) => apiPost(`/api/seller/shops/${shopId}/campaigns/${campaignId}/pause`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'campaigns', shopId] }),
  });
}

export function useResumeCampaign(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) => apiPost(`/api/seller/shops/${shopId}/campaigns/${campaignId}/resume`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'campaigns', shopId] }),
  });
}
