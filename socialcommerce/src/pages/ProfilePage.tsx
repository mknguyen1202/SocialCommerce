import React, { useRef, useState } from 'react';
import { useAuthContext } from '../app/providers/AuthProvider';
import { Avatar } from '../shared/components/Avatar';
import { Icon } from '../shared/components/Icon';
import { Camera, Pencil, Save, RotateCcw, ShieldCheck } from '../shared/components/iconRegistry';
import { useIsMobile } from '../shared/hooks/useIsMobile';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

const ProfilePage: React.FC = () => {
    const { user, apiFetch } = useAuthContext();
    const isMobile = useIsMobile();

    const [editingAbout, setEditingAbout] = useState(false);
    const [draftName, setDraftName] = useState(user?.name ?? '');
    const [draftBio, setDraftBio] = useState(user?.bio ?? '');
    const [savingAbout, setSavingAbout] = useState(false);
    const [aboutError, setAboutError] = useState('');

    const [avatarSrc, setAvatarSrc] = useState<string | null>(user?.avatarUrl ?? null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarError, setAvatarError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const displayName = user?.name ?? user?.email ?? 'User';

    const handleAvatarFile = async (file: File) => {
        if (file.size > MAX_AVATAR_BYTES) {
            setAvatarError('Image must be under 2 MB.');
            return;
        }
        setAvatarError('');
        setUploadingAvatar(true);
        try {
            const res = await apiFetch('/api/profile/avatar', {
                method: 'POST',
                body: file,
                headers: { 'Content-Type': file.type },
            });
            if (res.ok) {
                const data = await res.json() as { avatarUrl: string };
                setAvatarSrc(data.avatarUrl);
            }
        } catch {
            setAvatarError('Upload failed. Please try again.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSaveAbout = async () => {
        setAboutError('');
        setSavingAbout(true);
        try {
            const res = await apiFetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: draftName.trim(), bio: draftBio.trim() }),
            });
            if (!res.ok) setAboutError('Save failed. Please try again.');
            else setEditingAbout(false);
        } catch {
            setAboutError('Save failed. Please try again.');
        } finally {
            setSavingAbout(false);
        }
    };

    const containerStyle: React.CSSProperties = {
        padding: isMobile
            ? 'var(--space-5) var(--space-4)'
            : 'var(--space-8) var(--space-8)',
        paddingBottom: 'calc(var(--layout-tab-bar-height, 64px) + var(--space-6))',
        maxWidth: 860,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
    };

    const cardStyle: React.CSSProperties = {
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(20px, 3vw, 32px)',
    };

    const sectionHeadingStyle: React.CSSProperties = {
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-semibold)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--color-text-muted)',
        marginBottom: 'var(--space-4)',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-medium)',
        color: 'var(--color-text-secondary)',
        marginBottom: 'var(--space-1)',
        display: 'block',
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '8px 12px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-default)',
        background: 'var(--color-surface-1)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-family)',
        fontSize: 'var(--font-size-base)',
        outline: 'none',
        boxSizing: 'border-box',
    };

    const btnPrimaryStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: '7px 14px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-brand-primary)',
        background: 'var(--color-brand-primary)',
        color: '#fff',
        fontFamily: 'var(--font-family)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-semibold)',
        cursor: 'pointer',
    };

    const btnGhostStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: '7px 14px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-default)',
        background: 'transparent',
        color: 'var(--color-text-secondary)',
        fontFamily: 'var(--font-family)',
        fontSize: 'var(--font-size-sm)',
        cursor: 'pointer',
    };

    return (
        <div style={containerStyle}>
            {/* ── Header card ───────────────────────────────────── */}
            <div style={{ ...cardStyle, display: 'flex', gap: 'var(--space-5)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Avatar with upload overlay */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar
                        src={avatarSrc}
                        name={displayName}
                        size="xl"
                    />
                    <button
                        type="button"
                        aria-label="Upload profile photo"
                        disabled={uploadingAvatar}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            border: '2px solid var(--color-surface-2)',
                            background: 'var(--color-surface-3)',
                            color: 'var(--color-text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <Icon icon={Camera} size={14} />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleAvatarFile(file);
                        }}
                    />
                </div>

                {/* Name + email */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', fontWeight: 'var(--font-weight-bold)', lineHeight: 1.2 }}>
                        {user?.name ?? 'Unknown User'}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
                        {user?.email}
                    </div>
                    {avatarError && (
                        <div style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', marginTop: 6 }}>
                            {avatarError}
                        </div>
                    )}
                    {uploadingAvatar && (
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', marginTop: 6 }}>
                            Uploading…
                        </div>
                    )}
                </div>
            </div>

            {/* ── About section ─────────────────────────────────── */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                    <p style={sectionHeadingStyle}>About</p>
                    {!editingAbout && (
                        <button
                            type="button"
                            style={btnGhostStyle}
                            onClick={() => {
                                setDraftName(user?.name ?? '');
                                setDraftBio(user?.bio ?? '');
                                setEditingAbout(true);
                            }}
                        >
                            <Icon icon={Pencil} size={13} />
                            Edit
                        </button>
                    )}
                </div>

                {editingAbout ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <div>
                            <label style={labelStyle} htmlFor="profile-name">Display name</label>
                            <input
                                id="profile-name"
                                style={inputStyle}
                                value={draftName}
                                onChange={(e) => setDraftName(e.target.value)}
                                maxLength={80}
                            />
                        </div>
                        <div>
                            <label style={labelStyle} htmlFor="profile-bio">Bio</label>
                            <textarea
                                id="profile-bio"
                                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                                value={draftBio}
                                onChange={(e) => setDraftBio(e.target.value)}
                                maxLength={300}
                                placeholder="Tell people a bit about yourself…"
                            />
                        </div>
                        {aboutError && (
                            <div style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>{aboutError}</div>
                        )}
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button type="button" style={btnPrimaryStyle} onClick={handleSaveAbout} disabled={savingAbout}>
                                <Icon icon={Save} size={13} />
                                {savingAbout ? 'Saving…' : 'Save'}
                            </button>
                            <button type="button" style={btnGhostStyle} onClick={() => setEditingAbout(false)} disabled={savingAbout}>
                                <Icon icon={RotateCcw} size={13} />
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        <div>
                            <span style={labelStyle}>Display name</span>
                            <span style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-base)' }}>
                                {user?.name ?? '—'}
                            </span>
                        </div>
                        <div>
                            <span style={labelStyle}>Bio</span>
                            <span style={{ color: user?.bio ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontSize: 'var(--font-size-base)' }}>
                                {user?.bio ?? 'No bio yet.'}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Permissions section ───────────────────────────── */}
            <div style={cardStyle}>
                <p style={sectionHeadingStyle}>Permissions</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {(user?.permissions ?? []).map((perm) => (
                        <span
                            key={perm}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--color-surface-3)',
                                border: '1px solid var(--color-border-muted)',
                                fontSize: 'var(--font-size-xs)',
                                fontFamily: 'var(--font-mono, monospace)',
                                color: 'var(--color-text-secondary)',
                            }}
                        >
                            <Icon icon={ShieldCheck} size={11} />
                            {perm}
                        </span>
                    ))}
                    {(!user?.permissions || user.permissions.length === 0) && (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No permissions assigned.</span>
                    )}
                </div>
            </div>

            {/* ── Activity placeholder ──────────────────────────── */}
            <div style={cardStyle}>
                <p style={sectionHeadingStyle}>Activity</p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                    Recent activity will appear here.
                </p>
            </div>
        </div>
    );
};

export default ProfilePage;
