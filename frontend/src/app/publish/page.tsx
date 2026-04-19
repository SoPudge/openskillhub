'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { authApiFetch, apiFetch } from '@/lib/api';
import { API_BASE } from '@/lib/constants';
import { AGENT_TYPES, AGENT_LABELS } from '@openskillhub/shared';
import type { Category, AgentType } from '@openskillhub/shared';

type Step = 'skill' | 'version' | 'package' | 'done';

export default function PublishPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const api = useMemo(() => token ? authApiFetch(token) : null, [token]);

  const [step, setStep] = useState<Step>('skill');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Skill fields
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [homepageUrl, setHomepageUrl] = useState('');
  const [license, setLicense] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Step 2: Version fields
  const [version, setVersion] = useState('1.0.0');
  const [changelog, setChangelog] = useState('');

  // Step 3: Package fields
  const [agentType, setAgentType] = useState<AgentType>('claude-code');
  const [file, setFile] = useState<File | null>(null);

  // Created results
  const [createdSkillName, setCreatedSkillName] = useState('');
  const [createdVersion, setCreatedVersion] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/auth/login'); return; }
    apiFetch<Category[]>('/categories').then(setCategories).catch(() => {});
  }, [user, authLoading, router]);

  // Auto-generate name from displayName
  useEffect(() => {
    if (!createdSkillName && displayName) {
      const generated = displayName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      if (generated.length >= 2) setName(generated);
    }
  }, [displayName, createdSkillName]);

  const handleCreateSkill = useCallback(async () => {
    if (!api) return;
    setError('');
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { name, displayName, description };
      if (categoryId) body.categoryId = categoryId;
      if (visibility !== 'public') body.visibility = visibility;
      if (homepageUrl) body.homepageUrl = homepageUrl;
      if (license) body.license = license;
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      if (tags.length > 0) body.tags = tags;

      await api('/skills', { method: 'POST', body: JSON.stringify(body) });
      setCreatedSkillName(name);
      setStep('version');
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  }, [api, name, displayName, description, categoryId, visibility, homepageUrl, license, tagsInput]);

  const handleCreateVersion = useCallback(async () => {
    if (!api) return;
    setError('');
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { version };
      if (changelog) body.changelog = changelog;

      await api(`/skills/${createdSkillName}/versions`, { method: 'POST', body: JSON.stringify(body) });
      setCreatedVersion(version);
      setStep('package');
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建版本失败');
    } finally {
      setSubmitting(false);
    }
  }, [api, createdSkillName, version, changelog]);

  const handleUploadPackage = useCallback(async () => {
    if (!api || !file || !token) return;
    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('agent_type', agentType);
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/skills/${createdSkillName}/versions/${createdVersion}/packages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `上传失败 (${res.status})`);
      }
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setSubmitting(false);
    }
  }, [api, token, file, agentType, createdSkillName, createdVersion]);

  if (authLoading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>加载中...</div>;
  }
  if (!user) return null;

  const cardStyle: React.CSSProperties = { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.75rem', maxWidth: 640, margin: '0 auto', position: 'relative', overflow: 'hidden' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.625rem 0.875rem', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.9rem', boxSizing: 'border-box', background: 'var(--bg)', color: 'var(--text)', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-secondary)' };
  const fieldStyle: React.CSSProperties = { marginBottom: '1.125rem' };
  const primaryBtn: React.CSSProperties = { padding: '0.6rem 1.5rem', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, transition: 'box-shadow 0.15s, opacity 0.15s', boxShadow: '0 2px 8px rgba(102,126,234,0.25)' };
  const secondaryBtn: React.CSSProperties = { padding: '0.6rem 1.5rem', background: 'var(--bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', fontSize: '0.9rem', transition: 'border-color 0.15s' };
  const focusIn = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = '#667eea'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.1)'; };
  const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; };
  const hintStyle: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' };

  // Step indicator
  const steps: { key: Step; label: string; icon: string }[] = [
    { key: 'skill', label: '创建技能', icon: '📦' },
    { key: 'version', label: '创建版本', icon: '🏷️' },
    { key: 'package', label: '上传包', icon: '📤' },
    { key: 'done', label: '完成', icon: '✅' },
  ];
  const stepIndex = steps.findIndex(s => s.key === step);

  return (
    <div>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.06))', padding: '2rem 1.5rem 1.75rem', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)' }} />
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.5rem', fontWeight: 700 }}>发布技能</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>按步骤创建并发布你的 AI 技能包</p>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 1rem' }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {steps.map((s, i) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: i < stepIndex ? '0.9rem' : '1rem', fontWeight: 600,
                  background: i <= stepIndex ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'var(--bg-secondary)',
                  color: i <= stepIndex ? 'white' : 'var(--text-muted)',
                  border: i <= stepIndex ? 'none' : '1px solid var(--border)',
                  transition: 'all 0.2s',
                }}>
                  {i < stepIndex ? '✓' : s.icon}
                </div>
                <span style={{ fontSize: '0.75rem', color: i <= stepIndex ? 'var(--text)' : 'var(--text-muted)', fontWeight: i === stepIndex ? 600 : 400 }}>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 48, height: 2, background: i < stepIndex ? 'linear-gradient(90deg, #667eea, #764ba2)' : 'var(--border)', margin: '0 0.5rem', marginBottom: '1.25rem', borderRadius: 1, transition: 'background 0.2s' }} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ maxWidth: 640, margin: '0 auto 1.25rem', padding: '0.625rem 0.875rem', background: 'var(--danger-bg, #fef2f2)', border: '1px solid var(--danger)', borderRadius: 10, color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠</span> {error}
          </div>
        )}

        {/* Step 1: Create Skill */}
        {step === 'skill' && (
          <div style={cardStyle}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)' }} />
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '4px', height: '1.1rem', background: 'linear-gradient(180deg, #667eea, #764ba2)', borderRadius: '2px', display: 'inline-block' }} />
              创建技能
            </h2>

            <div style={fieldStyle}>
              <label style={labelStyle}>显示名称 *</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="My Awesome Skill" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>技能标识 *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="my-awesome-skill" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
              <div style={hintStyle}>小写字母、数字和连字符，以字母开头</div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>描述 *</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="简要描述技能的功能..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} onFocus={focusIn} onBlur={focusOut} />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>分类</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut}>
                <option value="">-- 无分类 --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>可见性</label>
                <select value={visibility} onChange={e => setVisibility(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut}>
                  <option value="public">公开</option>
                  <option value="team">团队</option>
                  <option value="private">私有</option>
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>许可证</label>
                <input value={license} onChange={e => setLicense(e.target.value)} placeholder="MIT" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>标签</label>
              <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="github, docker, devops (逗号分隔)" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>主页 URL</label>
              <input value={homepageUrl} onChange={e => setHomepageUrl(e.target.value)} placeholder="https://github.com/..." style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => router.push('/dashboard')} style={secondaryBtn}>取消</button>
              <button
                onClick={handleCreateSkill}
                disabled={submitting || !name || !displayName || !description}
                style={{ ...primaryBtn, opacity: submitting || !name || !displayName || !description ? 0.5 : 1, cursor: submitting || !name || !displayName || !description ? 'not-allowed' : 'pointer' }}
                onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.boxShadow = '0 4px 16px rgba(102,126,234,0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(102,126,234,0.25)'; }}
              >
                {submitting ? '创建中...' : '创建技能 →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Create Version */}
        {step === 'version' && (
          <div style={cardStyle}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)' }} />
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '4px', height: '1.1rem', background: 'linear-gradient(180deg, #667eea, #764ba2)', borderRadius: '2px', display: 'inline-block' }} />
              创建版本
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              技能 <strong style={{ color: 'var(--accent)' }}>{createdSkillName}</strong> 已创建，现在添加第一个版本。
            </p>

            <div style={fieldStyle}>
              <label style={labelStyle}>版本号 *</label>
              <input value={version} onChange={e => setVersion(e.target.value)} placeholder="1.0.0" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
              <div style={hintStyle}>语义化版本格式 (如 1.0.0)</div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>更新日志</label>
              <textarea value={changelog} onChange={e => setChangelog(e.target.value)} placeholder="- 初始版本发布&#10;- 支持 XX 功能" rows={4} style={{ ...inputStyle, resize: 'vertical' }} onFocus={focusIn} onBlur={focusOut} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.25rem' }}>
              <button onClick={() => router.push(`/skills/${createdSkillName}`)} style={secondaryBtn}>
                跳过，稍后添加
              </button>
              <button
                onClick={handleCreateVersion}
                disabled={submitting || !version}
                style={{ ...primaryBtn, opacity: submitting || !version ? 0.5 : 1, cursor: submitting || !version ? 'not-allowed' : 'pointer' }}
                onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.boxShadow = '0 4px 16px rgba(102,126,234,0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(102,126,234,0.25)'; }}
              >
                {submitting ? '创建中...' : '创建版本 →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Upload Package */}
        {step === 'package' && (
          <div style={cardStyle}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)' }} />
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '4px', height: '1.1rem', background: 'linear-gradient(180deg, #667eea, #764ba2)', borderRadius: '2px', display: 'inline-block' }} />
              上传包
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              版本 <strong style={{ color: 'var(--accent)' }}>{createdVersion}</strong> 已创建，现在上传 Agent 包 (.zip)。
            </p>

            <div style={fieldStyle}>
              <label style={labelStyle}>Agent 类型 *</label>
              <select value={agentType} onChange={e => setAgentType(e.target.value as AgentType)} style={inputStyle} onFocus={focusIn} onBlur={focusOut}>
                {AGENT_TYPES.map(t => <option key={t} value={t}>{AGENT_LABELS[t]}</option>)}
              </select>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>包文件 (.zip) *</label>
              <div style={{ padding: '1.25rem', border: '2px dashed var(--border)', borderRadius: 12, textAlign: 'center', background: 'var(--bg)', transition: 'border-color 0.15s' }}>
                <input
                  type="file"
                  accept=".zip"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  style={{ fontSize: '0.85rem' }}
                />
                {file && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: '0.5rem', fontWeight: 500 }}>
                    📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>
              <div style={hintStyle}>
                Zip 包应包含 SKILL.md 文件，最大 10 MB
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.25rem' }}>
              <button onClick={() => router.push(`/skills/${createdSkillName}`)} style={secondaryBtn}>
                跳过，稍后上传
              </button>
              <button
                onClick={handleUploadPackage}
                disabled={submitting || !file}
                style={{ ...primaryBtn, opacity: submitting || !file ? 0.5 : 1, cursor: submitting || !file ? 'not-allowed' : 'pointer' }}
                onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.boxShadow = '0 4px 16px rgba(102,126,234,0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(102,126,234,0.25)'; }}
              >
                {submitting ? '上传中...' : '上传包 ✓'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)' }} />
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, rgba(102,126,234,0.12), rgba(118,75,162,0.08))', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '2rem' }}>🎉</span>
            </div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>发布成功！</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
              技能 <strong style={{ color: 'var(--accent)' }}>{createdSkillName}</strong> v{createdVersion} 已发布
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => router.push(`/skills/${createdSkillName}`)}
                style={primaryBtn}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(102,126,234,0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(102,126,234,0.25)'; }}
              >
                查看技能
              </button>
              <button onClick={() => router.push('/dashboard')} style={secondaryBtn}>
                返回面板
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
