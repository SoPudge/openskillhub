'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { authApiFetch } from '@/lib/api';
import type { ApiKey, User } from '@openskillhub/shared';

export default function SettingsPage() {
  const { user, token, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const api = useMemo(() => token ? authApiFetch(token) : null, [token]);

  const [profile, setProfile] = useState<User | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'profile' | 'apikeys'>('profile');

  // Profile form
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // API key form
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyResult, setNewKeyResult] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user || !api) { router.push('/auth/login'); return; }
    Promise.all([
      api<User>('/auth/me'),
      api<ApiKey[]>('/auth/api-keys'),
    ]).then(([me, keys]) => {
      setProfile(me);
      setDisplayName(me.displayName || '');
      setAvatarUrl((me as User & { avatarUrl?: string }).avatarUrl || '');
      setApiKeys(Array.isArray(keys) ? keys : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, authLoading, router, api]);

  const handleSaveProfile = useCallback(async () => {
    if (!api) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const updated = await api<User>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName: displayName || undefined, avatarUrl: avatarUrl || undefined }),
      });
      setProfile(updated);
      setSaveMsg('已保存');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }, [api, displayName, avatarUrl]);

  const createApiKey = useCallback(async () => {
    if (!api || !newKeyName.trim()) return;
    try {
      const data = await api<ApiKey & { key: string }>('/auth/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName }),
      });
      setNewKeyResult(data.key);
      setNewKeyName('');
      setApiKeys((prev) => [{ id: data.id, userId: user!.id, name: newKeyName, keyPrefix: data.keyPrefix, lastUsedAt: undefined, createdAt: new Date().toISOString() }, ...prev]);
    } catch { /* ignore */ }
  }, [api, newKeyName, user]);

  const deleteApiKey = useCallback(async (id: string) => {
    if (!api) return;
    try {
      await api(`/auth/api-keys/${id}`, { method: 'DELETE' });
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    } catch { /* ignore */ }
  }, [api]);

  if (authLoading || loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: '#999' }}>加载中...</div>;
  }
  if (!user || !profile) return null;

  const cardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '1.5rem' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>个人设置</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>@{profile.username} · {profile.email}</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #eee', marginBottom: '1.5rem' }}>
        {([
          { key: 'profile' as const, label: '个人资料' },
          { key: 'apikeys' as const, label: 'API Keys' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.5rem 1rem', background: 'none', border: 'none',
              borderBottom: tab === t.key ? '2px solid #111' : '2px solid transparent',
              fontWeight: tab === t.key ? 600 : 400, cursor: 'pointer', fontSize: '1rem',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div style={cardStyle}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>用户名</label>
            <input value={profile.username} disabled style={{ ...inputStyle, background: '#f9f9f9', color: '#999' }} />
            <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>用户名不可修改</div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>邮箱</label>
            <input value={profile.email} disabled style={{ ...inputStyle, background: '#f9f9f9', color: '#999' }} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>显示名称</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="你的昵称" style={inputStyle} />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>头像 URL</label>
            <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
            {avatarUrl && (
              <div style={{ marginTop: '0.5rem' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarUrl} alt="Avatar preview" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee' }} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              style={{ padding: '0.5rem 1.5rem', background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem', opacity: saving ? 0.5 : 1 }}
            >
              {saving ? '保存中...' : '保存'}
            </button>
            {saveMsg && <span style={{ fontSize: '0.875rem', color: saveMsg === '已保存' ? '#059669' : '#dc2626' }}>{saveMsg}</span>}
          </div>

          <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #eee' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500 }}>查看公开主页</div>
              <div style={{ fontSize: '0.8rem', color: '#999' }}>其他人看到的你的资料</div>
            </div>
            <a href={`/authors/${profile.username}`} style={{ padding: '0.4rem 1rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.85rem', textDecoration: 'none', color: '#111' }}>
              查看
            </a>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <div>
              <div style={{ fontWeight: 500, color: '#dc2626' }}>退出登录</div>
            </div>
            <button onClick={logout} style={{ padding: '0.4rem 1rem', border: '1px solid #fca5a5', borderRadius: 6, fontSize: '0.85rem', background: '#fff', color: '#dc2626', cursor: 'pointer' }}>
              退出
            </button>
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {tab === 'apikeys' && (
        <div>
          <div style={{ ...cardStyle, marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 0.75rem' }}>创建 API Key</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key 名称"
                onKeyDown={(e) => e.key === 'Enter' && createApiKey()}
                style={{ flex: 1, ...inputStyle }}
              />
              <button
                onClick={createApiKey}
                style={{ padding: '0.5rem 1rem', background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
              >
                创建
              </button>
            </div>
            {newKeyResult && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: '0.875rem' }}>
                <strong>请保存此 Key（仅显示一次）：</strong>
                <code style={{ display: 'block', marginTop: '0.25rem', padding: '0.5rem', background: '#fff', borderRadius: 4, wordBreak: 'break-all' }}>
                  {newKeyResult}
                </code>
              </div>
            )}
          </div>

          {apiKeys.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>暂无 API Key</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {apiKeys.map((key) => (
                <div key={key.id} style={{ ...cardStyle, padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{key.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.125rem' }}>
                      <code>{key.keyPrefix}...</code> · 创建于 {new Date(key.createdAt).toLocaleDateString('zh-CN')}
                      {key.lastUsedAt && ` · 最近使用 ${new Date(key.lastUsedAt).toLocaleDateString('zh-CN')}`}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteApiKey(key.id)}
                    style={{ padding: '0.25rem 0.75rem', background: '#fff', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
