import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Development Workflow', slug: 'dev-workflow', description: 'Git, CI/CD, code review, testing workflows', sortOrder: 1 },
  { name: 'Code Generation', slug: 'code-gen', description: 'Scaffolding, boilerplate, templates', sortOrder: 2 },
  { name: 'Documentation', slug: 'docs', description: 'API docs, READMEs, changelogs, comments', sortOrder: 3 },
  { name: 'DevOps', slug: 'devops', description: 'Docker, Kubernetes, infrastructure, deployment', sortOrder: 4 },
  { name: 'Data & Database', slug: 'data-db', description: 'SQL, migrations, data processing', sortOrder: 5 },
  { name: 'Security', slug: 'security', description: 'Vulnerability scanning, secrets management', sortOrder: 6 },
  { name: 'Communication', slug: 'communication', description: 'Slack, email, notifications, reporting', sortOrder: 7 },
  { name: 'Utilities', slug: 'utilities', description: 'File management, formatting, misc tools', sortOrder: 8 },
];

async function main() {
  console.log('Seeding categories...');
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }
  console.log(`Seeded ${categories.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
