import React, { useState } from 'react';
import {
  useShopMembers,
  useShopInvites,
  useUpdateMember,
  useRemoveMember,
  useRevokeInvite,
} from '../../hooks/useShopMembers';
import type { ShopMember, ShopRole, ShopPermArea } from '../types';
import { InviteMemberModal } from './InviteMemberModal';

interface StaffPageProps {
  shopId: string | null;
}

const ALL_AREAS: ShopPermArea[] = ['inventory', 'orders', 'analytics', 'conversations', 'ads', 'settings', 'staff'];
const ROLE_LABELS: Record<ShopRole, string> = { owner: 'Owner', manager: 'Manager', staff: 'Staff' };
const ROLE_COLORS: Record<ShopRole, string> = { owner: '#8b5cf6', manager: '#3b82f6', staff: '#10b981' };

const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const StaffPage: React.FC<StaffPageProps> = ({ shopId }) => {
  const { data: members, isLoading } = useShopMembers(shopId!);
  const { data: invites } = useShopInvites(shopId!);
  const removeMember = useRemoveMember(shopId!);
  const revokeInvite = useRevokeInvite(shopId!);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const handleRemove = async (member: ShopMember) => {
    if (!window.confirm(`Remove ${member.displayName} from this shop?`)) return;
    await removeMember.mutateAsync(member.userId);
  };

  return (
    <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', height: '100%', overflowY: 'auto' }} role="main" aria-label="Staff management">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)' }}>Staff</h1>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            Manage who can access and manage your shop.
          </p>
        </div>
        <button onClick={() => setShowInviteModal(true)} style={primaryBtnStyle}>
          + Invite Member
        </button>
      </div>

      {/* Members list */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 70, borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Members ({members?.length ?? 0})
          </h2>
          {members?.map(member => (
            editingMemberId === member.userId ? (
              <MemberPermEditor
                key={member.userId}
                shopId={shopId!}
                member={member}
                onDone={() => setEditingMemberId(null)}
              />
            ) : (
              <MemberRow
                key={member.userId}
                member={member}
                onEdit={() => setEditingMemberId(member.userId)}
                onRemove={() => handleRemove(member)}
              />
            )
          ))}
        </div>
      )}

      {/* Pending invites */}
      {(invites?.length ?? 0) > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pending Invites ({invites?.length ?? 0})
          </h2>
          {invites?.map(invite => (
            <div key={invite.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-surface-1)', border: '1px dashed var(--color-border-default)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{invite.email}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  {ROLE_LABELS[invite.role]} · Expires {fmtDate(invite.expiresAt)}
                </div>
              </div>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: '#f59e0b22', color: '#f59e0b', fontWeight: 600 }}>
                Pending
              </span>
              <button
                onClick={() => revokeInvite.mutateAsync(invite.id)}
                style={{ background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', cursor: 'pointer', fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {showInviteModal && (
        <InviteMemberModal shopId={shopId!} onClose={() => setShowInviteModal(false)} />
      )}
    </div>
  );
};

const MemberRow: React.FC<{ member: ShopMember; onEdit: () => void; onRemove: () => void }> = ({ member, onEdit, onRemove }) => {
  const isOwner = member.role === 'owner';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-surface-1)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-surface-3)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
        {member.avatarUrl ? <img src={member.avatarUrl} alt={member.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : member.displayName[0]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {member.displayName}
          <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 'var(--radius-full)', background: ROLE_COLORS[member.role] + '22', color: ROLE_COLORS[member.role], fontWeight: 600 }}>
            {ROLE_LABELS[member.role]}
          </span>
        </div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          {member.email} · Joined {fmtDate(member.joinedAt)}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {ALL_AREAS.filter(a => member.permissions[a]).map(a => (
            <span key={a} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}>
              {a}
            </span>
          ))}
        </div>
      </div>
      {!isOwner && (
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          <button onClick={onEdit} style={iconBtnStyle} aria-label={`Edit ${member.displayName}`} title="Edit permissions">✏️</button>
          <button onClick={onRemove} style={{ ...iconBtnStyle, color: 'var(--color-danger)' }} aria-label={`Remove ${member.displayName}`} title="Remove member">🗑️</button>
        </div>
      )}
    </div>
  );
};

const MemberPermEditor: React.FC<{ shopId: string; member: ShopMember; onDone: () => void }> = ({ shopId, member, onDone }) => {
  const updateMember = useUpdateMember(shopId);
  const [role, setRole] = useState<ShopRole>(member.role);
  const [perms, setPerms] = useState({ ...member.permissions });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateMember.mutateAsync({ userId: member.userId, role, permissions: perms });
    setSaving(false);
    onDone();
  };

  const togglePerm = (area: ShopPermArea) => {
    setPerms(p => ({ ...p, [area]: !p[area] }));
  };

  return (
    <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface-1)', border: '1px solid var(--color-brand-primary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>Edit: {member.displayName}</h3>
        <button onClick={onDone} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 18 }}>✕</button>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>Role:</span>
        <select value={role} onChange={e => setRole(e.target.value as ShopRole)} style={selectStyle}>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
        </select>
      </label>

      <div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Permissions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {ALL_AREAS.map(area => (
            <label key={area} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              <input type="checkbox" checked={perms[area]} onChange={() => togglePerm(area)} />
              {area.charAt(0).toUpperCase() + area.slice(1)}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
        <button onClick={onDone} style={secondaryBtnStyle}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={primaryBtnStyle}>{saving ? 'Saving…' : 'Save Changes'}</button>
      </div>
    </div>
  );
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
const selectStyle: React.CSSProperties = {
  padding: '5px 10px', border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-1)',
  color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)',
};
const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4, lineHeight: 1,
};
