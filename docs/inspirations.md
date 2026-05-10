# Inspirations & References

---

## Karpathy's LLM Wiki (foundational concept)

- Repo: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- 3-layer architecture: `raw/` sources → `wiki/` pages → `CLAUDE.md` schema
- 3 operations: ingest / query / lint
- Key insight: knowledge **compiles** instead of being re-derived (bypasses RAG)
- Plain markdown files; Claude Code reads from local folder

## wiki-os by Ansub (UI inspiration + base for our frontend)

- Repo: https://github.com/Ansub/wiki-os (MIT licensed)
- React 19 + Vite + Tailwind v4 + Sigma.js graph visualization
- Local Obsidian vault → web UI
- **We fork this** — see `docs/architecture.md` → Frontend Strategy

## Critical Articles That Shaped Our Design

1. **"Hidden Flaw" (Anand Lahoti)** — Authorial ambiguity: AI prose stored as truth.
   Our fix: sources sacred, wiki pages explicitly labeled as AI interpretation.

2. **"LLM Wiki is a Bad Idea" (Mehul Gupta)** — Knowledge poisoning, error compounding.
   Our fix: citations map every claim back to exact original quotes.

3. **"Retention Problem" (Towards AI)** — Cognitive offloading, no real learning.
   Our fix: engagement loops (digest, teach-back, why-saved prompt).

4. **"What's Missing" (DEV/penfieldlabs)** — No typed relationships, doesn't scale.
   Our fix: typed relationships (REQUIRES, CONTRADICTS, etc.) in Phase 4.

5. **"LLM Wiki v2" (rohitg00)** — Lifecycle management, confidence scoring, knowledge graph.
   Our fix: confidence scores, source_count, recency decay, vault health.

---

## How We Differ from Karpathy's LLM Wiki

| Karpathy's LLM Wiki | Our LLM Wiki Maker |
|---|---|
| Local Obsidian vault | Cloud-hosted (Supabase) |
| Single flat folder | Dynamic multi-vault (per project/topic) |
| AI prose stored as truth | AI labeled as interpretation; sources sacred |
| Manual file copy | One-click browser extension |
| Articles only | Articles + LinkedIn + Twitter + YouTube |
| Plain links between pages | Typed semantic relationships |
| No confidence/lifecycle | Confidence scores + recency decay |
| Single user | Multi-user from day one (each user private) |
| Knowledge sits in folder | MCP server feeds vault to Claude Code, Cursor, etc. |
| Pure offloading | Engagement loops keep you learning |
