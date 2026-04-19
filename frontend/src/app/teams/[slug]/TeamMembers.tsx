'use client';

import { useAuth } from '@/lib/auth';
import { useState, useMemo, useCallback } from 'react';
import { authApiFetch } from '@/lib/api';

interface Member {
  role: string;
  joinedAt: string;
  user: { id: string; username: string; displayName?: string };
}

const roleLabel: Record<string, string> = { owner: '所有者', admin: '管理员', member: '成员' };
const roleBg: Record<string, string> = { owner: '#fef3c7', admin: '#e0e7ff', member: '#f3f4f6' };

export default function TeamMembers({ slug, members: initialMembers, ownerId }: { slug: string; members: Member[]; ownerId: string }) {
  const { user, token } = useAuth();
  const api = useMemo(() => token ? authApiFetch(token) : null, [token]);

  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [showAdd, setShowAdd] = useState(false);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  // Check if current user is owner or admin
  const currentMember = members.find(m => m.user.id === user?.id);
  const canManage = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  const handleAdd = useCallback(async () => {
    if (!api || !username.trim()) return;
    setError('');
    setAdding(true);
    try {
      await api(`/teams/${slug}/members`, { method: 'POST', body: JSON.stringify({ username: username.trim(), role }) });
      // Reload page to get fresh data
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '添加失败');
    } finally {
      setAdding(false);
    }
  }, [api, slug, username, role]);

  const handleRemove = useCallback(async (memberUsername: string) => {
    if (!api || !confirm(`确定移除 @${memberUsername}？`)) return;
    try {
      await api(`/teams/${slug}/members/${memberUsername}`, { method: 'DELETE' });
      setMembers(prev => prev.filter(m => m.user.username !== memberUsername));
    } catch (e) {
      alert(e instanceof Error ? e.message : '移除失败');
    }
  }, [api, slug]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>成员</h2>
        {canManage && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            style={{ padding: '0.25rem 0.75rem', background: showAdd ? '#fff' : '#111', color: showAdd ? '#111' : '#fff', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}
          >
            {showAdd ? '取消' : '添加成员'}
          </button>
        )}
      </div>

      {showAdd && (
        <div style={{ padding: '0.75rem', border: '1px solid #eee', borderRadius: 6, marginBottom: '0.75rem' }}>
          {error && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{error}</div>}
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="用户名"
            style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: 4, fontSize: '0.85rem', marginBottom: '0.5rem', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select value={role} onChange={e => setRole(e.target.value)} style={{ flex: 1, padding: '0.4rem', border: '1px solid #ddd', borderRadius: 4, fontSize: '0.85rem' }}>
              <option value="member">成员</option>
              <option value="admin">管理员</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={adding || !username.trim()}
              style={{ padding: '0.4rem 1rem', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem', opacity: adding || !username.trim() ? 0.5 : 1 }}
            >
              {adding ? '...' : '添加'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {members.map((m) => (
          <div key={m.user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', border: '1px solid #eee', borderRadius: 6 }}>
            <a href={`/authors/${m.user.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <span style={{ fontWeight: 500 }}>{m.user.displayName || m.user.username}</span>
              <span style={{ color: '#999', fontSize: '0.8rem', marginLeft: '0.25rem' }}>@{m.user.username}</span>
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem', background: roleBg[m.role] || '#f3f4f6', borderRadius: 4 }}>
                {roleLabel[m.role] || m.role}
              </span>
              {canManage && m.role !== 'owner' && m.user.id !== user?.id && (
                <button
                  onClick={() => handleRemove(m.user.username)}
                  style={{ padding: '0.125rem 0.5rem', background: '#fff', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 4, cursor: 'pointer', fontSize: '0.7rem' }}
                >
                  移除
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
