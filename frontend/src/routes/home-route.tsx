import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Category, type WikiPage } from "../api";
import WikiCard from "../components/WikiCard";

export default function HomeRoute() {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setCurrentPage(1);
    Promise.all([
      api.listWikis({ category: selectedCategory ?? undefined, page: 1, per_page: 18 }),
      api.categories(),
    ])
      .then(([list, cats]) => {
        setPages(list.pages);
        setTotal(list.total);
        setCategories(cats);
      })
      .finally(() => setLoading(false));
  }, [selectedCategory]);

  async function loadMore() {
    const next = currentPage + 1;
    const list = await api.listWikis({
      category: selectedCategory ?? undefined,
      page: next,
      per_page: 18,
    });
    setPages((p) => [...p, ...list.pages]);
    setCurrentPage(next);
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 hidden lg:block">
        <div className="sticky top-20">
          <h2 className="text-xs text-wiki-muted uppercase tracking-wider font-semibold mb-3">Categories</h2>
          <nav className="space-y-0.5">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                !selectedCategory
                  ? "bg-wiki-accent/20 text-wiki-accent font-medium"
                  : "text-wiki-muted hover:text-wiki-text hover:bg-white/5"
              }`}
            >
              All ({total})
            </button>
            {categories.map((c) => (
              <button
                key={c.category}
                onClick={() => setSelectedCategory(c.category)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                  selectedCategory === c.category
                    ? "bg-wiki-accent/20 text-wiki-accent font-medium"
                    : "text-wiki-muted hover:text-wiki-text hover:bg-white/5"
                }`}
              >
                <span className="truncate">{c.category}</span>
                <span className="text-xs shrink-0 ml-1">{c.count}</span>
              </button>
            ))}
          </nav>

          <div className="mt-6 pt-6 border-t border-wiki-border">
            <Link
              to="/graph"
              className="flex items-center gap-2 text-sm text-wiki-muted hover:text-wiki-accent transition-colors"
            >
              <span>⬡</span> Knowledge Graph
            </Link>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-semibold text-wiki-text">
            {selectedCategory ?? "All Pages"}
            <span className="text-wiki-muted font-normal text-sm ml-2">({total})</span>
          </h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-wiki-surface border border-wiki-border rounded-xl p-5 animate-pulse">
                <div className="h-3 bg-wiki-border rounded w-1/3 mb-3" />
                <div className="h-4 bg-wiki-border rounded w-3/4 mb-2" />
                <div className="h-3 bg-wiki-border rounded w-full mb-1" />
                <div className="h-3 bg-wiki-border rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-24 text-wiki-muted">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-lg font-medium text-wiki-text mb-1">No pages yet</p>
            <p className="text-sm">Paste a URL in the top bar or use the Chrome extension to capture your first article.</p>
          </div>
        ) : (
          <>
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
    </div>
  );
}
