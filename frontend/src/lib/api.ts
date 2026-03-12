import { createClient } from './supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createAudit: (data: {
    domain: string;
    targetKeywords?: string[];
    targetMarket?: string;
    targetLanguage?: string;
  }) => apiFetch('/audits', { method: 'POST', body: JSON.stringify(data) }),

  listAudits: () => apiFetch<{ audits: unknown[] }>('/audits'),

  getAudit: (id: string) =>
    apiFetch<{ audit: unknown; results: unknown[] }>(`/audits/${id}`),

  deleteAudit: (id: string) =>
    apiFetch(`/audits/${id}`, { method: 'DELETE' }),

  createCheckout: (plan: string) =>
    apiFetch<{ url: string }>('/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    }),

  openPortal: () =>
    apiFetch<{ url: string }>('/stripe/portal', { method: 'POST' }),
};
