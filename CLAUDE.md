# LLM Wiki — Project Context

> This file is the single source of truth for this project.
> Read this before touching any code. Update it whenever decisions are made.

---

## The Problem Being Solved

The user finds valuable articles on LinkedIn, Twitter, Medium, and blogs.
Later they forget the URL and where they found the content.
They lose that knowledge permanently.

**Goal**: Capture → Convert → Store → Retrieve. Never lose a useful article again.

---

## Inspiration: wiki-os by Ansub

Repository: https://github.com/Ansub/wiki-os
Stars: 223 | Forks: 25
Described as "UI Layer for Karpathy's LLM Wiki"

### What wiki-os does (understand before building)
- Takes a local **Obsidian vault** (folder of `.md` files) as input
- Provides a web UI to browse, search, and visualize those notes
- Local-first: no cloud, everything runs on your machine
- Real-time file watching: edits to vault are immediately reflected

### wiki-os Tech Stack
- Frontend: React 19 + Vite 7 + TypeScript + Tailwind CSS 4
- Backend: Fastify 5 (Node.js) + SQLite (better-sqlite3)
- DB Schema: `pages`, `backlinks`, `categories`, `pages_fts` (full-text search)
- Graph: Graphology + Sigma.js (Force-Atlas2 layout)
- Containerization: Docker multi-stage builds

### wiki-os Key Features
- Full-text search (SQLite FTS)
- Backlink detection (which pages reference each other)
- Person pages (bio detection heuristics)
- Graph visualization of note connections
- Category auto-detection (frontmatter → folder path → word frequency)
- Stats dashboard
- File system watcher with 350ms debounce + 15min periodic reconciliation

---

## Our Project: LLM Wiki Maker

### Core Differences from wiki-os
| wiki-os | LLM Wiki Maker |
|---|---|
| Reads from local Obsidian vault | Captures from ANY web page |
| Local-first, no cloud | Cloud-first, no local storage |
| Manual note-writing | LLM auto-converts content to wiki |
| File system sync | Browser extension triggers capture |
| You write the notes | AI writes the notes |

### The Flow
```
User sees article on LinkedIn/Twitter/Medium/Blog
  → Clicks browser extension button
  → Extension sends page HTML to backend
  → Backend scrapes clean content
  → Claude LLM converts to structured wiki page
  → Stored in cloud database
  → Searchable via web UI (wiki-os style)
```

---

## Architecture (To Be Finalized)

### Components Needed
1. **Browser Extension** (Chrome/Firefox) — one-click capture
2. **Backend API** — scrape + LLM process + store
3. **LLM Integration** — Claude API converts raw content → structured wiki
4. **Cloud Storage** — database (NOT local)
5. **Web Frontend** — browse/search the wiki vault

### LLM Wiki Page Structure (per captured article)
```json
{
  "title": "Descriptive, memorable title",
  "category": "AI & ML | SaaS | Programming | etc.",
  "tags": ["tag1", "tag2"],
  "summary": "2-3 sentence TL;DR",
  "key_insights": ["Actionable insight 1", "..."],
  "detailed_notes": "Full markdown notes",
  "code_examples": [{"language": "python", "code": "..."}],
  "source_url": "original URL always preserved",
  "source_domain": "linkedin.com",
  "captured_at": "2026-05-08T..."
}
```

### Categories (auto-assigned by LLM)
- AI & Machine Learning
- Software Engineering
- Web Development
- Product & SaaS
- Data Science
- DevOps & Infrastructure
- Business & Startups
- Security & Privacy
- Tools & Productivity
- Research & Papers
- Career & Growth
- Other

---

## Decisions Made

| Decision | Choice | Reason |
|---|---|---|
| Cloud DB | **Supabase** (PostgreSQL) | Free tier, built-in auth, great Python SDK |
| Auth | **Multi-user** (Supabase Auth) | Email + Google login |
| Backend | **Python + FastAPI** | Best scraping libs, great Anthropic SDK |
| Graph view | **Yes** | Visual knowledge graph like wiki-os |
| Browser extension | **Chrome only** (Manifest V3) | Covers Chrome, Edge, Brave |
| Deployment | **Render** | Simple git-push, great FastAPI support |

---

## Dev Branch

Branch: `claude/llm-wiki-system-W7Lf9`
Repo: `shankara-93/wiki-maker`

---

## Full File Structure

```
Wiki-Maker/
├── CLAUDE.md                    ← always read first
├── README.md
├── supabase/
│   └── schema.sql               ← run this in Supabase SQL editor
├── backend/                     ← Python + FastAPI (deployed on Render)
│   ├── main.py                  ← FastAPI app + all routes
│   ├── database.py              ← Supabase client + table ops
│   ├── scraper.py               ← web scraping (trafilatura + BS4)
│   ├── llm_processor.py         ← Claude API: content → structured wiki
│   ├── auth.py                  ← Supabase JWT verification
│   ├── requirements.txt
│   ├── .env.example
│   └── render.yaml              ← Render deployment config
├── frontend/                    ← React + Vite + TypeScript + Tailwind
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── router.tsx
│       ├── api.ts               ← all backend API calls
│       ├── supabase.ts          ← Supabase client (auth)
│       ├── components/
│       │   ├── Navbar.tsx
│       │   ├── SearchBox.tsx
│       │   ├── WikiCard.tsx
│       │   ├── CategorySidebar.tsx
│       │   └── GraphView.tsx    ← Sigma.js graph
│       └── routes/
│           ├── home-route.tsx
│           ├── wiki-route.tsx
│           ├── graph-route.tsx
│           └── search-route.tsx
└── extension/                   ← Chrome Manifest V3
    ├── manifest.json
    ├── popup.html
    ├── popup.js
    ├── background.js
    ├── content.js
    └── icons/
        ├── icon16.png
        ├── icon48.png
        └── icon128.png
```

## Supabase Schema (wiki_pages table)

```sql
create table wiki_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  source_url text not null,
  source_domain text,
  category text default 'Other',
  tags jsonb default '[]',
  summary text,
  key_insights jsonb default '[]',
  detailed_notes text,
  code_examples jsonb default '[]',
  wiki_markdown text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security: users only see their own pages
alter table wiki_pages enable row level security;
create policy "Users see own pages" on wiki_pages
  for all using (auth.uid() = user_id);
```

## Key Implementation Notes

- Extension sends full page `document.documentElement.outerHTML` to backend
  (handles JS-rendered pages that server-side scraping cannot access)
- Backend also supports URL-only capture (server scrapes it)
- LLM prompt returns JSON only — no markdown fences
- Graph nodes = wiki pages, edges = shared tags or categories
- Auth: Supabase JWT in Authorization header on all API calls
- Extension stores JWT in `chrome.storage.local`
