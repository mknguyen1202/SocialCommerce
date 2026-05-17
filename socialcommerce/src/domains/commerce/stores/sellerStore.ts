import { create } from 'zustand';
import type { AnalyticsRange, ShopConvStatus } from '../Seller/types';

type InboxFilter = ShopConvStatus | 'ALL' | 'UNASSIGNED' | 'MINE';

interface SellerState {
  // Active shop selection
  activeShopId: string | null;
  setActiveShopId: (id: string) => void;

  // Inventory filters
  inventorySearch: string;
  inventoryStatusFilter: string;
  inventoryLowStockOnly: boolean;
  selectedProductIds: Set<string>;
  setInventorySearch: (q: string) => void;
  setInventoryStatusFilter: (status: string) => void;
  setInventoryLowStockOnly: (v: boolean) => void;
  toggleProductSelection: (id: string) => void;
  selectAllProducts: (ids: string[]) => void;
  clearProductSelection: () => void;

  // Order filters
  orderStatusFilter: string;
  setOrderStatusFilter: (status: string) => void;

  // Analytics
  analyticsRange: AnalyticsRange;
  setAnalyticsRange: (range: AnalyticsRange) => void;
  analyticsCustomStart: string | null;
  analyticsCustomEnd: string | null;
  setAnalyticsCustomRange: (start: string, end: string) => void;

  // Inbox
  inboxFilter: InboxFilter;
  setInboxFilter: (filter: InboxFilter) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  // Composer drafts (conversationId → draft text)
  composerDrafts: Record<string, string>;
  setComposerDraft: (convId: string, draft: string) => void;
}

const STORAGE_KEY = 'seller:activeShopId';

function loadActiveShopId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export const useSellerStore = create<SellerState>((set) => ({
  activeShopId: loadActiveShopId(),
  setActiveShopId: (id) => {
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
    set({ activeShopId: id });
  },

  inventorySearch: '',
  inventoryStatusFilter: '',
  inventoryLowStockOnly: false,
  selectedProductIds: new Set(),
  setInventorySearch: (q) => set({ inventorySearch: q }),
  setInventoryStatusFilter: (status) => set({ inventoryStatusFilter: status }),
  setInventoryLowStockOnly: (v) => set({ inventoryLowStockOnly: v }),
  toggleProductSelection: (id) => set((s) => {
    const next = new Set(s.selectedProductIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    return { selectedProductIds: next };
  }),
  selectAllProducts: (ids) => set({ selectedProductIds: new Set(ids) }),
  clearProductSelection: () => set({ selectedProductIds: new Set() }),

  orderStatusFilter: '',
  setOrderStatusFilter: (status) => set({ orderStatusFilter: status }),

  analyticsRange: '30d',
  setAnalyticsRange: (range) => set({ analyticsRange: range }),
  analyticsCustomStart: null,
  analyticsCustomEnd: null,
  setAnalyticsCustomRange: (start, end) => set({ analyticsCustomStart: start, analyticsCustomEnd: end, analyticsRange: 'custom' }),

  inboxFilter: 'OPEN',
  setInboxFilter: (filter) => set({ inboxFilter: filter }),
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),

  composerDrafts: {},
  setComposerDraft: (convId, draft) => set((s) => ({ composerDrafts: { ...s.composerDrafts, [convId]: draft } })),
}));
