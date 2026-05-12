# Architecture, Data Model & Tech Stack

---

## Data Model

### Vaults (dynamic, user-created)
```
vaults
  id            uuid primary key
  user_id       uuid references auth.users
  name          text            -- "GSI Application", "Learning Rust"
  description   text
  vault_prompt  text            -- custom AI instructions per vault
  link_types    jsonb           -- allowed relationship types
  fingerprint   jsonb           -- {topics, entities, keywords} for AI matching
  page_count       int
  capture_count    int
  status           text          -- active | archived | deleted (see D11)
  last_activity_at timestamptz   -- updated on every new capture
  created_at       timestamptz
  updated_at       timestamptz
```

### Captures (raw, immutable — source of truth)
```
captures
  id            uuid primary key
  user_id       uuid
  vault_id      uuid
  source_url    text
  source_domain text
  source_type   text            -- article | linkedin | twitter | youtube
  title         text            -- original page title
  raw_content   text            -- ORIGINAL, never modified
  raw_html      text            -- full outerHTML (extension only)
  why_saved     text            -- capture-time "why did you save this?"
  content_hash  text            -- SHA256 of raw_content (for duplicate detection)
  media_items   jsonb           -- [{type, url, description}] images + video transcript
  embedding     vector(1536)
  captured_at   timestamptz
```

### Wiki Pages (AI-interpreted, evolving)
```
wiki_pages
  id              uuid primary key
  user_id         uuid
  vault_id        uuid
  entity_type     text          -- concept | tool | person | decision
  title           text
  summary         text
  key_insights    jsonb
  detailed_notes  text          -- markdown
  code_examples   jsonb
  tags            text[]
  confidence      text          -- high | medium | low
  source_count    int           -- how many captures support this page
  embedding       vector(1536)
  created_at      timestamptz
  updated_at      timestamptz
```

### Citations (claim → capture mapping)
```
citations
  id            uuid primary key
  wiki_page_id  uuid
  capture_id    uuid
  claim_text    text            -- the specific claim being supported
  excerpt       text            -- exact quote from original capture
```

### Relationships (typed knowledge graph edges)
```
relationships
  id            uuid primary key
  vault_id      uuid
  source_page   uuid
  target_page   uuid
  type          text            -- REQUIRES | CONTRADICTS | BUILDS_ON | EXAMPLES |
                                -- ENABLES | PART_OF | USED_BY | REPLACES
  evidence      text            -- excerpt from capture supporting this link
  capture_id    uuid
  created_at    timestamptz
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  CHROME EXTENSION                         │
│  Manifest V3 — captures any web page                     │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTPS + Supabase JWT
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  FASTAPI BACKEND                          │
│  POST /api/capture/suggest   scrape + suggest vault      │
│  POST /api/capture/url       scrape + compile + store    │
│  POST /api/capture/html      extension HTML + compile    │
│  GET/POST /api/vaults        vault CRUD                  │
│  GET /api/vaults/:id/pages   pages in vault              │
│  GET /api/vaults/:id/graph   typed graph data            │
│  GET /api/wikis/:id          single wiki page + citations│
│  GET /api/search             hybrid search               │
│  POST /api/vaults/:id/chat   conversational retrieval    │
│  /mcp                        MCP server endpoint         │
└────────────────────┬─────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE                               │
│  Auth (email + Google)                                   │
│  Postgres (vaults, captures, wiki_pages, citations,      │
│            relationships)                                │
│  pgvector (semantic search embeddings)                   │
│  Row-Level Security (users only see their own data)      │
└──────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  WEB FRONTEND (wiki-os fork)              │
│  React 19 + Vite + TypeScript + Tailwind                 │
│  Routes: / (vaults), /vault/:id, /wiki/:id,              │
│          /vault/:id/graph, /vault/:id/chat, /search      │
└──────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    MCP SERVER                             │
│  list_vaults, search_vault, get_wiki_page,               │
│  get_related, ask_vault, save_to_vault                   │
└──────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Cloud DB | **Supabase** (Postgres + pgvector) | Free tier, auth, vector search built in |
| Auth | **Supabase Auth** | Email + Google, multi-user ready |
| Backend | **Python + FastAPI** | Best scraping libs, great Anthropic SDK |
| LLM | **Claude (claude-sonnet-4-6)** | Best for structured extraction |
| Frontend | **wiki-os fork** (React 19 + Vite + TS + Tailwind) | Don't reinvent — clone, then adapt |
| Graph | **Graphology + Sigma.js** | Same as wiki-os |
| Extension | **Chrome Manifest V3** | Covers Chrome/Edge/Brave |
| Deployment | **Render** | Backend + frontend, simple |
| MCP | **@modelcontextprotocol/sdk** | Official Anthropic standard |

---

## Frontend Strategy

**We do NOT build a frontend from scratch.** We fork wiki-os and adapt it.

- **Source**: https://github.com/Ansub/wiki-os (MIT licensed)
- **What wiki-os already has**: dark theme, sidebar navigation, markdown rendering,
  search, Sigma.js graph view, polished UX, Tailwind v4
- **What we change**: replace its local-file/Fastify backend calls with our
  FastAPI + Supabase; add multi-vault concept; add the capture flow;
  add citations panel on wiki pages; add auth screen
- **What we keep**: visual design, layout, graph component, markdown, dark theme
- **Never**: re-create wiki-os UI from memory in freehand Tailwind

---

## CLAUDE.md vs Our Runtime System

Karpathy's CLAUDE.md is read by local Claude Code at runtime. We are a cloud product.

| Purpose | Where it lives |
|---|---|
| Default AI processing rules | `backend/llm_processor.py` system prompt |
| Per-vault custom rules | `vaults.vault_prompt` column in DB |
| User edits vault rules | "Vault Settings" page in UI |
| Project documentation for devs | This repo's `docs/` folder + `CLAUDE.md` |
