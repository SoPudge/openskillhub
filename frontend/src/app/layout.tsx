import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenSkillHub',
  description: 'AI Agent Skills Registry - Search, share, and manage skills for your AI agents',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{ borderBottom: '1px solid #eee', padding: '1rem 2rem' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <a href="/" style={{ fontSize: '1.25rem', fontWeight: 'bold', textDecoration: 'none', color: '#111' }}>
              OpenSkillHub
            </a>
            <a href="/skills">Skills</a>
            <a href="/categories">分类</a>
          </nav>
        </header>
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
