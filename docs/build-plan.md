# Build Plan — Phases 0–5

> Rule (from D4 in `docs/decisions.md`): each phase must work end-to-end
> and be daily-usable before the next phase starts. No gold-plating between phases.

---

## Phase 0 — Done (V1 Sketch, frontend thrown away)

Flat wiki: single `wiki_pages` table, fixed categories, no vaults.
Backend (FastAPI + Supabase) kept as skeleton. Freehand Tailwind frontend thrown away —
replaced by wiki-os fork in Chunk 1.

**Gaps**: no vaults, no source separation, no typed relationships, no confidence scoring,
no engagement loops, no MCP server.

---

## Phase 1 — Source-Anchored Vaults 🔨 Current

**Goal**: replace the flat model with the real data model. Everything else builds on this.

**DB** (`supabase/schema_v2.sql`):
- `vaults`, `captures`, updated `wiki_pages`, `citations`, `relationships` tables
- pgvector extension + embedding columns
- RLS policies: each user sees only their own data

**Backend**:
- `vaults.py` — vault CRUD
- `database.py` — all queries scoped to vault_id
- `llm_processor.py` — two LLM calls: (1) suggest vault, (2) compile wiki + citations
- `main.py` — `/api/vaults`, `/api/capture/suggest`, `/api/capture/url`, `/api/capture/html`,
  vault-scoped pages, vault-scoped graph

**Frontend** (wiki-os fork):
- Supabase auth screen (Chunk 2)
- Vault list + create vault (Chunk 3)
- Vault detail: pages inside one vault (Chunk 3)
- Capture flow: paste URL → AI suggests vault → modal picker → save (Chunk 4)
- Wiki page detail: shows citations panel

**Extension**:
- Vault suggestion in popup ("Save to GSI vault? 87% match")
- Vault picker before saving

**Success test (D3 bar #1 — "never lose an article")**:
> Capture 10 real articles into 2-3 vaults over one week.
> Zero captures fail. Zero end up in the wrong vault without the user noticing.
> Any one can be found in under 30 seconds.

---

## Phase 2 — AI Vault Intelligence

**Goal**: AI suggests the right vault, deduplicates entity pages, builds citations reliably.

**Features**:
- `/api/vaults/suggest` — ranked vault suggestions with confidence % for any content
- Entity deduplication: fuzzy title match + embedding similarity before creating a new page
- Confidence scoring: high/medium/low based on source agreement
- Three capture modes: Smart / Confirm Everything / Full Manual
- Vault fingerprint auto-update after each new capture

**Success test (D3 bar #1 + quality)**:
> AI top vault suggestion correct ≥80% of the time.
> Two articles on the same concept merge into one page (2 sources), not two duplicates.

---

## Phase 3 — Hybrid Search + Chat Interface
*(swapped with Phase 4 — application beats viewing, per D5)*

**Goal**: make the vault queryable conversationally. This is where captured knowledge gets USED.

**Features**:
- pgvector embeddings on every wiki page + capture at save time
- `/api/search` — hybrid: keyword (pg FTS) + semantic (cosine) + graph traversal
- `/api/vault/:id/chat` — user asks question → hybrid retrieval → Claude synthesizes with citations
- Chat UI: message history, citation chips on every answer, source quotes
- Cross-vault chat option

**Success test (D3 bar #2 — "build better products from saved research")**:
> User opens chat for a real project task (e.g. building a GSI feature),
> asks a question, gets back ≥1 useful insight from their saved captures
> that they actually use in the work.

---

## Phase 4 — Knowledge Graph + Typed Relationships
*(was Phase 3; deprioritized — graph is a viewing tool)*

**Goal**: replace untyped tag-sharing edges with semantic typed relationships.

**Features**:
- LLM extracts typed relationships during wiki compilation
- Graph visualization: edge colors by type, hover shows type + evidence
- Relationship management UI: view, edit, delete
- Per-vault link_types configuration

**Success test**:
> User clicks a node in their vault graph and the connections reveal
> something they wouldn't have noticed in the flat list view.

---

## Phase 5 — MCP Server + Engagement Loops

**Goal**: feed the vault back into daily work; prevent pure cognitive offloading.
**This is the killer feature cluster** (D5 — solves "captured but never used").

**MCP Server** (`mcp/server.py`):
- Tools: `list_vaults`, `search_vault`, `get_wiki_page`, `get_related`, `ask_vault`, `save_to_vault`
- Auth: Supabase JWT
- Config: `~/.claude/mcp.json`

**Engagement**:
- Capture-time "why did you save this?" — stored, surfaces in digest
- Weekly digest: 3 ideas from the week, do you remember?
- Teach-back mode: explain a concept → Claude grades it

**Vault Health** (D1 from `docs/decisions.md`):
- Cluster pages by embedding similarity; surface outliers
- Suggest: move to existing vault or create new vault from cluster
- UI: "Vault Health" panel in vault settings

**Success test (D3 bars #2 + #3)**:
> 1. **Use**: while building in Claude Code, agent calls `search_vault` and
>    surfaces a capture from weeks ago that helps the current task.
>    User sees the citation in the agent's output.
> 2. **Learn**: user receives weekly digest, recalls 2/3 ideas without re-reading source.
>    Or completes teach-back and AI confirms understanding.

---

## Current Status

| Phase | Status | Success bar |
|---|---|---|
| 0 | ✅ Done (sketch) | n/a |
| 1 | 🔨 Building | Never lose an article |
| 2 | ⬜ Planned | Top vault suggestion ≥80% correct |
| 3 | ⬜ Planned | Query vault during real project work |
| 4 | ⬜ Planned | Graph reveals non-obvious connections |
| 5 | ⬜ Planned | MCP cited in Claude Code; digest works |
