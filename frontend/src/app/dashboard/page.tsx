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
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>加载中...</div>;
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

  const cardStyle: React.CSSProperties = { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' };
  const btnStyle: React.CSSProperties = { padding: '0.5rem 1rem', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--bg)', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text)' };

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.06))',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '1.5rem',
        border: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)' }} />
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>控制面板</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>欢迎, {user.displayName || user.username}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => router.push('/publish')} style={{
            ...btnStyle, background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', fontWeight: 500,
          }}>
            + 发布新技能
          </button>
          <button onClick={logout} style={btnStyle}>退出登录</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { icon: '📦', value: skills.length, label: '我的技能' },
          { icon: '↓', value: totalDownloads, label: '总下载量' },
          { icon: '🏷️', value: totalVersions, label: '总版本数' },
          { icon: '🔑', value: apiKeys.length, label: 'API Keys' },
        ].map((stat) => (
          <div key={stat.label} style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>{stat.icon}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)' }}>{stat.value}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 30-day Download Trend */}
      {timelineDays.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '4px', height: '1.1rem', background: 'linear-gradient(180deg, #667eea, #764ba2)', borderRadius: '2px', display: 'inline-block' }} />
              30 天下载趋势
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              近 30 天共 <strong style={{ color: 'var(--accent)' }}>{recent30Downloads}</strong> 次下载
            </span>
          </div>
          <MiniChart data={timelineDays} height={100} />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '10px', padding: '0.25rem', border: '1px solid var(--border)' }}>
        {([
          { key: 'skills' as const, label: '我的技能' },
          { key: 'stats' as const, label: '技能统计' },
          { key: 'apikeys' as const, label: 'API Keys' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.5rem 1.25rem', border: 'none', borderRadius: '8px',
              background: tab === t.key ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent',
              color: tab === t.key ? 'white' : 'var(--text-muted)',
              fontWeight: tab === t.key ? 600 : 400, cursor: 'pointer', fontSize: '0.9rem',
              transition: 'all 0.15s',
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
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <p>你还没有发布任何技能</p>
              <a href="/skills" style={{ color: 'var(--accent)' }}>浏览技能市场</a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {skills.map((skill) => {
                const stats = skillStats[skill.name];
                return (
                  <a key={skill.id} href={`/skills/${skill.name}`} className="skill-card" style={{ ...cardStyle, textDecoration: 'none', color: 'inherit', display: 'block', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)', borderRadius: '12px 12px 0 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600 }}>{skill.displayName}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.875rem' }}>{skill.name}</span>
                        {skill.visibility !== 'public' && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.125rem 0.375rem', background: skill.visibility === 'private' ? 'var(--danger-bg, #fee2e2)' : 'var(--accent-bg)', color: skill.visibility === 'private' ? 'var(--danger)' : 'var(--accent)', borderRadius: 6, fontWeight: 500 }}>
                            {skill.visibility === 'private' ? '私有' : '团队'}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', alignItems: 'center' }}>
                        {stats && stats.timeline.length > 0 && (
                          <div style={{ width: 80, height: 24 }}>
                            <MiniSparkline data={stats.timeline} />
                          </div>
                        )}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>v{skill.versions?.[0]?.version || '—'}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '0.1rem 0.45rem', borderRadius: '10px' }}>⬇ {skill.downloadCount}</span>
                      </div>
                    </div>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
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
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>暂无技能数据</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {skills.map((skill) => {
                const stats = skillStats[skill.name];
                return (
                  <div key={skill.id} style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div>
                        <a href={`/skills/${skill.name}`} style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>
                          {skill.displayName}
                        </a>
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          总下载 {skill.downloadCount}
                        </span>
                      </div>
                      {stats && stats.byAgent.length > 0 && (
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
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
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>暂无下载数据</div>
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
                style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: '0.875rem' }}
              />
              <button
                onClick={createApiKey}
                style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap' }}
              >
                创建
              </button>
            </div>
            {newKeyResult && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 6, fontSize: '0.875rem' }}>
                <strong>请保存此 Key（仅显示一次）：</strong>
                <code style={{ display: 'block', marginTop: '0.25rem', padding: '0.5rem', background: 'var(--bg)', borderRadius: 4, wordBreak: 'break-all' }}>
                  {newKeyResult}
                </code>
              </div>
            )}
          </div>

          {apiKeys.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>暂无 API Key</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {apiKeys.map((key) => (
                <div key={key.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{key.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      <code>{key.keyPrefix}...</code> · 创建于 {new Date(key.createdAt).toLocaleDateString('zh-CN')}
                      {key.lastUsedAt && ` · 最近使用 ${new Date(key.lastUsedAt).toLocaleDateString('zh-CN')}`}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteApiKey(key.id)}
                    style={{ padding: '0.25rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem' }}
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
              fill="var(--accent)"
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
      <polyline points={points} fill="none" stroke="#667eea" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
