import { Link } from "react-router-dom";
import type { WikiPage } from "../api";

const CATEGORY_COLORS: Record<string, string> = {
  "AI & Machine Learning": "text-purple-400 bg-purple-900/30 border-purple-800",
  "Software Engineering": "text-blue-400 bg-blue-900/30 border-blue-800",
  "Web Development": "text-cyan-400 bg-cyan-900/30 border-cyan-800",
  "Product & SaaS": "text-green-400 bg-green-900/30 border-green-800",
  "Data Science": "text-yellow-400 bg-yellow-900/30 border-yellow-800",
  "DevOps & Infrastructure": "text-orange-400 bg-orange-900/30 border-orange-800",
  "Business & Startups": "text-emerald-400 bg-emerald-900/30 border-emerald-800",
  "Security & Privacy": "text-red-400 bg-red-900/30 border-red-800",
  "Tools & Productivity": "text-indigo-400 bg-indigo-900/30 border-indigo-800",
  "Research & Papers": "text-pink-400 bg-pink-900/30 border-pink-800",
  "Career & Growth": "text-teal-400 bg-teal-900/30 border-teal-800",
};

export default function WikiCard({ page }: { page: WikiPage }) {
  const catColor = CATEGORY_COLORS[page.category] ?? "text-wiki-muted bg-wiki-bg border-wiki-border";
  const date = new Date(page.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      to={`/wiki/${page.id}`}
      className="group block bg-wiki-surface border border-wiki-border hover:border-wiki-accent/50 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-indigo-950/30"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md border ${catColor}`}>
          {page.category}
        </span>
        <span className="text-xs text-wiki-muted shrink-0">{date}</span>
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
        <span className="text-xs text-wiki-muted">{page.source_domain}</span>
      </div>
    </Link>
  );
}
