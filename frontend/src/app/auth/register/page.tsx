'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', username: '', password: '', confirmPassword: '', displayName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }
    setLoading(true);
    try {
      await register(form.email, form.username, form.password, form.displayName || undefined);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.625rem 0.875rem', border: '1px solid var(--border)',
    borderRadius: 10, fontSize: '0.95rem', boxSizing: 'border-box',
    background: 'var(--bg)', color: 'var(--text)', outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-secondary)' };
  const focusIn = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = '#667eea'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.1)'; };
  const focusOut = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; };

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative orbs */}
      <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(102,126,234,0.12), rgba(118,75,162,0.08))', top: '-80px', left: '-60px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(240,147,251,0.1), rgba(102,126,234,0.06))', bottom: '-40px', right: '-40px', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #667eea, #764ba2)', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>✨</span>
          </div>
          <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.5rem', fontWeight: 700 }}>创建账号</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>加入 OpenSkillHub，分享你的 AI 技能</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: '1.75rem', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)' }} />

          {error && (
            <div style={{ padding: '0.625rem 0.875rem', background: 'var(--danger-bg, #fef2f2)', color: 'var(--danger)', borderRadius: 10, marginBottom: '1.25rem', fontSize: '0.85rem', border: '1px solid var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>邮箱</label>
              <input type="email" value={form.email} onChange={update('email')} required style={inputStyle} placeholder="you@example.com" onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>用户名</label>
              <input value={form.username} onChange={update('username')} required minLength={2} maxLength={64} style={inputStyle} placeholder="小写字母、数字、下划线" onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>显示名称 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(可选)</span></label>
              <input value={form.displayName} onChange={update('displayName')} maxLength={128} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>密码</label>
              <input type="password" value={form.password} onChange={update('password')} required minLength={8} style={inputStyle} placeholder="至少 8 位" onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>确认密码</label>
              <input type="password" value={form.confirmPassword} onChange={update('confirmPassword')} required style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '0.7rem', background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white', border: 'none', borderRadius: 10, fontSize: '0.95rem', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.15s, box-shadow 0.15s',
                boxShadow: '0 2px 8px rgba(102,126,234,0.25)',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = '0 4px 16px rgba(102,126,234,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(102,126,234,0.25)'; }}
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          已有账号？ <a href="/auth/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>登录</a>
        </p>
      </div>
    </div>
  );
}
