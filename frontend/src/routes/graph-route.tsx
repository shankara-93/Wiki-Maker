import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { api, type GraphNode, type GraphEdge } from "../api";

const ENTITY_COLORS: Record<string, string> = {
  concept: "#a78bfa",
  tool: "#60a5fa",
  person: "#4ade80",
  decision: "#fbbf24",
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  REQUIRES: "#f87171",
  CONTRADICTS: "#fb923c",
  BUILDS_ON: "#60a5fa",
  EXAMPLES: "#22d3ee",
  ENABLES: "#4ade80",
  PART_OF: "#a78bfa",
  USED_BY: "#34d399",
  REPLACES: "#f472b6",
};

export default function GraphRoute() {
  const { id: vaultId } = useParams<{ id?: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = vaultId
      ? api.vaultGraph(vaultId)
      : api.graph();
    fetch
      .then((data) => {
        setNodes(data.nodes);
        setEdges(data.edges);
      })
      .finally(() => setLoading(false));
  }, [vaultId]);

  useEffect(() => {
    if (!nodes.length || !containerRef.current) return;

    if (sigmaRef.current) {
      sigmaRef.current.kill();
      sigmaRef.current = null;
    }

    const graph = new Graph({ multi: false });

    nodes.forEach((n) => {
      graph.addNode(n.id, {
        label: n.label,
        size: 6 + Math.min(n.source_count * 2, 10),
        color: ENTITY_COLORS[n.entity_type] ?? "#64748b",
        x: Math.random() * 100,
        y: Math.random() * 100,
      });
    });

    edges.forEach((e) => {
      if (!graph.hasEdge(e.source, e.target)) {
        graph.addEdge(e.source, e.target, {
          size: 1.5,
          color: RELATIONSHIP_COLORS[e.type] ?? "#1e293b",
        });
      }
    });

    forceAtlas2.assign(graph, {
      iterations: 120,
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
  }, [nodes, edges, navigate]);

  const backPath = vaultId ? `/vault/${vaultId}` : "/";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-wiki-muted">
        Building knowledge graph...
      </div>
    );
  }

  if (!nodes.length) {
    return (
      <div className="text-center py-24 text-wiki-muted">
        <div className="text-4xl mb-4">⬡</div>
        <p className="text-lg font-medium text-wiki-text mb-1">Graph is empty</p>
        <p className="text-sm">Capture some pages first. Edges appear from typed relationships.</p>
        <Link to={backPath} className="text-wiki-accent text-sm hover:underline mt-4 inline-block">
          ← Back
        </Link>
      </div>
    );
  }

  const hoveredData = hoveredNode ? nodes.find((n) => n.id === hoveredNode) : null;
  const hoveredEdges = hoveredNode
    ? edges.filter((e) => e.source === hoveredNode || e.target === hoveredNode)
    : [];

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to={backPath} className="text-sm text-wiki-muted hover:text-wiki-accent transition-colors">
            ←
          </Link>
          <h1 className="text-xl font-bold text-wiki-text">Knowledge Graph</h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-wiki-muted">
          <span>{nodes.length} pages</span>
          <span>{edges.length} connections</span>
        </div>
      </div>

      {/* Legend: entity types */}
      <div className="flex flex-wrap gap-3 mb-2">
        {Object.entries(ENTITY_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1 text-xs text-wiki-muted capitalize">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
            {type}
          </span>
        ))}
      </div>

      {/* Legend: relationship types */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(RELATIONSHIP_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1 text-xs text-wiki-muted">
            <span className="w-4 h-0.5 inline-block" style={{ backgroundColor: color }} />
            {type}
          </span>
        ))}
      </div>

      <div
        ref={containerRef}
        className="w-full rounded-xl border border-wiki-border bg-wiki-surface"
        style={{ height: "calc(100vh - 320px)", minHeight: 480 }}
      />

      {hoveredData && (
        <div className="absolute top-32 right-4 bg-wiki-surface border border-wiki-border rounded-xl px-4 py-3 text-sm max-w-xs shadow-xl">
          <p className="font-semibold text-wiki-text mb-0.5">{hoveredData.label}</p>
          <p className="text-wiki-accent text-xs capitalize mb-1">{hoveredData.entity_type}</p>
          <p className="text-wiki-muted text-xs">{hoveredData.source_count} source{hoveredData.source_count !== 1 ? "s" : ""} · {hoveredData.confidence} confidence</p>
          {hoveredEdges.length > 0 && (
            <div className="mt-2 pt-2 border-t border-wiki-border space-y-1">
              {hoveredEdges.slice(0, 3).map((e, i) => (
                <p key={i} className="text-xs text-wiki-muted">
                  <span
                    className="font-medium"
                    style={{ color: RELATIONSHIP_COLORS[e.type] ?? "#64748b" }}
                  >
                    {e.type}
                  </span>{" "}
                  {e.source === hoveredNode ? "→" : "←"}{" "}
                  {nodes.find((n) => n.id === (e.source === hoveredNode ? e.target : e.source))?.label}
                </p>
              ))}
            </div>
          )}
          <p className="text-wiki-muted text-xs mt-2">Click to open →</p>
        </div>
      )}
    </div>
  );
}
