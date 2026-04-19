export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const CATEGORY_ICONS: Record<string, string> = {
  'dev-workflow': '⚙️',
  'code-gen': '🔧',
  docs: '📄',
  devops: '🚀',
  'data-db': '🗄️',
  security: '🔒',
  communication: '💬',
  utilities: '🧰',
};
