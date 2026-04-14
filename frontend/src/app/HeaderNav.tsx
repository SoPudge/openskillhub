'use client';

import { useAuth } from '@/lib/auth';

export function HeaderNav() {
  const { user, loading } = useAuth();

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
      <a href="/" style={{ fontSize: '1.25rem', fontWeight: 'bold', textDecoration: 'none', color: '#111' }}>
        OpenSkillHub
      </a>
      <a href="/skills">技能</a>
      <a href="/categories">分类</a>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {loading ? null : user ? (
          <>
            <a href="/dashboard" style={{ textDecoration: 'none', color: '#111', fontSize: '0.875rem' }}>
              {user.displayName || user.username}
            </a>
          </>
        ) : (
          <>
            <a href="/auth/login" style={{ fontSize: '0.875rem' }}>登录</a>
            <a href="/auth/register" style={{ padding: '0.375rem 0.75rem', background: '#111', color: '#fff', borderRadius: 6, textDecoration: 'none', fontSize: '0.875rem' }}>
              注册
            </a>
          </>
        )}
      </div>
    </nav>
  );
}
