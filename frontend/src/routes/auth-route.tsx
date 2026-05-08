import { useState } from "react";
import { supabase } from "../supabase";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Check your email to confirm your account.");
    }
    setLoading(false);
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  }

  return (
    <div className="min-h-screen bg-wiki-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 text-2xl">
            📖
          </div>
          <h1 className="text-2xl font-bold text-wiki-text">LLM Wiki</h1>
          <p className="text-wiki-muted text-sm mt-1">Your personal AI knowledge vault</p>
        </div>

        <div className="bg-wiki-surface border border-wiki-border rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-wiki-muted uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-wiki-bg border border-wiki-border rounded-lg px-3 py-2.5 text-wiki-text text-sm outline-none focus:border-wiki-accent transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-wiki-muted uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-wiki-bg border border-wiki-border rounded-lg px-3 py-2.5 text-wiki-text text-sm outline-none focus:border-wiki-accent transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {message && (
              <p className="text-green-400 text-xs bg-green-950/40 border border-green-900 rounded-lg px-3 py-2">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "..." : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-wiki-border" />
            </div>
            <div className="relative text-center">
              <span className="bg-wiki-surface px-2 text-xs text-wiki-muted">or</span>
            </div>
          </div>

          <button
            onClick={handleGoogle}
            className="w-full bg-wiki-bg border border-wiki-border hover:border-wiki-accent text-wiki-text text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Continue with Google
          </button>

          <p className="text-center text-xs text-wiki-muted mt-4">
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button
              className="text-wiki-accent hover:underline"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError("");
                setMessage("");
              }}
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
