'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { authApiFetch } from '@/lib/api';

interface TeamSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  owner: { id: string; username: string; displayName?: string };
  _count: { members: number; skills: number };
}

export default function TeamsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const api = useMemo(() => token ? authApiFetch(token) : null, [token]);

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !api) { router.push('/auth/login'); return; }
    api<TeamSummary[]>('/teams')
      .then(setTeams)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, router, api]);

  // Auto-generate slug from name
  useEffect(() => {
    if (name) {
      const generated = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      setSlug(generated);
    }
  }, [name]);

  const handleCreate = useCallback(async () => {
    if (!api || !name || !slug) return;
    setError('');
    setCreating(true);
    try {
      const team = await api<TeamSummary>('/teams', { method: 'POST', body: JSON.stringify({ name, slug }) });
      router.push(`/teams/${team.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败');
    } finally {
      setCreating(false);
    }
  }, [api, name, slug, router]);

  if (authLoading || loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>加载中...</div>;
  }
  if (!user) return null;

  const cardStyle: React.CSSProperties = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>我的团队</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{ padding: '0.5rem 1rem', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem' }}
        >
          {showCreate ? '取消' : '创建团队'}
        </button>
      </div>

      {showCreate && (
        <div style={{ ...cardStyle, marginBottom: '1.5rem', maxWidth: 480 }}>
          {error && (
            <div style={{ padding: '0.5rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              {error}
            </div>
          )}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>团队名称</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="My Team" style={inputStyle} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>URL 标识</label>
            <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="my-team" style={inputStyle} />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !name || !slug}
            style={{ padding: '0.5rem 1.5rem', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem', opacity: creating || !name || !slug ? 0.5 : 1 }}
          >
            {creating ? '创建中...' : '创建'}
          </button>
        </div>
      )}

      {teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          你还没有加入任何团队
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {teams.map((team) => (
            <a key={team.id} href={`/teams/${team.slug}`} style={{ ...cardStyle, textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{team.name}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.875rem' }}>/{team.slug}</span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <span>👥 {team._count.members} 成员</span>
                  <span>📦 {team._count.skills} 技能</span>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                创建者: @{team.owner.username} · {new Date(team.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
