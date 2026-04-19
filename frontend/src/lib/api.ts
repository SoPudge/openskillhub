import { API_BASE } from './constants';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const fetchOptions: Record<string, unknown> = {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    };
    // Pass through Next.js fetch extensions (next.revalidate etc)
    if (options && 'next' in options) {
      fetchOptions.next = (options as Record<string, unknown>).next;
    }

    const res = await fetch(`${API_BASE}${path}`, fetchOptions as RequestInit);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || `API error ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

/** Create an apiFetch with Authorization header pre-set */
export function authApiFetch(token: string) {
  return <T>(path: string, options?: RequestInit): Promise<T> =>
    apiFetch<T>(path, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...options?.headers },
    });
}
