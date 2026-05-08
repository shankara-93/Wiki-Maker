# LLM Wiki Maker — Project Context

> This file is the single source of truth for this project.
> Read this before touching any code. Update it whenever decisions are made.

---

## The Problem Being Solved

The user finds valuable articles, posts, threads, and videos on LinkedIn,
Twitter, Medium, YouTube, and blogs. Later they forget the URL and where
they found the content. They lose that knowledge permanently — and even
worse, they never apply it to the projects they're actively building.

**Goal**: Capture → Compile → Compound → Retrieve → **Feed back into work**.
Build a personal AI second brain that gets smarter over time and actively
helps the user build things.

---

## Inspirations & Influences

### Karpathy's LLM Wiki (the foundational concept)
- Repo: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- 3-layer architecture: raw sources / wiki pages / schema
- 3 operations: ingest / query / lint
- Knowledge **compiles** instead of being re-derived (bypasses RAG)
- Plain markdown; Claude Code reads from local folder

### wiki-os by Ansub (UI inspiration)
- Repo: https://github.com/Ansub/wiki-os
- React + Vite + Sigma.js graph visualization
- Local Obsidian vault → web UI

### Critical Articles That Shaped Our Design
1. **"Hidden Flaw" (Anand Lahoti)** — Authorial ambiguity: AI prose stored as truth
2. **"LLM Wiki is a Bad Idea" (Mehul Gupta)** — Knowledge poisoning, error compounding
3. **"Retention Problem" (Towards AI)** — Cognitive offloading, no real learning
4. **"What's Missing" (DEV/penfieldlabs)** — No typed relationships, doesn't scale
5. **"LLM Wiki v2" (rohitg00)** — Lifecycle, confidence scoring, knowledge graph

---

## How We Differ From Karpathy's LLM Wiki

| Karpathy's LLM Wiki | Our LLM Wiki Maker |
|---|---|
| Local Obsidian vault | Cloud-hosted (Supabase) |
| Single flat folder | **Dynamic multi-vault** (per project/topic) |
| AI authors prose stored as truth | **AI labeled as interpretation, sources sacred** |
| Manual file copy | **One-click browser extension** |
| Articles only | **Articles + Twitter + LinkedIn + YouTube** |
| Plain links between pages | **Typed semantic relationships** |
| No confidence/lifecycle | **Confidence scores + recency decay** |
| Single user | **Multi-user from day one** |
| Knowledge sits in folder | **MCP server feeds vault to Claude Code, Cursor, etc.** |
| Pure offloading | **User engagement loops keep you learning** |

---

## The Three Core Principles (Non-Negotiable)

### 1. Originals Are Sacred
Captured raw content is the **source of truth**, never modified, never overwritten.
Wiki pages are AI **interpretations**, clearly labeled as such.
Every claim in a wiki page must cite back to the original source.
This solves: knowledge poisoning, authorial ambiguity, information loss.

### 2. AI Suggests, User Decides
The AI is an **assistant, not an autopilot**.
Every AI action is a suggestion. Every save is a confirmed action.
Vault assignment, categorization, content extraction — all reversible.
User is editor-in-chief. Manual override is mandatory at every step.
This solves: cognitive offloading, trust, silent drift.

### 3. Vaults Are Dynamic
Vaults are created on-demand by the user.
No hardcoded categories. Each vault = one project or topic the user cares about.
Each vault is fully isolated. Pages don't bleed across vaults.
This solves: rigid taxonomy, one-size-fits-all organization.

---

## The User Flow

```
┌──────────────────────────────────────────────────────────┐
│  CAPTURE                                                   │
│  User finds article → clicks extension                    │
│      ↓                                                     │
│  Backend scrapes content                                   │
│      ↓                                                     │
│  AI analyzes content                                       │
│      ↓                                                     │
│  AI checks: does any existing vault match?                 │
│      ↓                                                     │
│  ┌──── Match found ────┐    ┌── No match found ──┐         │
│  │ "Save to GSI vault?"│    │ "Create new vault?" │         │
│  │ User confirms / picks │    │ User accepts/renames │       │
│  │ different vault      │    │ /picks existing     │         │
│  └──────────────────────┘    └────────────────────┘         │
│      ↓                                                     │
│  AI compiles into wiki page                                │
│      ↓                                                     │
│  AI checks: does an entity page exist for this topic?      │
│      ↓                                                     │
│  ┌─ Yes ─┐         ┌─ No ─┐                               │
│  │ UPDATE │         │ CREATE │                            │
│  │ existing │       │ new page │                          │
│  │ page     │       └────────┘                            │
│  └──────────┘                                              │
│      ↓                                                     │
│  AI creates typed relationships to other pages             │
│      ↓                                                     │
│  Saved. Source kept. Citations attached. Confidence scored.│
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  RETRIEVE & USE                                            │
│  Web UI:    Browse vaults, search, view graph             │
│  MCP:       Claude Code/Cursor query vault during work    │
│  Engagement: Weekly digest, teach-back mode               │
└──────────────────────────────────────────────────────────┘
```

---

## The Three Modes (User Choice)

| Mode | What happens | Best for |
|---|---|---|
| **Smart (default)** | AI suggests vault, category, tags. User confirms with one click. | Most usage |
| **Confirm Everything** | AI processes → user reviews every field → save | Important content |
| **Full Manual** | Capture goes to Inbox. User writes wiki, files manually. | Deep learning, AI getting it wrong |

---

## Data Model

### Vaults (dynamic, user-created)
```
vaults
  id            uuid primary key
  user_id       uuid (references auth.users)
  name          text         -- user-defined: "GSI Application", "Learning Rust"
  description   text         -- optional context for the AI
  vault_prompt  text         -- custom AI instructions (per-vault rules)
  link_types    jsonb        -- which typed relationships allowed in this vault
  fingerprint   jsonb        -- topics/entities (for AI vault-matching)
  created_at    timestamptz
```

### Captures (raw, immutable, source of truth)
```
captures
  id            uuid primary key
  vault_id      uuid
  source_url    text
  source_domain text
  source_type   text         -- article | linkedin | twitter | youtube
  raw_content   text         -- ORIGINAL, never modified
  raw_html      text         -- for debugging / re-processing
  captured_at   timestamptz
```

### Wiki Pages (AI-interpreted, evolving)
```
wiki_pages
  id              uuid primary key
  vault_id        uuid
  entity_type     text       -- concept | tool | person | decision
  title           text
  summary         text
  detailed_notes  text       -- markdown
  confidence      text       -- high | medium | low
  source_count    int        -- how many captures support this page
  last_updated    timestamptz
```

### Citations (claim → source mapping)
```
citations
  id            uuid primary key
  wiki_page_id  uuid
  capture_id    uuid
  claim_text    text         -- what fact this supports
  excerpt       text         -- exact quote from original
```

### Typed Relationships (the knowledge graph)
```
relationships
  id            uuid primary key
  vault_id      uuid
  source_page   uuid
  target_page   uuid
  type          text         -- REQUIRES | CONTRADICTS | BUILDS_ON | EXAMPLES |
                            -- ENABLES | PART_OF | USED_BY | REPLACES
  evidence      text         -- which capture supports this link
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  CHROME EXTENSION                         │
│  (Manifest V3, captures any web page)                    │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTPS + JWT
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  FASTAPI BACKEND                          │
│  /api/capture     scrape + LLM compile + store           │
│  /api/vaults      CRUD on vaults                         │
│  /api/wikis       CRUD on wiki pages                     │
│  /api/search      hybrid search (keyword+vector+graph)   │
│  /api/graph       graph data for visualization           │
│  /api/engage      digest, teach-back                     │
│  /mcp             MCP server endpoint                    │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE                               │
│  Auth (email + Google)                                   │
│  Postgres (vaults, captures, wiki_pages, citations,      │
│            relationships)                                │
│  Vector embeddings (pgvector for semantic search)        │
│  Row-level security (users only see their own data)      │
└──────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    WEB FRONTEND                           │
│  React + Vite + TypeScript + Tailwind                    │
│  Routes: /vaults, /vault/:id, /wiki/:id, /graph,         │
│          /search, /digest                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    MCP SERVER                             │
│  Tools exposed to Claude Code, Cursor, Windsurf:         │
│  - search_vault(vault, query)                            │
│  - get_wiki_page(vault, title)                           │
│  - ask_vault(vault, question)                            │
│  - list_vaults()                                          │
│  - get_related(vault, topic)                             │
│  - save_to_vault(vault, content, source)                 │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack (Locked In)

| Layer | Choice | Reason |
|---|---|---|
| Cloud DB | **Supabase** (Postgres + pgvector) | Free tier, auth, vector search built in |
| Auth | **Supabase Auth** | Email + Google, multi-user ready |
| Backend | **Python + FastAPI** | Best scraping libs, great Anthropic SDK |
| LLM | **Claude (claude-sonnet-4-6)** | Best for structured extraction |
| Frontend | **React 19 + Vite + TS + Tailwind** | Same as wiki-os |
| Graph | **Graphology + Sigma.js** | Same as wiki-os |
| Extension | **Chrome Manifest V3** | Covers Chrome/Edge/Brave |
| Deployment | **Render** | Backend + frontend, simple |
| MCP | **@modelcontextprotocol/sdk** | Official Anthropic standard |

---

## CLAUDE.md vs Our System

**Important distinction:**
Karpathy's CLAUDE.md is a markdown file his local Claude Code reads on every session. We are NOT a local Claude Code app — we're a cloud product. So we don't have a runtime CLAUDE.md. Instead:

- **Default rules** → live in our backend's system prompt (`llm_processor.py`)
- **Per-vault custom rules** → stored in `vaults.vault_prompt` column in DB
- **User edits via UI** → "Vault Settings" page (form input, not a markdown file)

This file (root `CLAUDE.md`) is project documentation for AI assistants
working on the codebase — separate from runtime AI behavior.

---

## Major Features (Locked In)

### Capture
- ✅ One-click Chrome extension
- ✅ Manual URL paste in web UI
- ✅ Multi-content: articles, LinkedIn, Twitter, YouTube (transcripts)
- ✅ Highlight text → save just that quote (future)

### Vault Intelligence
- ✅ AI suggests existing vault match (with confidence %)
- ✅ AI proposes new vault when no match
- ✅ User can override, rename, or pick existing
- ✅ Vault fingerprint gets smarter as vault grows

### Wiki Compilation
- ✅ Entity pages (one page per concept/tool/person)
- ✅ AI updates existing pages instead of duplicating
- ✅ Mandatory citations on every claim
- ✅ Confidence scoring (high if 2+ sources agree)
- ✅ Recency decay (old unconfirmed claims fade)

### Knowledge Graph
- ✅ Typed relationships (REQUIRES, CONTRADICTS, BUILDS_ON, etc.)
- ✅ Sigma.js visualization
- ✅ Per-vault graph (isolated)

### Search & Retrieval
- ✅ Hybrid: keyword (BM25) + semantic (vector) + graph traversal
- ✅ Source-anchored: original always retrievable
- ✅ Query-time synthesis (not stored AI prose)

### Engagement (solves cognitive offloading)
- ✅ Capture-time prompt: "Why did you save this? One sentence."
- ✅ Weekly digest: "Here are 3 ideas from this week — do you remember?"
- ✅ Teach-back mode: explain a concept → AI checks understanding

### MCP Integration (the killer feature)
- ✅ MCP server exposing all vaults to Claude Code, Cursor, etc.
- ✅ Tools: search_vault, get_wiki_page, ask_vault, save_to_vault
- ✅ Knowledge flows back into daily AI work

### User Control
- ✅ Three modes: Smart / Confirm Everything / Full Manual
- ✅ Edit any AI output
- ✅ Move pages between vaults
- ✅ Re-run AI processing
- ✅ Delete anything (originals + wiki pages)

### Vault Health (Future Phase)
- Cluster-based outlier detection: analyze pages within a vault using embeddings,
  find statistical outliers (pages that don't fit the vault's dominant theme cluster)
- Surface: "3 pages in your GSI vault seem off-topic. Want to move them?"
- Suggest: move to existing vault, or create a new vault from the cluster
- Vault fingerprint auto-updates as the vault grows

---

## Branch & Repo

Branch: `claude/llm-wiki-system-W7Lf9`
Repo: `shankara-93/wiki-maker`

---

## Build Plan

### Phase 0 — Done (V1 Foundation)
Flat wiki system: single `wiki_pages` table, no vaults, fixed categories.
Backend + extension + frontend all working.

**Gaps**: no vaults, no source separation, no typed relationships, no confidence scoring,
no engagement loops, no MCP server.

---

### Phase 1 — Source-Anchored Vaults (Current)

**Goal**: Replace the flat model with the real data model. Everything else builds on this.

**DB changes** (`supabase/schema_v2.sql`):
- New `vaults` table (user-created, dynamic)
- New `captures` table (raw content, immutable source of truth)
- Updated `wiki_pages` (add vault_id, entity_type, confidence, source_count, tags as text[])
- New `citations` table (claim → capture mapping)
- New `relationships` table (typed knowledge graph edges)
- pgvector extension + embedding columns on wiki_pages and captures
- All RLS policies updated for vault isolation

**Backend changes**:
- `vaults.py` — CRUD: create, list, get, update, delete vault
- `captures.py` — store raw content (immutable), re-process endpoint
- Updated `main.py` — new routes: `/api/vaults`, `/api/captures`, vault-scoped wikis
- Updated `database.py` — all queries scoped to vault_id
- Updated `llm_processor.py` — two-step: (1) analyze for vault suggestion, (2) compile wiki page

**Frontend changes**:
- New `/vaults` route — vault list, create vault modal
- New `/vault/:id` route — vault dashboard (pages + graph + captures)
- Updated capture flow — vault picker step after capture
- Vault sidebar replaces category sidebar

**Extension changes**:
- Show vault suggestion in popup ("Save to GSI vault? 87% match")
- Let user pick different vault or create new

**Deliverable**: A working vault-scoped wiki. Captures are stored separately from wiki pages. User can create vaults and all captures/pages live in a vault.

---

### Phase 2 — AI Vault Intelligence

**Goal**: AI suggests the right vault, deduplicates entity pages, builds citations.

**Features**:
- `POST /api/vaults/suggest` — given content, return ranked vault suggestions with confidence %
- Entity deduplication: before creating a wiki page, check if an entity page already exists for this topic (fuzzy title match + embedding similarity). If yes, update it. If no, create new.
- Citation extraction: LLM identifies specific claims and maps them to exact quotes from the capture
- Confidence scoring: `high` if 2+ captures agree on the same claim, `medium` if single source, `low` if AI inference only
- Three modes: Smart (one-click confirm), Confirm Everything (review all fields), Full Manual (to Inbox)
- Vault fingerprint auto-update after each new capture

**Deliverable**: Captures flow to the right vault automatically. Pages accumulate evidence over time instead of duplicating. Every claim traces back to a source.

---

### Phase 3 — Knowledge Graph + Typed Relationships

**Goal**: Replace untyped tag-sharing edges with semantic typed relationships.

**Features**:
- LLM extracts typed relationships during wiki compilation: REQUIRES | CONTRADICTS | BUILDS_ON | EXAMPLES | ENABLES | PART_OF | USED_BY | REPLACES
- `GET /api/vault/:id/graph` returns typed edges with evidence text
- Frontend graph updated: edge colors by relationship type, hover shows relationship type + evidence
- Relationship management UI: view, edit, delete relationships
- Per-vault link_types configuration (vault can restrict which types are allowed)

**Deliverable**: The knowledge graph shows how concepts connect semantically, not just by tag overlap.

---

### Phase 4 — Hybrid Search + Chat Interface

**Goal**: Make the vault queryable conversationally.

**Features**:
- `pgvector` embeddings generated for every wiki page and capture on save
- `POST /api/search` — hybrid: keyword (pg FTS) + semantic (cosine similarity) + graph traversal, per vault or global
- `POST /api/vault/:id/chat` — conversational retrieval: user asks question, backend retrieves relevant pages via hybrid search, Claude synthesizes answer with citations
- Chat UI: `/vault/:id/chat` route, message history, citation chips on every answer
- Source display: every answer shows which captures it drew from, with quotes

**Deliverable**: User can ask "What do I know about RAG limitations in my AI vault?" and get a cited, synthesized answer.

---

### Phase 5 — MCP Server + Engagement Loops

**Goal**: Feed the vault back into daily work; keep the user from offloading without learning.

**MCP Server** (`mcp/server.py`):
- Tools: `list_vaults`, `search_vault`, `get_wiki_page`, `get_related`, `ask_vault`, `save_to_vault`
- Runs alongside FastAPI as a separate process
- Auth: same Supabase JWT
- Config: user drops `~/.claude/mcp.json` with server URL + token

**Engagement**:
- Capture-time prompt: "Why did you save this? (optional, one sentence)" — stored with capture
- Weekly digest: `GET /api/engage/digest` — 3 ideas from the week, "do you still remember?"
- Teach-back mode: `POST /api/engage/teach` — user explains a concept → Claude grades it

**Vault Health** (outlier detection):
- `POST /api/vault/:id/health` — cluster pages by embedding similarity, surface outliers
- Returns: pages that don't fit dominant cluster + suggested destination vault or new vault name
- UI: "Vault Health" panel in vault settings

**Deliverable**: The vault feeds knowledge back into Claude Code/Cursor sessions. Weekly prompts prevent pure cognitive offloading. Vault health catches organizational drift.

---

## Current Phase Status

| Phase | Status | Description |
|---|---|---|
| 0 | ✅ Done | V1 flat wiki system |
| 1 | 🔨 Building | Source-anchored vaults |
| 2 | ⬜ Planned | AI vault intelligence |
| 3 | ⬜ Planned | Typed knowledge graph |
| 4 | ⬜ Planned | Hybrid search + chat |
| 5 | ⬜ Planned | MCP + engagement loops |
