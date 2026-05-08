import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type Vault } from "../api";

export default function VaultsRoute() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.listVaults().then(setVaults).finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const vault = await api.createVault(newName.trim(), newDesc.trim());
      setVaults((v) => [vault, ...v]);
      setNewName("");
      setNewDesc("");
      setShowForm(false);
      navigate(`/vault/${vault.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-wiki-text">Your Vaults</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-wiki-accent hover:bg-wiki-accent-hover text-white text-sm font-medium rounded-xl transition-colors"
        >
          + New Vault
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-wiki-surface border border-wiki-border rounded-xl p-5 mb-6"
        >
          <h2 className="text-sm font-semibold text-wiki-text mb-4">Create vault</h2>
          <div className="space-y-3">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Vault name (e.g. GSI Application, Learning Rust)"
              className="w-full bg-wiki-bg border border-wiki-border rounded-lg px-4 py-2.5 text-wiki-text text-sm outline-none focus:border-wiki-accent transition-colors placeholder:text-wiki-muted"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional — helps AI suggest this vault)"
              className="w-full bg-wiki-bg border border-wiki-border rounded-lg px-4 py-2.5 text-wiki-text text-sm outline-none focus:border-wiki-accent transition-colors placeholder:text-wiki-muted"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="px-5 py-2 bg-wiki-accent hover:bg-wiki-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2 text-wiki-muted hover:text-wiki-text text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-wiki-surface border border-wiki-border rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-wiki-border rounded w-1/2 mb-2" />
              <div className="h-3 bg-wiki-border rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : vaults.length === 0 ? (
        <div className="text-center py-24 text-wiki-muted">
          <div className="text-4xl mb-4">🗄</div>
          <p className="text-lg font-medium text-wiki-text mb-1">No vaults yet</p>
          <p className="text-sm">Create your first vault — a project or topic you're working on.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vaults.map((vault) => (
            <Link
              key={vault.id}
              to={`/vault/${vault.id}`}
              className="group bg-wiki-surface border border-wiki-border hover:border-wiki-accent rounded-xl p-5 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="font-semibold text-wiki-text group-hover:text-wiki-accent transition-colors">
                  {vault.name}
                </h2>
                <span className="text-xs text-wiki-muted shrink-0 ml-2">
                  {vault.page_count} {vault.page_count === 1 ? "page" : "pages"}
                </span>
              </div>
              {vault.description && (
                <p className="text-sm text-wiki-muted leading-relaxed mb-3 line-clamp-2">
                  {vault.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-wiki-muted">
                <span>{vault.capture_count} captures</span>
                <span>·</span>
                <span>Updated {new Date(vault.updated_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
