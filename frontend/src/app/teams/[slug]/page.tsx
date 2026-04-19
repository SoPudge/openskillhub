import { apiFetch } from '@/lib/api';
import type { PaginatedResponse } from '@openskillhub/shared';
import type { TeamDetail, SkillWithMeta } from '@/lib/types';
import TeamMembers from './TeamMembers';

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let team: TeamDetail;
  try {
    team = await apiFetch<TeamDetail>(`/teams/${slug}`);
  } catch {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>团队不存在</div>;
  }

  let skills: SkillWithMeta[] = [];
  try {
    const ownerSkills = await apiFetch<PaginatedResponse<SkillWithMeta>>(`/skills?author=${team.owner.username}&limit=50`);
    skills = ownerSkills.data || [];
  } catch { /* ignore */ }

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.06))',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '2rem',
        border: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)' }} />
        <h1 style={{ margin: '0 0 0.35rem', fontSize: '2rem', fontWeight: 700 }}>{team.name}</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
          由 <a href={`/authors/${team.owner.username}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>@{team.owner.username}</a> 创建
        </p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <span style={{ background: 'var(--accent-bg)', color: 'var(--accent)', padding: '0.2rem 0.65rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 }}>📦 {team._count.skills} 个技能</span>
          <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.2rem 0.65rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 }}>👥 {team.members.length} 个成员</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Skills */}
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '4px', height: '1.25rem', background: 'linear-gradient(180deg, #667eea, #764ba2)', borderRadius: '2px', display: 'inline-block' }} />
            团队技能
          </h2>
          {skills.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>暂无公开技能</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {skills.map((skill) => (
                <a key={skill.id} href={`/skills/${skill.name}`} className="skill-card" style={{
                  display: 'block', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem',
                  textDecoration: 'none', color: 'inherit', background: 'var(--bg-secondary)',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)', borderRadius: '12px 12px 0 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{skill.displayName}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '0.15rem 0.5rem', borderRadius: '10px' }}>⬇ {skill.downloadCount}</span>
                  </div>
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {skill.description.slice(0, 120)}{skill.description.length > 120 ? '...' : ''}
                  </p>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Members */}
        <TeamMembers slug={slug} members={team.members} ownerId={team.owner.id} />
      </div>
    </div>
  );
}
