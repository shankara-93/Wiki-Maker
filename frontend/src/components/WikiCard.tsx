import { Link } from "react-router-dom";
import type { WikiPage } from "../api";

const ENTITY_STYLES: Record<string, string> = {
  concept: "text-purple-400 bg-purple-900/30 border-purple-800",
  tool: "text-blue-400 bg-blue-900/30 border-blue-800",
  person: "text-green-400 bg-green-900/30 border-green-800",
  decision: "text-yellow-400 bg-yellow-900/30 border-yellow-800",
};

const CONFIDENCE_DOT: Record<string, string> = {
  high: "bg-green-400",
  medium: "bg-yellow-400",
  low: "bg-red-400/60",
};

export default function WikiCard({ page }: { page: WikiPage }) {
  const entityStyle = ENTITY_STYLES[page.entity_type] ?? "text-wiki-muted bg-wiki-bg border-wiki-border";
  const date = new Date(page.updated_at ?? page.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      to={`/wiki/${page.id}`}
      className="group block bg-wiki-surface border border-wiki-border hover:border-wiki-accent/50 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-indigo-950/30"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md border capitalize ${entityStyle}`}>
          {page.entity_type ?? page.category ?? "concept"}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {page.confidence && (
            <span
              className={`w-1.5 h-1.5 rounded-full ${CONFIDENCE_DOT[page.confidence] ?? "bg-wiki-muted"}`}
              title={`${page.confidence} confidence`}
            />
          )}
          <span className="text-xs text-wiki-muted">{date}</span>
        </div>
      </div>

      <h3 className="text-wiki-text font-semibold text-[15px] leading-snug mb-2 group-hover:text-white transition-colors line-clamp-2">
        {page.title}
      </h3>

      <p className="text-wiki-muted text-sm leading-relaxed line-clamp-2 mb-3">
        {page.summary}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {(page.tags || []).slice(0, 4).map((tag) => (
            <span key={tag} className="text-xs text-wiki-accent bg-indigo-950/40 px-1.5 py-0.5 rounded">
              #{tag}
            </span>
          ))}
        </div>
        {(page.source_domain || page.source_count > 1) && (
          <div className="flex items-center gap-1.5 text-xs text-wiki-muted">
            {page.source_count > 1 && (
              <span className="text-wiki-accent">{page.source_count} sources</span>
            )}
            {page.source_domain && <span>{page.source_domain}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
