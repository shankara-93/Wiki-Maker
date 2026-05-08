import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, type WikiPage } from "../api";
import WikiCard from "../components/WikiCard";

export default function SearchRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const initialTag = searchParams.get("tag") || "";

  const [query, setQuery] = useState(initialQ);
  const [tag, setTag] = useState(initialTag);
  const [results, setResults] = useState<WikiPage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (initialQ || initialTag) doSearch(initialQ, initialTag);
  }, []);

  async function doSearch(q: string, t: string) {
    setLoading(true);
    setSearched(true);
    const params: Record<string, string> = {};
    if (q) params.q = q;
    if (t) params.tag = t;
    setSearchParams(params);

    const list = await api.listWikis({
      search: q || undefined,
      tag: t || undefined,
      per_page: 50,
    });
    setResults(list.pages);
    setTotal(list.total);
    setLoading(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doSearch(query, tag);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-wiki-text mb-6">Search</h1>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles, notes, summaries..."
          className="flex-1 bg-wiki-surface border border-wiki-border rounded-xl px-4 py-3 text-wiki-text outline-none focus:border-wiki-accent transition-colors placeholder:text-wiki-muted"
        />
        <input
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Tag filter"
          className="w-36 bg-wiki-surface border border-wiki-border rounded-xl px-4 py-3 text-wiki-text outline-none focus:border-wiki-accent transition-colors placeholder:text-wiki-muted"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-wiki-accent hover:bg-wiki-accent-hover text-white font-medium rounded-xl transition-colors"
        >
          Search
        </button>
      </form>

      {loading && (
        <div className="text-center py-12 text-wiki-muted">Searching...</div>
      )}

      {!loading && searched && (
        <>
          <p className="text-sm text-wiki-muted mb-4">{total} result{total !== 1 ? "s" : ""}</p>
          {results.length === 0 ? (
            <div className="text-center py-16 text-wiki-muted">
              <div className="text-3xl mb-3">🔍</div>
              <p>No results found. Try a different keyword or tag.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((p) => <WikiCard key={p.id} page={p} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
