import React, { Suspense, lazy } from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useSellerShops } from '../hooks/useSellerShops';
import { useSellerStore } from '../stores/sellerStore';
import { useShopConversations } from '../hooks/useShopConversations';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import { Skeleton } from '../../../shared/components/Skeleton';
import { ShopSwitcher } from './ShopSwitcher';
import { SellerOnboardingPrompt } from './SellerOnboardingPrompt';
import { useAuthContext } from '../../../app/providers/AuthProvider';
import { ErrorBoundary } from '../../../shared/components/ErrorBoundary';

const DashboardPage = lazy(() => import('./Dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const InventoryListPage = lazy(() => import('./Inventory/InventoryListPage').then(m => ({ default: m.InventoryListPage })));
const ProductEditorPage = lazy(() => import('./Inventory/ProductEditorPage').then(m => ({ default: m.ProductEditorPage })));
const SellerOrdersPage = lazy(() => import('./Orders/SellerOrdersPage').then(m => ({ default: m.SellerOrdersPage })));
const SellerOrderDetail = lazy(() => import('./Orders/SellerOrderDetail').then(m => ({ default: m.SellerOrderDetail })));
const AnalyticsPage = lazy(() => import('./Analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const InboxPage = lazy(() => import('./Inbox/InboxPage').then(m => ({ default: m.InboxPage })));
const StaffPage = lazy(() => import('./Staff/StaffPage').then(m => ({ default: m.StaffPage })));
const ShopSettingsPage = lazy(() => import('./Settings/ShopSettingsPage').then(m => ({ default: m.ShopSettingsPage })));
const CampaignsListPage = lazy(() => import('./Ads/CampaignsListPage').then(m => ({ default: m.CampaignsListPage })));
const CampaignDetail = lazy(() => import('./Ads/CampaignDetail').then(m => ({ default: m.CampaignDetail })));
const CampaignEditor = lazy(() => import('./Ads/CampaignEditor').then(m => ({ default: m.CampaignEditor })));

const PageFallback = () => (
  <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
    <Skeleton variant="rect" width="60%" height={28} />
    <Skeleton variant="rect" width="100%" height={120} />
    <Skeleton variant="rect" width="100%" height={200} />
  </div>
);

const NAV_ITEMS = [
  { to: '/commerce/seller/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/commerce/seller/inventory', label: 'Inventory', icon: '📦' },
  { to: '/commerce/seller/orders', label: 'Orders', icon: '🛍️' },
  { to: '/commerce/seller/analytics', label: 'Analytics', icon: '📈' },
  { to: '/commerce/seller/inbox', label: 'Inbox', icon: '💬' },
  { to: '/commerce/seller/ads', label: 'Campaigns', icon: '📣' },
  { to: '/commerce/seller/staff', label: 'Staff', icon: '👥' },
  { to: '/commerce/seller/settings', label: 'Settings', icon: '⚙️' },
] as const;

const SELLER_SIDEBAR_WIDTH = 196;

interface SellerLayoutProps {
  onClickPublicShop?: () => void;
}

export const SellerLayout: React.FC<SellerLayoutProps> = () => {
  const { user } = useAuthContext();
  const { activeShop } = useSellerShops();
  const activeShopId = useSellerStore((s) => s.activeShopId);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Get unread inbox count for badge
  const { data: conversations } = useShopConversations(activeShopId);
  const unreadCount = conversations?.reduce((s, c) => s + c.unreadByStaff, 0) ?? 0;

  const isVendor = user?.roles?.includes('vendor') ?? false;
  if (!isVendor) return <SellerOnboardingPrompt />;

  const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-sm)', textDecoration: 'none',
    fontSize: 'var(--font-size-sm)',
    fontWeight: (isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)') as React.CSSProperties['fontWeight'],
    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    background: isActive ? 'var(--color-surface-3)' : 'transparent',
    transition: 'background var(--transition-fast)',
  });

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Mobile top nav scroll bar */}
        <nav style={{ display: 'flex', overflowX: 'auto', padding: 'var(--space-2)', gap: 'var(--space-1)', borderBottom: '1px solid var(--color-border-default)', flexShrink: 0 }}>
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
              borderRadius: 'var(--radius-full)', textDecoration: 'none', whiteSpace: 'nowrap',
              fontSize: 'var(--font-size-xs)', background: isActive ? 'var(--color-brand-primary)' : 'var(--color-surface-2)',
              color: isActive ? '#fff' : 'var(--color-text-secondary)',
              border: `1px solid ${isActive ? 'var(--color-brand-primary)' : 'var(--color-border-default)'}`,
            })}>
              {item.icon} {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <SellerRoutes shopId={activeShopId} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside aria-label="Seller navigation" style={{
        width: SELLER_SIDEBAR_WIDTH, flexShrink: 0,
        background: 'var(--color-surface-0)',
        borderRight: '1px solid var(--color-border-default)',
        display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto',
      }}>
        <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--color-border-default)' }}>
          <ShopSwitcher />
          {activeShop && (
            <button
              onClick={() => navigate(`/commerce/shop/${activeShop.slug}`)}
              title="View public shop"
              style={{
                marginTop: 'var(--space-2)', width: '100%', padding: '4px 8px',
                background: 'none', border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--color-text-muted)',
                fontSize: 'var(--font-size-xs)', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <span>🔗</span> View public shop
            </button>
          )}
        </div>

        <nav style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} style={navLinkStyle}>
              <span aria-hidden="true">{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.to === '/commerce/seller/inbox' && unreadCount > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 9, background: 'var(--color-danger)',
                  color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, paddingInline: 4,
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <ErrorBoundary>
          <Suspense fallback={<PageFallback />}>
            <SellerRoutes shopId={activeShopId} />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
};

const SellerRoutes: React.FC<{ shopId: string | null }> = ({ shopId }) => (
  <Routes>
    <Route index element={<Navigate to="/commerce/seller/dashboard" replace />} />
    <Route path="dashboard" element={<DashboardPage shopId={shopId} />} />
    <Route path="inventory" element={<InventoryListPage shopId={shopId} />} />
    <Route path="inventory/new" element={<ProductEditorPage shopId={shopId} productId={null} />} />
    <Route path="inventory/:productId" element={<ProductEditorPageWrapper shopId={shopId} />} />
    <Route path="orders" element={<SellerOrdersPage shopId={shopId} />} />
    <Route path="orders/:orderId" element={<SellerOrderDetailWrapper shopId={shopId} />} />
    <Route path="analytics" element={<AnalyticsPage shopId={shopId} />} />
    <Route path="inbox" element={<InboxPage shopId={shopId} />} />
    <Route path="ads" element={<CampaignsListPage shopId={shopId} />} />
    <Route path="ads/new" element={<CampaignEditor shopId={shopId} campaignId={null} />} />
    <Route path="ads/:campaignId" element={<CampaignDetailWrapper shopId={shopId} />} />
    <Route path="ads/:campaignId/edit" element={<CampaignEditorWrapper shopId={shopId} />} />
    <Route path="staff" element={<StaffPage shopId={shopId} />} />
    <Route path="settings" element={<ShopSettingsPage shopId={shopId} />} />
    <Route path="*" element={<Navigate to="/commerce/seller/dashboard" replace />} />
  </Routes>
);

// Param extraction wrappers
import { useParams } from 'react-router-dom';

const ProductEditorPageWrapper: React.FC<{ shopId: string | null }> = ({ shopId }) => {
  const { productId } = useParams<{ productId: string }>();
  return <ProductEditorPage shopId={shopId} productId={productId ?? null} />;
};
const SellerOrderDetailWrapper: React.FC<{ shopId: string | null }> = ({ shopId }) => {
  const { orderId } = useParams<{ orderId: string }>();
  return <SellerOrderDetail shopId={shopId} orderId={orderId ?? null} />;
};
const CampaignDetailWrapper: React.FC<{ shopId: string | null }> = ({ shopId }) => {
  const { campaignId } = useParams<{ campaignId: string }>();
  return <CampaignDetail shopId={shopId} campaignId={campaignId ?? null} />;
};
const CampaignEditorWrapper: React.FC<{ shopId: string | null }> = ({ shopId }) => {
  const { campaignId } = useParams<{ campaignId: string }>();
  return <CampaignEditor shopId={shopId} campaignId={campaignId ?? null} />;
};
