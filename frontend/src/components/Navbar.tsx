import { Link, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { useState } from "react";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/search", label: "Search" },
  { to: "/graph", label: "Graph" },
];

export default function Navbar({ session }: { session: Session }) {
  const { pathname } = useLocation();
  const [captureUrl, setCaptureUrl] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [captureMsg, setCaptureMsg] = useState("");

  async function handleCapture(e: React.FormEvent) {
    e.preventDefault();
    if (!captureUrl.trim()) return;
    setCapturing(true);
    setCaptureMsg("");
    try {
      const token = session.access_token;
      const res = await fetch("/api/capture/url", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: captureUrl.trim() }),
      });
      if (res.ok) {
        setCaptureMsg("✓ Saved!");
        setCaptureUrl("");
      } else {
        const err = await res.json().catch(() => ({ detail: "Error" }));
        setCaptureMsg("✗ " + err.detail);
      }
    } catch (e: unknown) {
      setCaptureMsg("✗ " + (e instanceof Error ? e.message : "Error"));
    } finally {
      setCapturing(false);
      setTimeout(() => setCaptureMsg(""), 4000);
    }
  }

  return (
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

        {/* Quick capture URL bar */}
        <form onSubmit={handleCapture} className="flex-1 flex items-center gap-2 max-w-md ml-auto">
          <input
            type="url"
            value={captureUrl}
            onChange={(e) => setCaptureUrl(e.target.value)}
            placeholder="Paste URL to capture..."
            className="flex-1 bg-wiki-bg border border-wiki-border rounded-lg px-3 py-1.5 text-sm text-wiki-text outline-none focus:border-wiki-accent transition-colors placeholder:text-wiki-muted"
          />
          <button
            type="submit"
            disabled={capturing || !captureUrl}
            className="px-3 py-1.5 bg-wiki-accent hover:bg-wiki-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 shrink-0"
          >
            {capturing ? "..." : "Save"}
          </button>
          {captureMsg && (
            <span className={`text-xs shrink-0 ${captureMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>
              {captureMsg}
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
  );
}
