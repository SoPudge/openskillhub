'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { authApiFetch } from '@/lib/api';
import type { Skill, ApiKey } from '@openskillhub/shared';

type DashboardSkill = Skill & { versions?: { version: string }[] };

export default function DashboardPage() {
  const { user, token, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [skills, setSkills] = useState<DashboardSkill[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyResult, setNewKeyResult] = useState('');
  const [tab, setTab] = useState<'skills' | 'apikeys'>('skills');
  const [loading, setLoading] = useState(true);

  const api = useMemo(() => token ? authApiFetch(token) : null, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !api) { router.push('/auth/login'); return; }

    Promise.all([
      api<{ data: DashboardSkill[] }>(`/skills?author=${user.username}&limit=100`),
      api<ApiKey[]>('/auth/api-keys'),
    ]).then(([skillsData, keysData]) => {
      setSkills(skillsData?.data || []);
      setApiKeys(Array.isArray(keysData) ? keysData : []);
      setLoading(false);
    });
  }, [user, authLoading, router, api]);

  const createApiKey = async () => {
    if (!newKeyName.trim() || !api) return;
    try {
      const data = await api<ApiKey & { key: string }>('/auth/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName }),
      });
      setNewKeyResult(data.key);
      setNewKeyName('');
      setApiKeys((prev) => [{ id: data.id, userId: user!.id, name: newKeyName, keyPrefix: data.keyPrefix, lastUsedAt: undefined, createdAt: new Date().toISOString() }, ...prev]);
    } catch { /* ignore */ }
  };

  const deleteApiKey = async (id: string) => {
    if (!api) return;
    try {
      await api(`/auth/api-keys/${id}`, { method: 'DELETE' });
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    } catch { /* ignore */ }
  };

  if (authLoading || loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: '#999' }}>加载中...</div>;
  }

  if (!user) return null;

  const cardStyle = { background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '1rem' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>控制面板</h1>
          <p style={{ color: '#666', marginTop: '0.25rem' }}>欢迎, {user.displayName || user.username}</p>
        </div>
        <button
          onClick={logout}
          style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          退出登录
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{skills.length}</div>
          <div style={{ color: '#666', fontSize: '0.875rem' }}>我的技能</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{skills.reduce((sum, s) => sum + s.downloadCount, 0)}</div>
          <div style={{ color: '#666', fontSize: '0.875rem' }}>总下载量</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{apiKeys.length}</div>
          <div style={{ color: '#666', fontSize: '0.875rem' }}>API Keys</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #eee', marginBottom: '1.5rem' }}>
        {(['skills', 'apikeys'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid #111' : '2px solid transparent',
              fontWeight: tab === t ? 600 : 400, cursor: 'pointer', fontSize: '1rem',
            }}
          >
            {t === 'skills' ? '我的技能' : 'API Keys'}
          </button>
        ))}
      </div>

      {tab === 'skills' && (
        <div>
          {skills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
              <p>你还没有发布任何技能</p>
              <a href="/skills" style={{ color: '#2563eb' }}>浏览技能市场</a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {skills.map((skill) => (
                <a key={skill.id} href={`/skills/${skill.name}`} style={{ ...cardStyle, textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{skill.displayName}</span>
                      <span style={{ color: '#999', marginLeft: '0.5rem', fontSize: '0.875rem' }}>{skill.name}</span>
                      {skill.visibility !== 'public' && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.125rem 0.375rem', background: skill.visibility === 'private' ? '#fee2e2' : '#e0e7ff', borderRadius: 4 }}>
                          {skill.visibility === 'private' ? '私有' : '团队'}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#666' }}>
                      <span>v{skill.versions?.[0]?.version || '—'}</span>
                      <span>⬇ {skill.downloadCount}</span>
                    </div>
                  </div>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#666' }}>
                    {skill.description.slice(0, 100)}{skill.description.length > 100 ? '...' : ''}
                  </p>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'apikeys' && (
        <div>
          {/* Create key */}
          <div style={{ ...cardStyle, marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 0.75rem' }}>创建 API Key</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key 名称 (如 MacBook Pro)"
                style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.875rem' }}
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

          {/* Key list */}
          {apiKeys.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>暂无 API Key</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {apiKeys.map((key) => (
                <div key={key.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
