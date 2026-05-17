import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../shared/api/client';
import type { Shop } from '../Seller/types';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

interface ShopDTO {
  id: string; slug: string; name: string; description: string;
  logo_url: string | null; banner_url: string | null;
  rating: number; review_count: number; product_count: number; follower_count: number;
  return_policy: string; shipping_policy: string; privacy_policy: string;
  owner_id: string; created_at: string;
}

interface PublicProduct {
  id: string; shop_id: string; title: string; description: string;
  category: string; images: string[];
  variants: { id: string; label: string; price: number; stock: number }[];
  status: string; tags: string[]; slug: string; sales_last_30d: number;
}

function mapShop(dto: ShopDTO): Shop {
  return {
    id: dto.id, slug: dto.slug, name: dto.name, description: dto.description,
    logoUrl: dto.logo_url, bannerUrl: dto.banner_url,
    rating: dto.rating, reviewCount: dto.review_count,
    productCount: dto.product_count, followerCount: dto.follower_count,
    returnPolicy: dto.return_policy, shippingPolicy: dto.shipping_policy,
    privacyPolicy: dto.privacy_policy,
    notifyNewOrder: false, notifyNewMessage: false, notifyLowStock: false,
    ownerId: dto.owner_id, createdAt: new Date(dto.created_at),
  };
}

function minPrice(p: PublicProduct): number {
  const prices = p.variants.map(v => v.price);
  return Math.min(...prices);
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function usePublicShop(slug: string | undefined) {
  return useQuery({
    queryKey: ['public', 'shop', slug],
    queryFn: () => apiGet<ShopDTO>(`/api/shops/${slug}`).then(mapShop),
    enabled: !!slug,
    retry: false,
  });
}

function usePublicShopProducts(slug: string | undefined) {
  return useQuery({
    queryKey: ['public', 'shop', slug, 'products'],
    queryFn: () => apiGet<PublicProduct[]>(`/api/shops/${slug}/products`),
    enabled: !!slug,
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span aria-label={`Rating: ${rating} out of 5`} style={{ display: 'inline-flex', gap: 1 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < full || (i === full && half) ? '#f59e0b' : 'var(--color-text-muted)', fontSize: 13 }}>
          {i < full ? '★' : i === full && half ? '⭐' : '☆'}
        </span>
      ))}
    </span>
  );
};

const PolicyAccordion: React.FC<{ title: string; content: string }> = ({ title, content }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--color-border-default)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: 'var(--space-3) 0', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 600,
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      {open && (
        <p style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          {content}
        </p>
      )}
    </div>
  );
};

const ProductCard: React.FC<{ product: PublicProduct }> = ({ product }) => {
  const [hover, setHover] = useState(false);
  const price = minPrice(product);
  const hasMultipleVariants = product.variants.length > 1;
  const inStock = product.variants.some(v => v.stock > 0);
  const img = product.images[0] ?? `https://picsum.photos/seed/${product.id}/400/400`;

  return (
    <Link
      to={`/commerce/product/${product.id}`}
      style={{
        display: 'flex', flexDirection: 'column', textDecoration: 'none',
        background: 'var(--color-surface-1)', borderRadius: 'var(--radius-lg)',
        border: `1px solid ${hover ? 'var(--color-brand-primary)' : 'var(--color-border-default)'}`,
        overflow: 'hidden', transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: hover ? '0 4px 16px rgba(0,0,0,0.12)' : 'none',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Product image */}
      <div style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', background: 'var(--color-surface-2)' }}>
        <img
          src={img} alt={product.title}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: hover ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.2s' }}
        />
        {!inStock && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 'var(--font-size-sm)', padding: '4px 10px', background: 'rgba(0,0,0,0.6)', borderRadius: 4 }}>Out of stock</span>
          </div>
        )}
        {product.tags.length > 0 && (
          <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {product.tags.slice(0, 2).map(tag => (
              <span key={tag} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 3 }}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>{product.title}</div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'auto' }}>
          {product.category}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {hasMultipleVariants ? 'From ' : ''}{fmtPrice(price)}
          </span>
        </div>
        {product.sales_last_30d > 0 && (
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>🔥 {product.sales_last_30d} sold this month</div>
        )}
      </div>
    </Link>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const fmtPrice = (n: number) => `$${n.toFixed(2)}`;
const fmtNum = (n: number) => n.toLocaleString('en-US');

export const ShopPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: shop, isLoading: shopLoading, isError } = usePublicShop(slug);
  const { data: products, isLoading: productsLoading } = usePublicShopProducts(slug);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'price-asc' | 'price-desc' | 'newest'>('popular');
  const [followed, setFollowed] = useState(false);

  if (shopLoading) return <ShopSkeleton />;
  if (isError || !shop) return (
    <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
      <div style={{ fontSize: 48 }}>🏪</div>
      <h2 style={{ margin: 'var(--space-4) 0 var(--space-2)', color: 'var(--color-text-primary)' }}>Shop not found</h2>
      <p style={{ marginBottom: 'var(--space-4)' }}>The shop <strong>{slug}</strong> doesn't exist or has been removed.</p>
      <Link to="/commerce" style={{ color: 'var(--color-brand-primary)', fontWeight: 600 }}>← Back to browse</Link>
    </div>
  );

  // Derive category list
  const categories = ['All', ...Array.from(new Set((products ?? []).map(p => p.category)))];

  // Filter + sort
  const visible = (products ?? [])
    .filter(p => {
      const matchSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.tags.some(t => t.includes(searchQuery.toLowerCase()));
      const matchCat = !selectedCategory || selectedCategory === 'All' || p.category === selectedCategory;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return minPrice(a) - minPrice(b);
      if (sortBy === 'price-desc') return minPrice(b) - minPrice(a);
      if (sortBy === 'popular') return b.sales_last_30d - a.sales_last_30d;
      return 0; // newest — keep server order
    });

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>

      {/* ── Banner ── */}
      <div style={{ position: 'relative', height: 200, background: 'var(--color-surface-2)', overflow: 'hidden', flexShrink: 0 }}>
        {shop.bannerUrl && (
          <img src={shop.bannerUrl} alt="" aria-hidden style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55))' }} />
      </div>

      {/* ── Shop header ── */}
      <div style={{ background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border-default)', padding: 'var(--space-4) var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          {/* Logo */}
          <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '3px solid var(--color-surface-0)', marginTop: -36, flexShrink: 0, background: 'var(--color-surface-2)' }}>
            {shop.logoUrl
              ? <img src={shop.logoUrl} alt={shop.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, background: 'var(--color-brand-primary)', color: '#fff', fontWeight: 700 }}>{shop.name[0]}</div>
            }
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ margin: '0 0 4px', fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{shop.name}</h1>
            <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', maxWidth: 560 }}>{shop.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <StarRating rating={shop.rating} />
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{shop.rating.toFixed(1)} ({fmtNum(shop.reviewCount)} reviews)</span>
              </div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>•</span>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{fmtNum(shop.followerCount)} followers</span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>•</span>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{fmtNum(shop.productCount)} products</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0, alignSelf: 'flex-start', marginTop: 4 }}>
            <button
              onClick={() => setFollowed(f => !f)}
              style={{
                padding: '8px 18px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                fontWeight: 600, fontSize: 'var(--font-size-sm)', border: '2px solid var(--color-brand-primary)',
                background: followed ? 'var(--color-brand-primary)' : 'transparent',
                color: followed ? '#fff' : 'var(--color-brand-primary)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {followed ? '✓ Following' : '+ Follow'}
            </button>
            <Link
              to={`/communication?contact=${shop.ownerId}`}
              style={{
                padding: '8px 18px', borderRadius: 'var(--radius-md)', textDecoration: 'none',
                fontWeight: 600, fontSize: 'var(--font-size-sm)', border: '1px solid var(--color-border-default)',
                background: 'transparent', color: 'var(--color-text-secondary)',
              }}
            >
              💬 Contact seller
            </Link>
          </div>
        </div>
      </div>

      {/* ── Content area ── */}
      <div style={{ display: 'flex', gap: 'var(--space-5)', padding: 'var(--space-5)', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Left: products */}
        <div style={{ flex: '1 1 480px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="search"
              placeholder="Search products…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: '1 1 180px', padding: '8px 12px', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}
            />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              style={{ padding: '8px 10px', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}
            >
              <option value="popular">Popular</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low → high</option>
              <option value="price-desc">Price: high → low</option>
            </select>
          </div>

          {/* Category pills */}
          {categories.length > 2 && (
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === 'All' ? '' : cat)}
                  style={{
                    padding: '4px 14px', borderRadius: 'var(--radius-full)', cursor: 'pointer',
                    fontSize: 'var(--font-size-xs)', fontWeight: 500, border: '1px solid var(--color-border-default)',
                    background: (selectedCategory === cat || (cat === 'All' && !selectedCategory)) ? 'var(--color-brand-primary)' : 'transparent',
                    color: (selectedCategory === cat || (cat === 'All' && !selectedCategory)) ? '#fff' : 'var(--color-text-secondary)',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Product grid */}
          {productsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ aspectRatio: '0.85', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 'var(--space-2)' }}>📦</div>
              <div>{searchQuery || selectedCategory ? 'No products match your filters.' : 'This shop has no products yet.'}</div>
              {(searchQuery || selectedCategory) && (
                <button onClick={() => { setSearchQuery(''); setSelectedCategory(''); }} style={{ marginTop: 'var(--space-3)', padding: '6px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-default)', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {visible.length} product{visible.length !== 1 ? 's' : ''}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
                {visible.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </>
          )}
        </div>

        {/* Right: shop info sidebar */}
        <aside style={{ flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

          {/* Stats */}
          <div style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            {[
              { label: 'Rating', value: `${shop.rating.toFixed(1)} ★` },
              { label: 'Reviews', value: fmtNum(shop.reviewCount) },
              { label: 'Followers', value: fmtNum(shop.followerCount) },
              { label: 'Products', value: fmtNum(shop.productCount) },
            ].map(stat => (
              <div key={stat.label}>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{stat.label}</div>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Member since */}
          <div style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            Member since {shop.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>

          {/* Policies */}
          <div style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)' }}>
            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>Shop policies</h3>
            <PolicyAccordion title="Return policy" content={shop.returnPolicy} />
            <PolicyAccordion title="Shipping policy" content={shop.shippingPolicy} />
            {shop.privacyPolicy && <PolicyAccordion title="Privacy policy" content={shop.privacyPolicy} />}
          </div>

          {/* Manage this shop (if owner) */}
          <Link
            to="/commerce/seller/dashboard"
            style={{
              display: 'block', textAlign: 'center', padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-default)',
              textDecoration: 'none', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)',
            }}
          >
            🏬 Manage this shop
          </Link>
        </aside>
      </div>
    </div>
  );
};

// ─── Loading skeleton ──────────────────────────────────────────────────────────

const ShopSkeleton: React.FC = () => (
  <div style={{ height: '100%', overflowY: 'auto' }}>
    <div style={{ height: 200, background: 'var(--color-surface-2)' }} />
    <div style={{ background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border-default)', padding: 'var(--space-4) var(--space-5)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
      <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-2)', marginTop: -36 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 24, width: 200, background: 'var(--color-surface-2)', borderRadius: 4 }} />
        <div style={{ height: 14, width: '60%', background: 'var(--color-surface-2)', borderRadius: 4 }} />
        <div style={{ height: 14, width: 140, background: 'var(--color-surface-2)', borderRadius: 4 }} />
      </div>
    </div>
    <div style={{ padding: 'var(--space-5)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ aspectRatio: '0.85', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)' }} />
      ))}
    </div>
  </div>
);
