'use client';

import { useAuth } from '@/lib/auth';
import { API_BASE } from '@/lib/constants';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface AdminSkill {
  id: string;
  name: string;
  displayName: string;
  description: string;
  visibility: string;
  featured: boolean;
  downloadCount: number;
  createdAt: string;
  author?: { username: string; displayName?: string };
  category?: { name: string; slug: string };
}

interface SkillListResult {
  data: AdminSkill[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminSkillsPage() {
  const { token } = useAuth();
  const [result, setResult] = useState<SkillListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const adminFetch = useCallback(async (path: string, opts?: RequestInit) => {
    return fetch(`${API_BASE}/admin${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts?.headers },
    });
  }, [token]);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('page', String(page));
    params.set('limit', '20');
    try {
      const res = await adminFetch(`/skills?${params.toString()}`);
      if (res.ok) setResult(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [adminFetch, query, page]);

  useEffect(() => {
    if (token) fetchSkills();
  }, [token, fetchSkills]);

  const toggleFeatured = async (name: string, featured: boolean) => {
    setActionLoading(name);
    try {
      const res = await adminFetch(`/skills/${name}`, { method: 'PATCH', body: JSON.stringify({ featured }) });
      if (res.ok) await fetchSkills();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const changeVisibility = async (name: string, visibility: string) => {
    setActionLoading(name);
    try {
      const res = await adminFetch(`/skills/${name}`, { method: 'PATCH', body: JSON.stringify({ visibility }) });
      if (res.ok) await fetchSkills();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const deleteSkill = async (name: string) => {
    if (!confirm(`确认删除技能 "${name}"？此操作不可撤销。`)) return;
    setActionLoading(name);
    try {
      const res = await adminFetch(`/skills/${name}`, { method: 'DELETE' });
      if (res.ok) await fetchSkills();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const visibilityLabel: Record<string, string> = { public: '公开', team: '团队', private: '私有' };
  const visibilityColor: Record<string, string> = { public: '#22c55e', team: '#3b82f6', private: '#dc2626' };

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>技能管理</h1>

      {/* Search */}
      <div style={{ marginBottom: '1.25rem' }}>
        <input
          type="text"
          placeholder="搜索技能名称..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          style={{ width: '100%', maxWidth: '400px', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>加载中...</div>
      ) : !result ? (
        <div style={{ color: '#dc2626' }}>加载失败</div>
      ) : (
        <>
          <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '0.75rem' }}>
            共 {result.total} 个技能
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {result.data.map((skill) => (
              <div
                key={skill.id}
                style={{
                  border: skill.featured ? '2px solid #f59e0b' : '1px solid #eee',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  background: skill.featured ? '#fffbeb' : '#fff',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link href={`/skills/${skill.name}`} style={{ fontWeight: 600, textDecoration: 'none', color: '#111' }}>
                      {skill.displayName}
                    </Link>
                    <span style={{ fontSize: '0.8rem', color: '#999' }}>{skill.name}</span>
                    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '3px', background: '#f0f0f0', color: visibilityColor[skill.visibility] }}>
                      {visibilityLabel[skill.visibility] || skill.visibility}
                    </span>
                    {skill.featured && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '3px', background: '#fef3c7', color: '#92400e' }}>⭐ 推荐</span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.25rem' }}>
                    {skill.author && <span>@{skill.author.username}</span>}
                    {skill.category && <span> · {skill.category.name}</span>}
                    <span> · ⬇ {skill.downloadCount}</span>
                    <span> · {new Date(skill.createdAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                  <button
                    onClick={() => toggleFeatured(skill.name, !skill.featured)}
                    disabled={actionLoading === skill.name}
                    style={{
                      padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid #ddd',
                      borderRadius: '4px', background: '#fff', cursor: 'pointer',
                      color: skill.featured ? '#92400e' : '#666',
                    }}
                  >
                    {skill.featured ? '取消推荐' : '⭐ 推荐'}
                  </button>
                  <select
                    value={skill.visibility}
                    onChange={(e) => changeVisibility(skill.name, e.target.value)}
                    disabled={actionLoading === skill.name}
                    style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="public">公开</option>
                    <option value="team">团队</option>
                    <option value="private">私有</option>
                  </select>
                  <button
                    onClick={() => deleteSkill(skill.name)}
                    disabled={actionLoading === skill.name}
                    style={{
                      padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid #fca5a5',
                      borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#dc2626',
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              {page > 1 && (
                <button onClick={() => setPage(page - 1)} style={{ padding: '0.4rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  ← 上一页
                </button>
              )}
              <span style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', color: '#666' }}>{page} / {result.totalPages}</span>
              {page < result.totalPages && (
                <button onClick={() => setPage(page + 1)} style={{ padding: '0.4rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  下一页 →
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
