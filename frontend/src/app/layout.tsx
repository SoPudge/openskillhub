import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { HeaderNav } from './HeaderNav';

export const metadata: Metadata = {
  title: 'OpenSkillHub',
  description: 'AI Agent Skills Registry - Search, share, and manage skills for your AI agents',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <header style={{ borderBottom: '1px solid #eee', padding: '1rem 2rem' }}>
            <HeaderNav />
          </header>
          <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
