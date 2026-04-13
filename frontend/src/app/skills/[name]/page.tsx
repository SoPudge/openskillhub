import { apiFetch } from '@/lib/api';
import { notFound } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const AGENT_LABELS: Record<string, string> = {
  opencode: 'OpenCode',
  openclaw: 'OpenClaw',
  'claude-code': 'Claude Code',
  cursor: 'Cursor',
  goose: 'Goose',
  amp: 'Amp',
};

interface SkillDetail {
  id: string;
  name: string;
  displayName: string;
  description: string;
  author: { username: string; displayName?: string };
  category?: { name: string; slug: string };
  visibility: string;
  homepageUrl?: string;
  license?: string;
  downloadCount: number;
  tags?: { name: string; slug: string }[];
  versions: {
    id: string;
    version: string;
    changelog?: string;
    createdAt: string;
    packages: { agentType: string; fileSize: number; checksumSha256: string }[];
  }[];
  createdAt: string;
  updatedAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default async function SkillDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  let skill: SkillDetail;
  try {
    skill = await apiFetch<SkillDetail>(`/skills/${name}`);
  } catch {
    notFound();
  }

  const latestVersion = skill.versions[0];
  const allAgents = [
    ...new Set(skill.versions.flatMap((v) => v.packages.map((p) => p.agentType))),
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '2rem' }}>{skill.displayName}</h1>
          {latestVersion && (
            <span style={{ fontSize: '0.9rem', color: '#666', background: '#f0f0f0', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              v{latestVersion.version}
            </span>
          )}
        </div>
        <p style={{ color: '#666', marginTop: '0.25rem' }}>
          by <strong>@{skill.author.username}</strong>
          {skill.license && <> · {skill.license}</>}
          {skill.category && <> · {skill.category.name}</>}
        </p>
        <p style={{ marginTop: '0.75rem', fontSize: '1.05rem' }}>{skill.description}</p>
      </div>

      {/* ── Tags ── */}
      {skill.tags && skill.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {skill.tags.map((tag) => (
            <span
              key={tag.slug}
              style={{
                padding: '0.2rem 0.6rem',
                background: '#f0f0f0',
                borderRadius: '12px',
                fontSize: '0.8rem',
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* ── Supported Agents ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {Object.entries(AGENT_LABELS).map(([key, label]) => (
          <span
            key={key}
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.85rem',
              background: allAgents.includes(key) ? '#e6f4ea' : '#f5f5f5',
              color: allAgents.includes(key) ? '#137333' : '#bbb',
            }}
          >
            {label} {allAgents.includes(key) ? '✓' : '—'}
          </span>
        ))}
      </div>

      {/* ── Install Guide ── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>安装方式</h2>

        {/* Natural Language */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', color: '#333', marginBottom: '0.5rem' }}>
            💬 自然语言（推荐）
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
            在 Agent 对话中直接说：
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <code style={{ display: 'block', padding: '0.6rem 1rem', background: '#f8f9fa', borderRadius: '6px', borderLeft: '3px solid #0070f3', fontSize: '0.85rem' }}>
              帮我从 OpenSkillHub 安装 {skill.name} 技能
            </code>
            <code style={{ display: 'block', padding: '0.6rem 1rem', background: '#f8f9fa', borderRadius: '6px', borderLeft: '3px solid #0070f3', fontSize: '0.85rem' }}>
              Install the {skill.name} skill from OpenSkillHub
            </code>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.4rem' }}>
            Agent 会自动调用 osh.sh 搜索并安装到正确路径。需要先安装 OpenSkillHub local skill。
          </p>
        </div>

        {/* CLI */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', color: '#333', marginBottom: '0.5rem' }}>
            ⌨️ 命令行 (osh.sh)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <code style={{ display: 'block', padding: '0.6rem 1rem', background: '#1e1e1e', color: '#d4d4d4', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'monospace' }}>
              <span style={{ color: '#608b4e' }}># 安装最新版本</span>
              <br />osh.sh install {skill.name}
            </code>
            {latestVersion && (
              <code style={{ display: 'block', padding: '0.6rem 1rem', background: '#1e1e1e', color: '#d4d4d4', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                <span style={{ color: '#608b4e' }}># 安装指定版本</span>
                <br />osh.sh install {skill.name} --version {latestVersion.version}
              </code>
            )}
          </div>
        </div>

        {/* Direct Download */}
        {latestVersion && latestVersion.packages.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1rem', color: '#333', marginBottom: '0.5rem' }}>
              📦 直接下载
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {latestVersion.packages.map((pkg) => (
                <a
                  key={pkg.agentType}
                  href={`${API_BASE}/skills/${skill.name}/versions/${latestVersion.version}/packages/${pkg.agentType}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 1rem',
                    background: '#0070f3',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                  }}
                >
                  ↓ {AGENT_LABELS[pkg.agentType] || pkg.agentType}
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({formatBytes(pkg.fileSize)})</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Versions ── */}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>版本历史</h2>
      {skill.versions.length === 0 ? (
        <p style={{ color: '#999' }}>暂无版本发布。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {skill.versions.map((v, idx) => (
            <div
              key={v.id}
              style={{
                padding: '1rem',
                border: idx === 0 ? '2px solid #0070f3' : '1px solid #eee',
                borderRadius: '8px',
                background: idx === 0 ? '#f8fbff' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '1.05rem' }}>v{v.version}</strong>
                  {idx === 0 && (
                    <span style={{ fontSize: '0.7rem', background: '#0070f3', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                      LATEST
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.8rem', color: '#999' }}>
                  {new Date(v.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>

              {v.changelog && (
                <p style={{ fontSize: '0.9rem', color: '#555', marginTop: '0.5rem' }}>
                  {v.changelog}
                </p>
              )}

              {/* Agent packages for this version */}
              {v.packages.length > 0 && (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {v.packages.map((pkg) => (
                    <a
                      key={pkg.agentType}
                      href={`${API_BASE}/skills/${skill.name}/versions/${v.version}/packages/${pkg.agentType}`}
                      title={`SHA256: ${pkg.checksumSha256}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.3rem 0.7rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        textDecoration: 'none',
                        color: '#333',
                        background: '#fafafa',
                      }}
                    >
                      ↓ {AGENT_LABELS[pkg.agentType] || pkg.agentType}
                      <span style={{ color: '#999' }}>({formatBytes(pkg.fileSize)})</span>
                    </a>
                  ))}
                </div>
              )}
              {v.packages.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '0.5rem' }}>暂无包</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Footer Stats ── */}
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f8f8', borderRadius: '8px', fontSize: '0.85rem', color: '#666' }}>
        <strong>{skill.downloadCount.toLocaleString()}</strong> 总下载量 ·
        创建于 {new Date(skill.createdAt).toLocaleDateString('zh-CN')} ·
        更新于 {new Date(skill.updatedAt).toLocaleDateString('zh-CN')}
        {skill.homepageUrl && (
          <> · <a href={skill.homepageUrl} target="_blank" rel="noopener noreferrer">主页</a></>
        )}
      </div>
    </div>
  );
}
