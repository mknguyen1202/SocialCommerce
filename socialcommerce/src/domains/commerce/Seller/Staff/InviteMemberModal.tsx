import React, { useState } from 'react';
import { useInviteMember } from '../../hooks/useShopMembers';
import { ROLE_DEFAULT_PERMISSIONS } from '../types';
import type { ShopRole, ShopPermArea, ShopPermissions } from '../types';

interface InviteMemberModalProps {
  shopId: string;
  onClose: () => void;
}

const ALL_AREAS: ShopPermArea[] = ['inventory', 'orders', 'analytics', 'conversations', 'ads', 'settings', 'staff'];

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ shopId, onClose }) => {
  const inviteMember = useInviteMember(shopId);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShopRole>('staff');
  const [perms, setPerms] = useState<ShopPermissions>({ ...ROLE_DEFAULT_PERMISSIONS['staff'] });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRoleChange = (r: ShopRole) => {
    setRole(r);
    setPerms({ ...ROLE_DEFAULT_PERMISSIONS[r] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    await inviteMember.mutateAsync({ email: email.trim(), role, permissions: perms });
    setSuccess(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Invite team member"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={handleSubmit}
        style={{ background: 'var(--color-surface-1)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', width: 440, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', boxShadow: 'var(--shadow-xl)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)', color: 'var(--color-text-primary)' }}>Invite Team Member</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)' }}>✕</button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-success)' }}>
            ✓ Invitation sent to {email}
          </div>
        ) : (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 500 }}>Email address *</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                style={inputStyle}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 500 }}>Role</span>
              <select value={role} onChange={e => handleRoleChange(e.target.value as ShopRole)} style={inputStyle}>
                <option value="manager">Manager — full access (except settings & staff)</option>
                <option value="staff">Staff — limited access</option>
              </select>
            </label>

            <fieldset style={{ border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
              <legend style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 500, padding: '0 var(--space-1)' }}>Permissions</legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {ALL_AREAS.map(area => (
                  <label key={area} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={perms[area]}
                      onChange={e => setPerms(p => ({ ...p, [area]: e.target.checked }))}
                    />
                    {area.charAt(0).toUpperCase() + area.slice(1)}
                  </label>
                ))}
              </div>
            </fieldset>

            {error && (
              <div role="alert" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)' }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
              <button type="submit" disabled={inviteMember.isPending} style={primaryBtnStyle}>
                {inviteMember.isPending ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-0)',
  color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)',
};
const primaryBtnStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-4)',
  background: 'var(--color-brand-primary)', color: '#fff',
  border: 'none', borderRadius: 'var(--radius-md)',
  cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 600,
};
const secondaryBtnStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  background: 'transparent', color: 'var(--color-text-secondary)',
  border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)',
  cursor: 'pointer', fontSize: 'var(--font-size-sm)',
};
