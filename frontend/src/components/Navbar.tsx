import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { useState } from "react";
import { api, type VaultSuggestion, type Vault } from "../api";

const NAV = [
  { to: "/", label: "Vaults" },
  { to: "/search", label: "Search" },
];

type CaptureStep =
  | { type: "idle" }
  | { type: "analyzing" }
  | { type: "picking"; suggestions: VaultSuggestion[]; newVaultSuggestion: { name: string; description: string }; preview: { title: string; domain: string } }
  | { type: "saving" }
  | { type: "done"; title: string }
  | { type: "error"; message: string };

export default function Navbar({ session }: { session: Session }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [captureUrl, setCaptureUrl] = useState("");
  const [step, setStep] = useState<CaptureStep>({ type: "idle" });
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [creatingNewVault, setCreatingNewVault] = useState(false);
  const [newVaultName, setNewVaultName] = useState("");

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    const url = captureUrl.trim();
    if (!url) return;

    setStep({ type: "analyzing" });
    try {
      // Load vaults in parallel with analysis
      const [result, vaultList] = await Promise.all([
        api.suggestVault(url),
        api.listVaults(),
      ]);
      setVaults(vaultList);

      // If vaults exist, go to picking step; otherwise skip to create-vault step
      if (vaultList.length > 0 || result.suggestions.length > 0) {
        setStep({
          type: "picking",
          suggestions: result.suggestions,
          newVaultSuggestion: result.new_vault_suggestion,
          preview: { title: result.scraped.title, domain: result.scraped.domain },
        });
        // Pre-select top suggestion if confidence > 0.7
        if (result.suggestions[0]?.confidence > 0.7 && result.suggestions[0].vault_id) {
          setSelectedVaultId(result.suggestions[0].vault_id);
        }
      } else {
        // No existing vaults — pre-fill new vault name from AI suggestion
        setNewVaultName(result.new_vault_suggestion.name);
        setCreatingNewVault(true);
        setStep({
          type: "picking",
          suggestions: [],
          newVaultSuggestion: result.new_vault_suggestion,
          preview: { title: result.scraped.title, domain: result.scraped.domain },
        });
      }
    } catch (err) {
      setStep({ type: "error", message: err instanceof Error ? err.message : "Failed to analyze URL" });
    }
  }

  async function handleSave() {
    const url = captureUrl.trim();
    let vaultId = selectedVaultId;

    setStep({ type: "saving" });
    try {
      // Create new vault if needed
      if (!vaultId && creatingNewVault && newVaultName.trim()) {
        const vault = await api.createVault(newVaultName.trim());
        vaultId = vault.id;
        setVaults((v) => [vault, ...v]);
      }

      if (!vaultId) {
        setStep({ type: "error", message: "Please select or create a vault." });
        return;
      }

      const result = await api.captureUrl(url, vaultId);
      setStep({ type: "done", title: result.wiki_page.title });
      setCaptureUrl("");
      setSelectedVaultId(null);
      setCreatingNewVault(false);
      setNewVaultName("");
      setTimeout(() => {
        setStep({ type: "idle" });
        navigate(`/wiki/${result.wiki_page.id}`);
      }, 1500);
    } catch (err) {
      setStep({ type: "error", message: err instanceof Error ? err.message : "Failed to save" });
    }
  }

  function handleReset() {
    setStep({ type: "idle" });
    setSelectedVaultId(null);
    setCreatingNewVault(false);
    setNewVaultName("");
  }

  const isPicking = step.type === "picking";

  return (
    <>
      <nav className="sticky top-0 z-50 bg-wiki-surface/90 backdrop-blur-sm border-b border-wiki-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-wiki-text shrink-0">
            <span className="text-lg">📖</span>
            <span className="hidden sm:block">LLM Wiki</span>
          </Link>

          <div className="flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === n.to
                    ? "bg-wiki-accent/20 text-wiki-accent"
                    : "text-wiki-muted hover:text-wiki-text hover:bg-white/5"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </div>

          {/* Capture bar */}
          <form onSubmit={handleAnalyze} className="flex-1 flex items-center gap-2 max-w-md ml-auto">
            <input
              type="url"
              value={captureUrl}
              onChange={(e) => setCaptureUrl(e.target.value)}
              placeholder="Paste URL to capture..."
              disabled={step.type === "analyzing" || step.type === "saving" || step.type === "done"}
              className="flex-1 bg-wiki-bg border border-wiki-border rounded-lg px-3 py-1.5 text-sm text-wiki-text outline-none focus:border-wiki-accent transition-colors placeholder:text-wiki-muted disabled:opacity-50"
            />
            {step.type === "idle" || step.type === "error" ? (
              <button
                type="submit"
                disabled={!captureUrl.trim()}
                className="px-3 py-1.5 bg-wiki-accent hover:bg-wiki-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 shrink-0"
              >
                Analyze
              </button>
            ) : step.type === "analyzing" ? (
              <span className="text-xs text-wiki-muted shrink-0">Analyzing...</span>
            ) : step.type === "saving" ? (
              <span className="text-xs text-wiki-muted shrink-0">Saving...</span>
            ) : step.type === "done" ? (
              <span className="text-xs text-green-400 shrink-0">✓ Saved!</span>
            ) : null}
            {step.type === "error" && (
              <span className="text-xs text-red-400 shrink-0 max-w-[120px] truncate" title={step.message}>
                ✗ {step.message}
              </span>
            )}
          </form>

          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-wiki-muted hover:text-wiki-text transition-colors shrink-0"
            title={session.user.email}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Vault picker overlay */}
      {isPicking && step.type === "picking" && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-20 px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleReset}
          />
          <div className="relative bg-wiki-surface border border-wiki-border rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="font-semibold text-wiki-text mb-1">Save to which vault?</h2>
            <p className="text-sm text-wiki-muted mb-4">
              <span className="text-wiki-text font-medium">{step.preview.title || step.preview.domain}</span>
            </p>

            <div className="space-y-2 mb-4">
              {/* Existing vault suggestions */}
              {vaults.map((vault) => {
                const suggestion = step.suggestions.find((s) => s.vault_id === vault.id);
                const isSelected = selectedVaultId === vault.id && !creatingNewVault;
                return (
                  <button
                    key={vault.id}
                    onClick={() => {
                      setSelectedVaultId(vault.id);
                      setCreatingNewVault(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                      isSelected
                        ? "border-wiki-accent bg-wiki-accent/10"
                        : "border-wiki-border bg-wiki-bg hover:border-wiki-accent/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-wiki-text">{vault.name}</span>
                      {suggestion && (
                        <span className="text-xs text-wiki-accent">
                          {Math.round(suggestion.confidence * 100)}% match
                        </span>
                      )}
                    </div>
                    {suggestion && (
                      <p className="text-xs text-wiki-muted mt-0.5">{suggestion.reason}</p>
                    )}
                    {!suggestion && (
                      <p className="text-xs text-wiki-muted mt-0.5">{vault.page_count} pages</p>
                    )}
                  </button>
                );
              })}

              {/* New vault option */}
              <button
                onClick={() => {
                  setCreatingNewVault(true);
                  setSelectedVaultId(null);
                  if (!newVaultName) setNewVaultName(step.newVaultSuggestion.name);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  creatingNewVault
                    ? "border-wiki-accent bg-wiki-accent/10"
                    : "border-wiki-border border-dashed bg-wiki-bg hover:border-wiki-accent/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-wiki-text">+ New vault</span>
                  <span className="text-xs text-wiki-muted">AI suggests: "{step.newVaultSuggestion.name}"</span>
                </div>
              </button>

              {creatingNewVault && (
                <input
                  autoFocus
                  type="text"
                  value={newVaultName}
                  onChange={(e) => setNewVaultName(e.target.value)}
                  placeholder="Vault name..."
                  className="w-full bg-wiki-bg border border-wiki-accent rounded-lg px-4 py-2.5 text-sm text-wiki-text outline-none transition-colors"
                />
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={(!selectedVaultId && !creatingNewVault) || (creatingNewVault && !newVaultName.trim())}
                className="flex-1 py-2.5 bg-wiki-accent hover:bg-wiki-accent-hover text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-40"
              >
                Save to vault
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2.5 text-wiki-muted hover:text-wiki-text text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
