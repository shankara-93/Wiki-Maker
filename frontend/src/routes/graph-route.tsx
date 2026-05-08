import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { api, type GraphData } from "../api";

const CATEGORY_COLORS: Record<string, string> = {
  "AI & Machine Learning": "#a78bfa",
  "Software Engineering": "#60a5fa",
  "Web Development": "#22d3ee",
  "Product & SaaS": "#4ade80",
  "Data Science": "#fbbf24",
  "DevOps & Infrastructure": "#fb923c",
  "Business & Startups": "#34d399",
  "Security & Privacy": "#f87171",
  "Tools & Productivity": "#818cf8",
  "Research & Papers": "#f472b6",
  "Career & Growth": "#2dd4bf",
  Other: "#64748b",
};

export default function GraphRoute() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.graph().then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data || !containerRef.current) return;
    if (data.nodes.length === 0) return;

    // Cleanup previous instance
    if (sigmaRef.current) {
      sigmaRef.current.kill();
      sigmaRef.current = null;
    }

    const graph = new Graph({ multi: false });

    data.nodes.forEach((n) => {
      graph.addNode(n.id, {
        label: n.label,
        size: 8,
        color: CATEGORY_COLORS[n.category] ?? "#64748b",
        x: Math.random() * 100,
        y: Math.random() * 100,
      });
    });

    data.edges.forEach((e) => {
      if (!graph.hasEdge(e.source, e.target)) {
        graph.addEdge(e.source, e.target, {
          size: Math.min(e.weight, 4),
          color: "#1e293b",
        });
      }
    });

    // Layout
    forceAtlas2.assign(graph, {
      iterations: 100,
      settings: forceAtlas2.inferSettings(graph),
    });

    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      defaultEdgeColor: "#1e293b",
      defaultNodeColor: "#6366f1",
    });

    sigma.on("enterNode", ({ node }) => setHoveredNode(node));
    sigma.on("leaveNode", () => setHoveredNode(null));
    sigma.on("clickNode", ({ node }) => navigate(`/wiki/${node}`));

    sigmaRef.current = sigma;
    return () => {
      sigma.kill();
      sigmaRef.current = null;
    };
  }, [data, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-wiki-muted">
        Building knowledge graph...
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="text-center py-24 text-wiki-muted">
        <div className="text-4xl mb-4">⬡</div>
        <p className="text-lg font-medium text-wiki-text mb-1">Graph is empty</p>
        <p className="text-sm">Capture some pages first. Edges appear between pages sharing tags or category.</p>
      </div>
    );
  }

  const hoveredData = hoveredNode ? data.nodes.find((n) => n.id === hoveredNode) : null;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-wiki-text">Knowledge Graph</h1>
        <div className="flex items-center gap-4 text-xs text-wiki-muted">
          <span>{data.nodes.length} pages</span>
          <span>{data.edges.length} connections</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <span key={cat} className="flex items-center gap-1 text-xs text-wiki-muted">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
            {cat}
          </span>
        ))}
      </div>

      <div
        ref={containerRef}
        className="w-full rounded-xl border border-wiki-border bg-wiki-surface"
        style={{ height: "calc(100vh - 280px)", minHeight: 500 }}
      />

      {hoveredData && (
        <div className="absolute top-24 right-4 bg-wiki-surface border border-wiki-border rounded-xl px-4 py-3 text-sm max-w-xs shadow-xl">
          <p className="font-semibold text-wiki-text mb-0.5">{hoveredData.label}</p>
          <p className="text-wiki-accent text-xs">{hoveredData.category}</p>
          <p className="text-wiki-muted text-xs mt-1">{hoveredData.domain}</p>
          <p className="text-wiki-muted text-xs mt-2">Click to open →</p>
        </div>
      )}
    </div>
  );
}
