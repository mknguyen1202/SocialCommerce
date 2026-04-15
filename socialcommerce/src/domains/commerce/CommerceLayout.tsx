import React, { Suspense, lazy } from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { useCommerceStore } from './stores/commerceStore';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { ProductGrid } from './Browse/ProductGrid';
import { CategoryNav } from './Browse/CategoryNav';
import { SearchBar } from './Browse/SearchBar';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { Skeleton } from '../../shared/components/Skeleton';

const ProductDetail = lazy(() => import('./Product/ProductDetail').then(m => ({ default: m.ProductDetail })));
const CartPage = lazy(() => import('./Cart/CartPage').then(m => ({ default: m.CartPage })));
const MiniCart = lazy(() => import('./Cart/MiniCart').then(m => ({ default: m.MiniCart })));
const CheckoutPage = lazy(() => import('./Checkout/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const OrderHistory = lazy(() => import('./Orders/OrderHistory').then(m => ({ default: m.OrderHistory })));
const OrderDetail = lazy(() => import('./Orders/OrderDetail').then(m => ({ default: m.OrderDetail })));

const RouteFallback = () => (
	<div style={{ padding: 'var(--space-6)', maxWidth: 760, margin: '0 auto' }}>
		<Skeleton variant="rect" width="100%" height={200} />
	</div>
);

const SIDEBAR_WIDTH = 220;

export const CommerceLayout: React.FC = () => {
	const isMobile = useIsMobile();
	const { cart, isMiniCartOpen, openMiniCart } = useCommerceStore();

	const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
		display: 'flex',
		alignItems: 'center',
		gap: 'var(--space-2)',
		padding: 'var(--space-2) var(--space-3)',
		borderRadius: 'var(--radius-sm)',
		textDecoration: 'none',
		fontSize: 'var(--font-size-sm)',
		fontWeight: (isActive
			? 'var(--font-weight-semibold)'
			: 'var(--font-weight-normal)') as React.CSSProperties['fontWeight'],
		color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
		background: isActive ? 'var(--color-surface-3)' : 'transparent',
		transition: 'background var(--transition-fast), color var(--transition-fast)',
	});

	const mobileNavItemStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
		display: 'inline-flex',
		alignItems: 'center',
		gap: 'var(--space-1)',
		paddingInline: 'var(--space-3)',
		height: 28,
		borderRadius: 'var(--radius-full)',
		textDecoration: 'none',
		whiteSpace: 'nowrap',
		fontSize: 'var(--font-size-sm)',
		fontWeight: (isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)') as React.CSSProperties['fontWeight'],
		color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
		background: isActive ? 'var(--color-surface-3)' : 'transparent',
		border: `1px solid ${isActive ? 'var(--color-border-default)' : 'transparent'}`,
		transition: 'background var(--transition-fast)',
	});

	return (
		<div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
			{/* Sidebar — hidden on mobile (xs/sm) */}
			{!isMobile && (
				<aside
					aria-label="Shop navigation"
					style={{
						width: SIDEBAR_WIDTH,
						flexShrink: 0,
						background: 'var(--color-surface-0)',
						borderRight: '1px solid var(--color-border-default)',
						display: 'flex',
						flexDirection: 'column',
						height: '100%',
						overflowY: 'auto',
					}}
				>
					<div style={{ padding: 'var(--space-3)' }}>
						{/* Cart button */}
						<Button
							variant="secondary"
							size="sm"
							style={{ width: '100%', marginBottom: 'var(--space-4)', justifyContent: 'space-between' }}
							onClick={openMiniCart}
							aria-label={`Cart (${cart.itemCount} items)`}
						>
							<span>🛒 Cart</span>
							{cart.itemCount > 0 && (
								<Badge count={cart.itemCount} variant="brand" />
							)}
						</Button>

						{/* Navigation links */}
						<nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 'var(--space-4)' }}>
							<NavLink to="/commerce" end style={navLinkStyle}>🏪 Browse</NavLink>
							<NavLink to="/commerce/orders" style={navLinkStyle}>📦 My Orders</NavLink>
							<NavLink to="/commerce/seller" style={navLinkStyle}>🏬 My Shop</NavLink>
						</nav>

						{/* Category navigation */}
						<CategoryNav />
					</div>
				</aside>
			)}			{/* Main content */}
			<main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>			{isMobile && (
				<nav aria-label="Shop navigation" className="mobile-sub-nav">
					<NavLink to="/commerce" end style={mobileNavItemStyle}>🏪 Browse</NavLink>
					<NavLink to="/commerce/orders" style={mobileNavItemStyle}>📦 Orders</NavLink>
					<NavLink to="/commerce/seller" style={mobileNavItemStyle}>🏬 My Shop</NavLink>
					<button
						onClick={openMiniCart}
						aria-label={`Cart (${cart.itemCount} items)`}
						style={{
							...mobileNavItemStyle({ isActive: false }),
							cursor: 'pointer',
							border: '1px solid var(--color-border-default)',
							marginLeft: 'var(--space-2)',
						}}
					>
						🛒{cart.itemCount > 0 ? ` · ${cart.itemCount}` : ''}
					</button>
				</nav>
			)}
				{/* Top search bar */}
				<div style={{
					padding: 'var(--space-3) var(--space-4)',
					borderBottom: '1px solid var(--color-border-default)',
					background: 'var(--color-surface-0)',
					flexShrink: 0,
					display: 'flex',
					alignItems: 'center',
				}}>
					<SearchBar />
				</div>

				{/* Routed content */}
				<div style={{ flex: 1, overflow: 'hidden' }}>
					<Routes>
						<Route index element={<ProductGrid />} />
						<Route path="product/:id" element={<Suspense fallback={<RouteFallback />}><ProductDetail /></Suspense>} />
						<Route path="cart" element={<Suspense fallback={<RouteFallback />}><CartPage /></Suspense>} />
						<Route path="checkout" element={<Suspense fallback={<RouteFallback />}><CheckoutPage /></Suspense>} />
						<Route path="orders" element={<Suspense fallback={<RouteFallback />}><OrderHistory /></Suspense>} />
						<Route path="orders/:id" element={<Suspense fallback={<RouteFallback />}><OrderDetail /></Suspense>} />
						<Route path="seller/*" element={<SellerPlaceholder />} />
						<Route path="*" element={<Navigate to="/commerce" replace />} />
					</Routes>
				</div>
			</main>

			{/* MiniCart drawer — only mount when open */}
			{isMiniCartOpen && (
				<Suspense fallback={null}>
					<MiniCart />
				</Suspense>
			)}
		</div>
	);
};

// Placeholder to be replaced by Phase 5 SellerLayout
const SellerPlaceholder: React.FC = () => (
	<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
		<p>Seller dashboard loading…</p>
	</div>
);
