import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
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

async function patch<T>(path: string, body: unknown): Promise<T> {
  const headers = { ...(await authHeaders()), "Content-Type": "application/json" };
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
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

// ── Types ─────────────────────────────────────────────────────────────────────

export type Vault = {
  id: string;
  name: string;
  description: string;
  vault_prompt?: string;
  page_count: number;
  capture_count: number;
  created_at: string;
  updated_at: string;
};

export type Capture = {
  id: string;
  vault_id: string;
  source_url: string;
  source_domain: string;
  source_type: string;
  title: string;
  raw_content?: string;
  why_saved?: string;
  captured_at: string;
};

export type WikiPage = {
  id: string;
  vault_id: string;
  entity_type: "concept" | "tool" | "person" | "decision";
  title: string;
  summary: string;
  key_insights: string[];
  detailed_notes: string;
  code_examples: { language: string; description: string; code: string }[];
  tags: string[];
  confidence: "high" | "medium" | "low";
  source_count: number;
  created_at: string;
  updated_at: string;
  citations?: Citation[];
  // Legacy V1 fields
  source_url?: string;
  source_domain?: string;
  category?: string;
};

export type Citation = {
  id: string;
  wiki_page_id: string;
  capture_id: string;
  claim_text: string;
  excerpt: string;
};

export type GraphNode = {
  id: string;
  label: string;
  entity_type: string;
  tags: string[];
  confidence: string;
  source_count: number;
};

export type GraphEdge = {
  source: string;
  target: string;
  type: string;
  evidence: string;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type VaultSuggestion = {
  vault_id: string | null;
  vault_name: string;
  confidence: number;
  reason: string;
};

export type CaptureResult = {
  capture: Capture;
  wiki_page: WikiPage;
  suggested_relationships: { related_title: string; type: string; evidence: string }[];
};

export type ListResponse = {
  total: number;
  page: number;
  per_page: number;
  pages: WikiPage[];
};

// Legacy
export type Category = { category: string; count: number; vault_id?: string };
export type Tag = { tag: string; count: number };

// ── API ───────────────────────────────────────────────────────────────────────

export const api = {
  // ── Vaults ──────────────────────────────────────────────────────────────────
  listVaults: () => get<Vault[]>("/api/vaults"),
  getVault: (id: string) => get<Vault>(`/api/vaults/${id}`),
  createVault: (name: string, description = "") =>
    post<Vault>("/api/vaults", { name, description }),
  updateVault: (id: string, updates: Partial<Pick<Vault, "name" | "description" | "vault_prompt">>) =>
    patch<Vault>(`/api/vaults/${id}`, updates),
  deleteVault: (id: string) => del<{ deleted: boolean }>(`/api/vaults/${id}`),

  // ── Capture flow ─────────────────────────────────────────────────────────────
  suggestVault: (url: string) =>
    post<{
      scraped: { url: string; title: string; domain: string; content_preview: string };
      suggestions: VaultSuggestion[];
      new_vault_suggestion: { name: string; description: string };
    }>("/api/capture/suggest", { url }),
  captureUrl: (url: string, vault_id: string) =>
    post<CaptureResult>("/api/capture/url", { url, vault_id }),
  captureHtml: (url: string, html: string, vault_id: string) =>
    post<CaptureResult>("/api/capture/html", { url, html, vault_id }),

  // ── Captures ─────────────────────────────────────────────────────────────────
  listCaptures: (vault_id: string, page = 1, per_page = 20) =>
    get<{ total: number; page: number; per_page: number; captures: Capture[] }>(
      `/api/vaults/${vault_id}/captures?page=${page}&per_page=${per_page}`
    ),
  getCapture: (id: string) => get<Capture>(`/api/captures/${id}`),
  deleteCapture: (id: string) => del<{ deleted: boolean }>(`/api/captures/${id}`),

  // ── Wiki pages ───────────────────────────────────────────────────────────────
  listVaultPages: (
    vault_id: string,
    opts: { tag?: string; search?: string; entity_type?: string; page?: number; per_page?: number } = {}
  ) => {
    const p = new URLSearchParams();
    if (opts.tag) p.set("tag", opts.tag);
    if (opts.search) p.set("search", opts.search);
    if (opts.entity_type) p.set("entity_type", opts.entity_type);
    if (opts.page) p.set("page", String(opts.page));
    if (opts.per_page) p.set("per_page", String(opts.per_page));
    return get<ListResponse>(`/api/vaults/${vault_id}/pages?${p}`);
  },
  getWiki: (id: string) => get<WikiPage>(`/api/wikis/${id}`),
  updateWiki: (id: string, updates: Partial<WikiPage>) =>
    patch<WikiPage>(`/api/wikis/${id}`, updates),
  deleteWiki: (id: string) => del<{ deleted: boolean }>(`/api/wikis/${id}`),

  // ── Graph ────────────────────────────────────────────────────────────────────
  vaultGraph: (vault_id: string) => get<GraphData>(`/api/vaults/${vault_id}/graph`),

  // ── Search ───────────────────────────────────────────────────────────────────
  search: (q: string, vault_id?: string, tag?: string) => {
    const p = new URLSearchParams({ q });
    if (vault_id) p.set("vault_id", vault_id);
    if (tag) p.set("tag", tag);
    return get<{ results: WikiPage[]; total: number }>(`/api/search?${p}`);
  },

  // ── Legacy V1 compatibility ──────────────────────────────────────────────────
  listWikis: (params: {
    category?: string; tag?: string; search?: string; page?: number; per_page?: number;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set("category", params.category);
    if (params.tag) qs.set("tag", params.tag);
    if (params.search) qs.set("search", params.search);
    if (params.page) qs.set("page", String(params.page));
    if (params.per_page) qs.set("per_page", String(params.per_page));
    return get<ListResponse>(`/api/wikis?${qs}`);
  },
  categories: () => get<Category[]>("/api/categories"),
  tags: () => get<Tag[]>("/api/tags"),
  graph: () => get<GraphData>("/api/graph"),
};
