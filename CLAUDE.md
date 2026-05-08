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

## Decisions Log (from brainstorming)

These are answers the user gave during the brainstorming session.
Treat them as **locked decisions**, not suggestions. Future AI assistants
working on this codebase should re-read these before changing direction.

### D1 — Biggest fear / failure mode
> "Getting things wrongly placed could become overwhelming, and I'd forget
> where I saved things. Maybe later we can analyze a vault, find clusters,
> detect outliers, and suggest creating a new vault from them. Complex —
> plan for the future."

**Implication**: build cluster-based outlier detection (vault health). Future phase, not now.

### D2 — Solo or team?
> "I am the user. I create my personal vaults. Personal brain. Some other
> user comes and creates their own personal brain — that is private. I
> want that. Team support (10 people pulling captures together to build
> shared vaults) — we are not at that stage. Don't build that now."

**Implication**:
- Multi-user from day one (each user fully private).
- All tables have `user_id` + Row-Level Security.
- No team / shared vault tables. No `vault_members`. No org concept.
- Future: when team support comes, add `vault_members` + relax RLS — but only when explicitly asked.

### D3 — Success metric (3 concrete bars)
The user defined three goals, each tied to a concrete bar:

> 1. "I never lose an article again" → bar: **capture reliability**
> 2. "I build better products using my saved research" → bar: **knowledge retrieval and application**
> 3. "I learn more deeply from what I read" → bar: **engagement loops and teach-back**

**Implication**: each phase must have a *success test* matching one of these bars (see Build Plan).

### D4 — Beta-user patience / build cadence
> "I want features built faster AND well-polished."

**Implication** (the contract):
- **Within a phase**: polish before moving on. No half-finished features.
- **Between phases**: move fast. Don't gold-plate Phase 1 before starting Phase 2.
- **"Daily-usable" is the bar** — not "shippable to strangers."
- **Always polished**: capture flow + data model. They're the spine.
- **OK to be rough**: visual polish, edge-case errors, mobile layout — until the system proves itself.

### D5 — Learn vs use (the real pain)
> "I gathered information for my GSI application. But I never built features
> from what I captured. The data is scattered in LinkedIn saved pages, etc.
> I want to actually utilize that information."

**Implication**: the catastrophic failure of every existing tool is *captured but never used*.
- **Heavy tilt toward USE**: Phase 4 (chat) and Phase 5 (MCP) are critical, not optional.
- **Phase 3 (typed graph) deprioritized** — the graph is a viewing tool; chat + MCP are application tools.
- **Phase 4 swaps with Phase 3** — chat before pretty graph.
- Engagement loops (digest, teach-back) still matter for the "learn" half, but they ride alongside MCP.

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
| Frontend base | **Fork wiki-os UI** (https://github.com/Ansub/wiki-os) | Don't reinvent — clone, then adapt |
| Graph | **Graphology + Sigma.js** | Same as wiki-os |
| Extension | **Chrome Manifest V3** | Covers Chrome/Edge/Brave |
| Deployment | **Render** | Backend + frontend, simple |
| MCP | **@modelcontextprotocol/sdk** | Official Anthropic standard |

---

## Frontend Strategy

**We do NOT build a frontend from scratch.** We fork wiki-os and adapt it.

- **Source**: https://github.com/Ansub/wiki-os (MIT licensed, React + Vite + TS + Tailwind)
- **What wiki-os already has**: dark theme, sidebar navigation, markdown rendering, search, Sigma.js graph view, file-tree-style page list, polished UX
- **What we change**: replace its local-file backend calls with our FastAPI + Supabase backend; add the multi-vault concept (wiki-os is single-vault); add the capture flow (paste URL → vault picker → save); add citations panel on each wiki page
- **What we keep**: visual design, layout, graph component, markdown rendering, dark theme
- **Why**: wiki-os is the user's chosen UI reference. Re-creating its UI from memory in raw Tailwind (as I did in the abandoned V1 frontend) is a waste. Replicate by cloning, not by improvising.

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

> Each phase has a **deliverable** (what gets built) and a **success test**
> (how the user knows it actually solved their problem). The success tests
> map back to D3 (the three goals: never lose / build better / learn deeper).
>
> **Rule (D4)**: each phase must work end-to-end and be daily-usable before
> the next phase starts. No gold-plating between phases.

---

### Phase 0 — Done (V1 Foundation, throwaway)

A simplified flat wiki was coded as a sketch:
- Single `wiki_pages` table, fixed categories, no vaults
- Backend + Chrome extension + freehand Tailwind frontend

**Decision**: backend + schema sketch is useful as a starting skeleton.
The freehand frontend is **thrown away** — replaced by a wiki-os fork.
See "Frontend Strategy" above.

**Gaps it has**: no vaults, no source separation, no typed relationships,
no confidence scoring, no engagement loops, no MCP server.

---

### Phase 1 — Source-Anchored Vaults (Current)

**Goal**: Replace the flat model with the real data model. Everything else builds on this.

**DB changes** (`supabase/schema_v2.sql`):
- New `vaults` table (user-created, dynamic)
- New `captures` table (raw content, immutable source of truth)
- Updated `wiki_pages` (add vault_id, entity_type, confidence, source_count, tags as text[])
- New `citations` table (claim → capture mapping)
- New `relationships` table (typed knowledge graph edges) — table only, no UI yet
- pgvector extension + embedding columns on wiki_pages and captures
- All RLS policies updated for vault isolation (D2: each user fully private)

**Backend changes**:
- `vaults.py` — CRUD: create, list, get, update, delete vault
- `captures.py` (or merged into `database.py`) — store raw content immutably
- Updated `main.py` — new routes: `/api/vaults`, `/api/captures`, vault-scoped wikis
- Updated `database.py` — all queries scoped to vault_id
- Updated `llm_processor.py` — two-step: (1) analyze for vault suggestion, (2) compile wiki page with citations

**Frontend changes** (built on a wiki-os fork):
- Fork wiki-os into `/frontend` and adapt its data layer to call our FastAPI
- New `/vaults` route — vault list, create vault modal
- New `/vault/:id` route — vault dashboard (pages + graph + captures)
- Capture flow: paste URL → AI analyzes → modal "save to which vault?" → save
- Vault sidebar replaces category sidebar

**Extension changes**:
- Show vault suggestion in popup ("Save to GSI vault? 87% match")
- Let user pick different vault or create new

**Deliverable**: A working vault-scoped wiki. Captures stored separately from wiki pages. User can create vaults; all captures/pages live in a vault.

**Success test (maps to D3 goal #1: "never lose an article")**:
> The user captures 10 real articles into 2-3 vaults over a week.
> Zero captures fail. Zero captures get lost or end up in the wrong place
> without the user noticing. The user can find any one of them in <30 seconds.

---

### Phase 2 — AI Vault Intelligence

**Goal**: AI suggests the right vault, deduplicates entity pages, builds citations reliably.

**Features**:
- `POST /api/vaults/suggest` — given content, return ranked vault suggestions with confidence %
- Entity deduplication: before creating a wiki page, check if an entity page already exists for this topic (fuzzy title match + embedding similarity). If yes, update it. If no, create new.
- Citation extraction: LLM identifies specific claims and maps them to exact quotes from the capture
- Confidence scoring: `high` if 2+ captures agree on the same claim, `medium` if single source, `low` if AI inference only
- Three modes: Smart (one-click confirm), Confirm Everything (review all fields), Full Manual (to Inbox)
- Vault fingerprint auto-update after each new capture

**Deliverable**: Captures flow to the right vault automatically. Pages accumulate evidence over time instead of duplicating. Every claim traces back to a source.

**Success test (maps to D3 goal #1 + capture quality)**:
> When the user captures a new article, the AI's top vault suggestion is
> correct ≥80% of the time. When two articles cover the same concept, they
> merge into one page with 2 sources, not two duplicate pages.

---

### Phase 3 — Hybrid Search + Chat Interface
*(swapped earlier with the typed-graph phase per D5 — application beats viewing)*

**Goal**: Make the vault queryable conversationally. This is where the user finally **uses** what they captured.

**Features**:
- `pgvector` embeddings generated for every wiki page and capture on save
- `POST /api/search` — hybrid: keyword (pg FTS) + semantic (cosine similarity) + graph traversal, per vault or global
- `POST /api/vault/:id/chat` — conversational retrieval: user asks question, backend retrieves relevant pages via hybrid search, Claude synthesizes answer with citations
- Chat UI: `/vault/:id/chat` route, message history, citation chips on every answer
- Source display: every answer shows which captures it drew from, with quotes
- Cross-vault chat: optionally query across all vaults at once

**Deliverable**: User can ask "What do I know about RAG limitations in my AI vault?" and get a cited, synthesized answer.

**Success test (maps to D3 goal #2: "build better products from saved research")**:
> The user starts a real project task (e.g. building a GSI feature),
> opens the chat, asks a question, and gets back ≥1 useful insight from
> their saved captures that they actually use in the work.

---

### Phase 4 — Knowledge Graph + Typed Relationships
*(was Phase 3; deprioritized — graph is a viewing tool, useful but not the core fix)*

**Goal**: Replace untyped edges with semantic typed relationships.

**Features**:
- LLM extracts typed relationships during wiki compilation: REQUIRES | CONTRADICTS | BUILDS_ON | EXAMPLES | ENABLES | PART_OF | USED_BY | REPLACES
- `GET /api/vault/:id/graph` returns typed edges with evidence text
- Frontend graph updated: edge colors by relationship type, hover shows relationship type + evidence
- Relationship management UI: view, edit, delete relationships
- Per-vault link_types configuration (vault can restrict which types are allowed)

**Deliverable**: The knowledge graph shows how concepts connect semantically, not just by tag overlap.

**Success test**:
> The user clicks a node in their vault graph and the connections shown
> tell them something they wouldn't have noticed in the flat list view.

---

### Phase 5 — MCP Server + Engagement Loops

**Goal**: Feed the vault back into daily work; keep the user from offloading without learning. **This is the "killer feature" cluster** (D5: solve "captured but never used").

**MCP Server** (`mcp/server.py`):
- Tools: `list_vaults`, `search_vault`, `get_wiki_page`, `get_related`, `ask_vault`, `save_to_vault`
- Runs alongside FastAPI as a separate process (or same process, separate route)
- Auth: same Supabase JWT
- Config: user drops `~/.claude/mcp.json` with server URL + token

**Engagement**:
- Capture-time prompt: "Why did you save this? (optional, one sentence)" — stored with capture
- Weekly digest: `GET /api/engage/digest` — 3 ideas from the week, "do you still remember?"
- Teach-back mode: `POST /api/engage/teach` — user explains a concept → Claude grades it

**Vault Health** (outlier detection — see D1):
- `POST /api/vault/:id/health` — cluster pages by embedding similarity, surface outliers
- Returns: pages that don't fit dominant cluster + suggested destination vault or new vault name
- UI: "Vault Health" panel in vault settings

**Deliverable**: The vault feeds knowledge back into Claude Code/Cursor. Weekly prompts prevent pure cognitive offloading. Vault health catches organizational drift.

**Success test (maps to D3 goals #2 + #3: "use" and "learn")**:
> 1. **Use**: while building something in Claude Code, the agent calls
>    `search_vault` and surfaces a capture from weeks ago that helps the
>    current task. The user sees the citation in the agent's output.
> 2. **Learn**: the user receives a weekly digest, recalls 2/3 of the ideas
>    without re-reading the source. Or completes a teach-back and the AI
>    confirms understanding.

---

## Current Phase Status

| Phase | Status | Description | Success bar |
|---|---|---|---|
| 0 | ✅ Done (sketch, frontend thrown away) | V1 flat wiki, backend + schema kept as skeleton | n/a |
| 1 | 🔨 Building | Source-anchored vaults | "Never lose an article" |
| 2 | ⬜ Planned | AI vault intelligence | Top vault suggestion correct ≥80% |
| 3 | ⬜ Planned (was 4) | Hybrid search + chat | Query saved knowledge during real work |
| 4 | ⬜ Planned (was 3) | Typed knowledge graph | Connections reveal non-obvious links |
| 5 | ⬜ Planned | MCP + engagement + vault health | MCP cited in Claude Code; weekly digest works |
