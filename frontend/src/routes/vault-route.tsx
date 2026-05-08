import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, type Vault, type WikiPage } from "../api";
import WikiCard from "../components/WikiCard";

const ENTITY_TYPES = ["concept", "tool", "person", "decision"] as const;

export default function VaultRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vault, setVault] = useState<Vault | null>(null);
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.getVault(id),
      api.listVaultPages(id, { per_page: 18 }),
    ])
      .then(([v, list]) => {
        setVault(v);
        setPages(list.pages);
        setTotal(list.total);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || loading) return;
    setCurrentPage(1);
    api
      .listVaultPages(id, {
        entity_type: entityFilter ?? undefined,
        tag: tagFilter || undefined,
        per_page: 18,
      })
      .then((list) => {
        setPages(list.pages);
        setTotal(list.total);
      });
  }, [entityFilter, tagFilter]);

  async function loadMore() {
    if (!id) return;
    const next = currentPage + 1;
    const list = await api.listVaultPages(id, {
      entity_type: entityFilter ?? undefined,
      tag: tagFilter || undefined,
      page: next,
      per_page: 18,
    });
    setPages((p) => [...p, ...list.pages]);
    setCurrentPage(next);
  }

  async function handleDelete() {
    if (!id || !vault) return;
    if (!confirm(`Delete vault "${vault.name}" and all its pages? This cannot be undone.`)) return;
    setDeleting(true);
    await api.deleteVault(id);
    navigate("/");
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 pt-4 animate-pulse">
        <div className="h-6 bg-wiki-surface rounded w-1/3" />
        <div className="h-4 bg-wiki-surface rounded w-1/2" />
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="text-center py-24 text-wiki-muted">
        <p className="text-lg font-medium text-wiki-text mb-2">Vault not found</p>
        <Link to="/" className="text-wiki-accent text-sm hover:underline">← Back to home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/" className="text-sm text-wiki-muted hover:text-wiki-accent transition-colors">
          ← Vaults
        </Link>
        <div className="flex items-start justify-between mt-3">
          <div>
            <h1 className="text-2xl font-bold text-wiki-text">{vault.name}</h1>
            {vault.description && (
              <p className="text-wiki-muted mt-1 text-sm">{vault.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <Link
              to={`/vault/${vault.id}/graph`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-wiki-muted hover:text-wiki-accent border border-wiki-border rounded-lg transition-colors"
            >
              ⬡ Graph
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-500 hover:text-red-400 transition-colors disabled:opacity-40"
            >
              {deleting ? "Deleting..." : "Delete vault"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-3 text-sm text-wiki-muted">
          <span>{vault.page_count} pages</span>
          <span>·</span>
          <span>{vault.capture_count} captures</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setEntityFilter(null)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            !entityFilter
              ? "bg-wiki-accent/20 text-wiki-accent"
              : "bg-wiki-surface border border-wiki-border text-wiki-muted hover:text-wiki-text"
          }`}
        >
          All
        </button>
        {ENTITY_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setEntityFilter(entityFilter === t ? null : t)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
              entityFilter === t
                ? "bg-wiki-accent/20 text-wiki-accent"
                : "bg-wiki-surface border border-wiki-border text-wiki-muted hover:text-wiki-text"
            }`}
          >
            {t}
          </button>
        ))}
        <input
          type="text"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          placeholder="Filter by tag..."
          className="ml-auto w-36 bg-wiki-surface border border-wiki-border rounded-lg px-3 py-1 text-xs text-wiki-text outline-none focus:border-wiki-accent transition-colors placeholder:text-wiki-muted"
        />
      </div>

      {/* Pages */}
      {pages.length === 0 ? (
        <div className="text-center py-20 text-wiki-muted">
          <div className="text-3xl mb-3">📭</div>
          <p className="text-base font-medium text-wiki-text mb-1">No pages yet</p>
          <p className="text-sm">Paste a URL above or use the Chrome extension to capture your first article into this vault.</p>
        </div>
      ) : (
        <>
          <div className="text-xs text-wiki-muted mb-4">{total} pages</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pages.map((p) => (
              <WikiCard key={p.id} page={p} />
            ))}
          </div>
          {pages.length < total && (
            <div className="text-center mt-8">
              <button
                onClick={loadMore}
                className="px-6 py-2 bg-wiki-surface border border-wiki-border hover:border-wiki-accent text-wiki-text text-sm rounded-lg transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
