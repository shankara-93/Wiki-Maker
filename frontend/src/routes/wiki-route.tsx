import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { api, type WikiPage } from "../api";

export default function WikiRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getWiki(id).then(setPage).finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!id || !confirm("Delete this wiki page?")) return;
    setDeleting(true);
    await api.deleteWiki(id);
    navigate("/");
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse space-y-4 pt-4">
        <div className="h-6 bg-wiki-surface rounded w-1/2" />
        <div className="h-4 bg-wiki-surface rounded w-full" />
        <div className="h-4 bg-wiki-surface rounded w-3/4" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="text-center py-24 text-wiki-muted">
        <p className="text-lg font-medium text-wiki-text mb-2">Page not found</p>
        <Link to="/" className="text-wiki-accent text-sm hover:underline">← Back to home</Link>
      </div>
    );
  }

  const date = new Date(page.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-wiki-muted hover:text-wiki-accent transition-colors mb-6">
        ← Back
      </Link>

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-wiki-accent bg-indigo-950/50 border border-indigo-800 px-2 py-0.5 rounded-md">
            {page.category}
          </span>
          <span className="text-xs text-wiki-muted">{date}</span>
          <span className="text-xs text-wiki-muted">·</span>
          <a
            href={page.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-wiki-muted hover:text-wiki-accent truncate max-w-[200px]"
          >
            {page.source_domain} ↗
          </a>
        </div>

        <h1 className="text-2xl font-bold text-wiki-text leading-tight mb-3">{page.title}</h1>

        <p className="text-wiki-muted leading-relaxed">{page.summary}</p>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {page.tags.map((tag) => (
            <Link
              key={tag}
              to={`/search?tag=${encodeURIComponent(tag)}`}
              className="text-xs text-wiki-accent bg-indigo-950/40 hover:bg-indigo-950/70 px-2 py-0.5 rounded transition-colors"
            >
              #{tag}
            </Link>
          ))}
        </div>
      </header>

      {/* Key Insights */}
      {page.key_insights?.length > 0 && (
        <section className="bg-wiki-surface border border-wiki-border rounded-xl p-5 mb-8">
          <h2 className="text-sm font-semibold text-wiki-text uppercase tracking-wider mb-3">
            ✦ Key Insights
          </h2>
          <ul className="space-y-2">
            {page.key_insights.map((insight, i) => (
              <li key={i} className="flex gap-2 text-sm text-wiki-muted">
                <span className="text-wiki-accent shrink-0 mt-0.5">→</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Detailed Notes */}
      <section className="prose max-w-none mb-8">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              const isBlock = !!(node?.position && String(children).includes("\n"));
              return isBlock && match ? (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{ borderRadius: "8px", fontSize: "13px" }}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {page.detailed_notes}
        </ReactMarkdown>
      </section>

      {/* Code Examples */}
      {page.code_examples?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-wiki-text uppercase tracking-wider mb-4">
            Code Examples
          </h2>
          <div className="space-y-4">
            {page.code_examples.map((ex, i) => (
              <div key={i} className="border border-wiki-border rounded-xl overflow-hidden">
                <div className="bg-wiki-surface px-4 py-2 flex items-center justify-between border-b border-wiki-border">
                  <span className="text-xs font-medium text-wiki-accent">{ex.language}</span>
                  <span className="text-xs text-wiki-muted">{ex.description}</span>
                </div>
                <SyntaxHighlighter
                  style={oneDark}
                  language={ex.language}
                  customStyle={{ margin: 0, borderRadius: 0, fontSize: "13px" }}
                >
                  {ex.code}
                </SyntaxHighlighter>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Source + Delete */}
      <footer className="border-t border-wiki-border pt-6 flex items-center justify-between">
        <a
          href={page.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-wiki-accent hover:underline"
        >
          View original article ↗
        </a>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-red-500 hover:text-red-400 transition-colors disabled:opacity-40"
        >
          {deleting ? "Deleting..." : "Delete page"}
        </button>
      </footer>
    </div>
  );
}
