'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { authApiFetch } from '@/lib/api';
import { API_BASE } from '@/lib/constants';
import type { Skill, ApiKey } from '@openskillhub/shared';

type DashboardSkill = Skill & { versions?: { version: string; createdAt: string }[] };

interface StatsData {
  totalDownloads: number;
  period: string;
  days: number;
  timeline: { date: string; count: number }[];
  byAgent: { agentType: string; count: number }[];
}

export default function DashboardPage() {
  const { user, token, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [skills, setSkills] = useState<DashboardSkill[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyResult, setNewKeyResult] = useState('');
  const [tab, setTab] = useState<'skills' | 'apikeys' | 'stats'>('skills');
  const [loading, setLoading] = useState(true);
  const [skillStats, setSkillStats] = useState<Record<string, StatsData>>({});

  const api = useMemo(() => token ? authApiFetch(token) : null, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !api) { router.push('/auth/login'); return; }

    Promise.all([
      api<{ data: DashboardSkill[] }>(`/skills?author=${user.username}&limit=100`),
      api<ApiKey[]>('/auth/api-keys'),
    ]).then(([skillsData, keysData]) => {
      const s = skillsData?.data || [];
      setSkills(s);
      setApiKeys(Array.isArray(keysData) ? keysData : []);
      setLoading(false);

      // Fetch stats for each skill
      s.slice(0, 20).forEach((skill) => {
        fetch(`${API_BASE}/skills/${skill.name}/stats?period=day&days=30`)
          .then((r) => r.json())
          .then((data: StatsData) => {
            setSkillStats((prev) => ({ ...prev, [skill.name]: data }));
          })
          .catch(() => {});
      });
    });
  }, [user, authLoading, router, api]);

  const createApiKey = useCallback(async () => {
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
  }, [newKeyName, api, user]);

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

  if (!user) return null;

  const totalDownloads = skills.reduce((sum, s) => sum + s.downloadCount, 0);
  const totalVersions = skills.reduce((sum, s) => sum + (s.versions?.length || 0), 0);

  // Aggregate 30-day timeline across all skills
  const aggregatedTimeline: Record<string, number> = {};
  Object.values(skillStats).forEach((s) => {
    s.timeline.forEach((t) => {
      aggregatedTimeline[t.date] = (aggregatedTimeline[t.date] || 0) + t.count;
    });
  });
  const timelineDays = Object.entries(aggregatedTimeline)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
  const recent30Downloads = timelineDays.reduce((s, t) => s + t.count, 0);

  const cardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '1rem' };
  const btnStyle: React.CSSProperties = { padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: '0.875rem' };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>控制面板</h1>
          <p style={{ color: '#666', marginTop: '0.25rem' }}>欢迎, {user.displayName || user.username}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => router.push('/skills')} style={{ ...btnStyle, background: '#111', color: '#fff', border: 'none' }}>
            浏览技能
          </button>
          <button onClick={logout} style={btnStyle}>退出登录</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{skills.length}</div>
          <div style={{ color: '#666', fontSize: '0.875rem' }}>我的技能</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{totalDownloads}</div>
          <div style={{ color: '#666', fontSize: '0.875rem' }}>总下载量</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{totalVersions}</div>
          <div style={{ color: '#666', fontSize: '0.875rem' }}>总版本数</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{apiKeys.length}</div>
          <div style={{ color: '#666', fontSize: '0.875rem' }}>API Keys</div>
        </div>
      </div>

      {/* 30-day Download Trend */}
      {timelineDays.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>30 天下载趋势</h3>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>
              近 30 天共 <strong>{recent30Downloads}</strong> 次下载
            </span>
          </div>
          <MiniChart data={timelineDays} height={100} />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #eee', marginBottom: '1.5rem' }}>
        {([
          { key: 'skills' as const, label: '我的技能' },
          { key: 'stats' as const, label: '技能统计' },
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

      {/* Skills Tab */}
      {tab === 'skills' && (
        <div>
          {skills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
              <p>你还没有发布任何技能</p>
              <a href="/skills" style={{ color: '#2563eb' }}>浏览技能市场</a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {skills.map((skill) => {
                const stats = skillStats[skill.name];
                return (
                  <a key={skill.id} href={`/skills/${skill.name}`} style={{ ...cardStyle, textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600 }}>{skill.displayName}</span>
                        <span style={{ color: '#999', marginLeft: '0.5rem', fontSize: '0.875rem' }}>{skill.name}</span>
                        {skill.visibility !== 'public' && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.125rem 0.375rem', background: skill.visibility === 'private' ? '#fee2e2' : '#e0e7ff', borderRadius: 4 }}>
                            {skill.visibility === 'private' ? '私有' : '团队'}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#666', alignItems: 'center' }}>
                        {stats && stats.timeline.length > 0 && (
                          <div style={{ width: 80, height: 24 }}>
                            <MiniSparkline data={stats.timeline} />
                          </div>
                        )}
                        <span>v{skill.versions?.[0]?.version || '—'}</span>
                        <span>⬇ {skill.downloadCount}</span>
                      </div>
                    </div>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#666' }}>
                      {skill.description.slice(0, 100)}{skill.description.length > 100 ? '...' : ''}
                    </p>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {tab === 'stats' && (
        <div>
          {skills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>暂无技能数据</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {skills.map((skill) => {
                const stats = skillStats[skill.name];
                return (
                  <div key={skill.id} style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div>
                        <a href={`/skills/${skill.name}`} style={{ fontWeight: 600, color: '#111', textDecoration: 'none' }}>
                          {skill.displayName}
                        </a>
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#999' }}>
                          总下载 {skill.downloadCount}
                        </span>
                      </div>
                      {stats && stats.byAgent.length > 0 && (
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#666' }}>
                          {stats.byAgent.map((a) => (
                            <span key={a.agentType}>
                              {a.agentType}: {a.count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {stats && stats.timeline.length > 0 ? (
                      <MiniChart data={stats.timeline} height={60} />
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: '#bbb', padding: '0.5rem 0' }}>暂无下载数据</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
                placeholder="Key 名称 (如 MacBook Pro)"
                onKeyDown={(e) => e.key === 'Enter' && createApiKey()}
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

/* ─── Mini Bar Chart (SVG) ─────────────────────────────── */

function MiniChart({ data, height = 80 }: { data: { date: string; count: number }[]; height?: number }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  const barW = Math.max(4, Math.min(16, Math.floor(600 / data.length) - 2));
  const w = data.length * (barW + 2);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {data.map((d, i) => {
        const h = (d.count / max) * (height - 4);
        return (
          <g key={d.date}>
            <rect
              x={i * (barW + 2)}
              y={height - h - 2}
              width={barW}
              height={Math.max(h, 1)}
              rx={2}
              fill="#2563eb"
              opacity={0.7}
            />
            <title>{d.date.slice(0, 10)}: {d.count} 下载</title>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Mini Sparkline (SVG) ─────────────────────────────── */

function MiniSparkline({ data }: { data: { date: string; count: number }[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 80, h = 24;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (d.count / max) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
