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

  const cardStyle: React.CSSProperties = { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: '0.875rem', boxSizing: 'border-box' };

  return (
    <div>
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
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>我的团队</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>管理你的团队和协作</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: '0.6rem 1.25rem',
            background: showCreate ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #667eea, #764ba2)',
            color: showCreate ? 'var(--text)' : 'white',
            border: showCreate ? '1px solid var(--border)' : 'none',
            borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
          }}
        >
          {showCreate ? '取消' : '+ 创建团队'}
        </button>
      </div>

      {showCreate && (
        <div style={{ ...cardStyle, marginBottom: '1.5rem', maxWidth: 480 }}>
          {error && (
            <div style={{ padding: '0.5rem 0.75rem', background: 'var(--danger-bg, #fef2f2)', border: '1px solid var(--danger)', borderRadius: 8, color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
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
            style={{ padding: '0.6rem 1.5rem', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: creating || !name || !slug ? 0.5 : 1 }}
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
            <a key={team.id} href={`/teams/${team.slug}`} className="skill-card" style={{ ...cardStyle, textDecoration: 'none', color: 'inherit', display: 'block', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)', borderRadius: '12px 12px 0 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{team.name}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.875rem' }}>/{team.slug}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                  <span style={{ background: 'var(--accent-bg)', color: 'var(--accent)', padding: '0.15rem 0.55rem', borderRadius: '10px', fontWeight: 600 }}>👥 {team._count.members}</span>
                  <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.15rem 0.55rem', borderRadius: '10px', fontWeight: 600 }}>📦 {team._count.skills}</span>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                创建者: @{team.owner.username} · {new Date(team.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
