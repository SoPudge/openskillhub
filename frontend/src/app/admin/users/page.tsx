'use client';

import { useAuth } from '@/lib/auth';
import { API_BASE } from '@/lib/constants';
import { useCallback, useEffect, useState } from 'react';

interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  role: string;
  banned: boolean;
  createdAt: string;
  _count: { skills: number; apiKeys: number };
}

interface UserListResult {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [result, setResult] = useState<UserListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const adminFetch = useCallback(async (path: string, opts?: RequestInit) => {
    return fetch(`${API_BASE}/admin${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts?.headers },
    });
  }, [token]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (roleFilter) params.set('role', roleFilter);
    if (bannedFilter) params.set('banned', bannedFilter);
    params.set('page', String(page));
    params.set('limit', '20');

    try {
      const res = await adminFetch(`/users?${params.toString()}`);
      if (res.ok) setResult(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [adminFetch, query, roleFilter, bannedFilter, page]);

  useEffect(() => {
    if (token) fetchUsers();
  }, [token, fetchUsers]);

  const updateUser = async (id: string, data: Record<string, unknown>) => {
    setActionLoading(id);
    try {
      const res = await adminFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      if (res.ok) await fetchUsers();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const deleteUser = async (id: string, username: string) => {
    if (!confirm(`确认删除用户 @${username}？此操作不可撤销。`)) return;
    setActionLoading(id);
    try {
      const res = await adminFetch(`/users/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchUsers();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>用户管理</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="搜索用户名/邮箱..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: '200px', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem' }}
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem' }}
        >
          <option value="">所有角色</option>
          <option value="admin">管理员</option>
          <option value="user">普通用户</option>
        </select>
        <select
          value={bannedFilter}
          onChange={(e) => { setBannedFilter(e.target.value); setPage(1); }}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem' }}
        >
          <option value="">全部状态</option>
          <option value="false">正常</option>
          <option value="true">已封禁</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>加载中...</div>
      ) : !result ? (
        <div style={{ color: '#dc2626' }}>加载失败</div>
      ) : (
        <>
          <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '0.75rem' }}>
            共 {result.total} 个用户
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>用户</th>
                  <th style={{ padding: '0.5rem' }}>邮箱</th>
                  <th style={{ padding: '0.5rem' }}>角色</th>
                  <th style={{ padding: '0.5rem' }}>状态</th>
                  <th style={{ padding: '0.5rem' }}>技能</th>
                  <th style={{ padding: '0.5rem' }}>注册时间</th>
                  <th style={{ padding: '0.5rem' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '0.5rem' }}>
                      <div style={{ fontWeight: 500 }}>{user.displayName || user.username}</div>
                      <div style={{ fontSize: '0.8rem', color: '#999' }}>@{user.username}</div>
                    </td>
                    <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>{user.email}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem',
                        background: user.role === 'admin' ? '#fef3c7' : '#f3f4f6',
                        color: user.role === 'admin' ? '#92400e' : '#666',
                      }}>
                        {user.role === 'admin' ? '管理员' : '用户'}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {user.banned ? (
                        <span style={{ color: '#dc2626', fontSize: '0.85rem' }}>🚫 封禁</span>
                      ) : (
                        <span style={{ color: '#22c55e', fontSize: '0.85rem' }}>✓ 正常</span>
                      )}
                    </td>
                    <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>{user._count.skills}</td>
                    <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => updateUser(user.id, { role: user.role === 'admin' ? 'user' : 'admin' })}
                          disabled={actionLoading === user.id}
                          style={{
                            padding: '0.2rem 0.5rem', fontSize: '0.75rem', border: '1px solid #ddd',
                            borderRadius: '4px', background: '#fff', cursor: 'pointer',
                          }}
                        >
                          {user.role === 'admin' ? '降为用户' : '设为管理员'}
                        </button>
                        <button
                          onClick={() => updateUser(user.id, { banned: !user.banned })}
                          disabled={actionLoading === user.id}
                          style={{
                            padding: '0.2rem 0.5rem', fontSize: '0.75rem', border: '1px solid #ddd',
                            borderRadius: '4px', background: '#fff', cursor: 'pointer',
                            color: user.banned ? '#22c55e' : '#dc2626',
                          }}
                        >
                          {user.banned ? '解封' : '封禁'}
                        </button>
                        <button
                          onClick={() => deleteUser(user.id, user.username)}
                          disabled={actionLoading === user.id}
                          style={{
                            padding: '0.2rem 0.5rem', fontSize: '0.75rem', border: '1px solid #fca5a5',
                            borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#dc2626',
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              {page > 1 && (
                <button onClick={() => setPage(page - 1)} style={{ padding: '0.4rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  ← 上一页
                </button>
              )}
              <span style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', color: '#666' }}>
                {page} / {result.totalPages}
              </span>
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
