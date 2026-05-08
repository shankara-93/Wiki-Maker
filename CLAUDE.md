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

---

## Branch & Repo

Branch: `claude/llm-wiki-system-W7Lf9`
Repo: `shankara-93/wiki-maker`

---

## What's Built So Far (Phase 0)

A simplified V1 was already coded as a starting point:
- Backend: FastAPI + Supabase + Claude API + scraping
- Extension: Chrome Manifest V3 with one-click capture
- Frontend: React + Tailwind + auth + browse + search + graph

**This V1 does NOT yet have:**
- Dynamic vaults (currently flat — single category per page)
- Source-anchored architecture (raw + wiki separation)
- Typed relationships (currently just shared tags)
- Confidence/recency/lifecycle
- Engagement loops
- MCP server

These are the gaps to close in the next phases.

---

## Next Step

Move from brainstorming to **full feature list + phased build plan**.
Decide what V2 looks like and build it iteratively without losing what
already works in V1.
