import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function get<T>(path: string): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const headers = { ...(await authHeaders()), "Content-Type": "application/json" };
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

async function del<T>(path: string): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}${path}`, { method: "DELETE", headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── API surface ───────────────────────────────────────────────────────────────

export type WikiPage = {
  id: string;
  title: string;
  source_url: string;
  source_domain: string;
  category: string;
  tags: string[];
  summary: string;
  key_insights: string[];
  detailed_notes: string;
  code_examples: { language: string; description: string; code: string }[];
  wiki_markdown: string;
  created_at: string;
};

export type ListResponse = {
  total: number;
  page: number;
  per_page: number;
  pages: WikiPage[];
};

export type Category = { category: string; count: number };
export type Tag = { tag: string; count: number };
export type GraphData = {
  nodes: { id: string; label: string; category: string; domain: string }[];
  edges: { source: string; target: string; weight: number; shared_tags: string[] }[];
};

export const api = {
  captureUrl: (url: string) => post<WikiPage>("/api/capture/url", { url }),

  listWikis: (params: {
    category?: string;
    tag?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set("category", params.category);
    if (params.tag) qs.set("tag", params.tag);
    if (params.search) qs.set("search", params.search);
    if (params.page) qs.set("page", String(params.page));
    if (params.per_page) qs.set("per_page", String(params.per_page));
    return get<ListResponse>(`/api/wikis?${qs}`);
  },

  getWiki: (id: string) => get<WikiPage>(`/api/wikis/${id}`),

  deleteWiki: (id: string) => del<{ deleted: boolean }>(`/api/wikis/${id}`),

  categories: () => get<Category[]>("/api/categories"),

  tags: () => get<Tag[]>("/api/tags"),

  graph: () => get<GraphData>("/api/graph"),
};
