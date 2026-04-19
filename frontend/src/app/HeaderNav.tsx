'use client';

import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function HeaderNav() {
  const { user, loading } = useAuth();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();

  const navLinks = [
    { href: '/skills', label: '技能' },
    { href: '/categories', label: '分类' },
    { href: '/teams', label: '团队' },
    { href: '/clawhub', label: 'ClawHub', accent: true },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <nav style={{ display: 'flex', alignItems: 'center', height: 56 }}>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginRight: '2rem' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          fontSize: '0.85rem', lineHeight: 1,
        }}>⚡</span>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Open<span style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SkillHub</span>
        </span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              padding: '0.375rem 0.75rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500,
              textDecoration: 'none', transition: 'background 0.15s, color 0.15s',
              color: link.accent ? '#8b5cf6' : isActive(link.href) ? 'var(--text)' : 'var(--text-secondary)',
              background: isActive(link.href) ? 'var(--bg-tertiary, var(--bg-secondary))' : 'transparent',
            }}
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/publish"
          style={{
            padding: '0.3rem 0.65rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
            textDecoration: 'none', color: 'white', marginLeft: '0.25rem',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            transition: 'box-shadow 0.15s',
            boxShadow: '0 1px 4px rgba(102,126,234,0.2)',
          }}
        >
          + 发布
        </Link>
      </div>

      {/* Right section */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={toggle}
          style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 8, cursor: 'pointer', width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.9rem', transition: 'border-color 0.15s',
          }}
          title={theme === 'dark' ? '切换浅色模式' : '切换暗色模式'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {loading ? null : user ? (
          <>
            {user.role === 'admin' && (
              <Link href="/admin" style={{ padding: '0.3rem 0.6rem', borderRadius: 8, textDecoration: 'none', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600, background: 'var(--danger-bg, #fef2f2)', border: '1px solid var(--danger)' }}>
                管理
              </Link>
            )}
            <Link href="/dashboard" style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.3rem 0.65rem 0.3rem 0.35rem', borderRadius: 8,
              textDecoration: 'none', color: 'var(--text)', fontSize: '0.85rem', fontWeight: 500,
              background: isActive('/dashboard') ? 'var(--bg-tertiary, var(--bg-secondary))' : 'transparent',
              border: '1px solid var(--border)', transition: 'border-color 0.15s',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: 6,
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white', fontSize: '0.65rem', fontWeight: 700,
              }}>
                {(user.displayName || user.username).charAt(0).toUpperCase()}
              </span>
              {user.displayName || user.username}
            </Link>
            <Link href="/settings" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 8,
              textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.9rem',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              transition: 'border-color 0.15s',
            }}>
              ⚙
            </Link>
          </>
        ) : (
          <>
            <Link href="/auth/login" style={{ padding: '0.375rem 0.75rem', borderRadius: 8, fontSize: '0.85rem', textDecoration: 'none', color: 'var(--text-secondary)', fontWeight: 500, transition: 'color 0.15s' }}>
              登录
            </Link>
            <Link href="/auth/register" style={{
              padding: '0.375rem 0.875rem', borderRadius: 8, textDecoration: 'none',
              fontSize: '0.85rem', fontWeight: 600, color: 'white',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              boxShadow: '0 1px 4px rgba(102,126,234,0.2)',
              transition: 'box-shadow 0.15s',
            }}>
              注册
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
