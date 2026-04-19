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
    return <div style={{ textAlign: 'center', padding: '4rem', color: '#999' }}>团队不存在</div>;
  }

  let skills: SkillWithMeta[] = [];
  try {
    const ownerSkills = await apiFetch<PaginatedResponse<SkillWithMeta>>(`/skills?author=${team.owner.username}&limit=50`);
    skills = ownerSkills.data || [];
  } catch { /* ignore */ }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.25rem' }}>{team.name}</h1>
        <p style={{ color: '#666', margin: 0 }}>
          由 <a href={`/authors/${team.owner.username}`} style={{ color: '#2563eb' }}>@{team.owner.username}</a> 创建 · {team._count.skills} 个技能 · {team.members.length} 个成员
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Skills */}
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>团队技能</h2>
          {skills.length === 0 ? (
            <p style={{ color: '#999' }}>暂无公开技能</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {skills.map((skill) => (
                <a key={skill.id} href={`/skills/${skill.name}`} style={{ display: 'block', border: '1px solid #eee', borderRadius: 8, padding: '1rem', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>{skill.displayName}</span>
                    <span style={{ color: '#999', fontSize: '0.875rem' }}>⬇ {skill.downloadCount}</span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#666' }}>
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
