import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import { HeaderNav } from './HeaderNav';

export const metadata: Metadata = {
  title: 'OpenSkillHub',
  description: 'AI Agent Skills Registry - Search, share, and manage skills for your AI agents',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <header style={{ borderBottom: '1px solid var(--border)', padding: '0 2rem', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'color-mix(in srgb, var(--bg) 85%, transparent)' }}>
              <HeaderNav />
            </header>
            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
              {children}
            </main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
