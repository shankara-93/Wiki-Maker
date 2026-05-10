# LLM Wiki Maker — Project Index

> This file is a short index. Full details live in `docs/`. Read the
> relevant doc before touching code in that area.

---

## The Problem

The user saves articles, LinkedIn posts, Twitter threads, YouTube videos.
Later they forget where they saved them and never apply the knowledge to
real projects. **Goal**: Capture → Compile → Retrieve → Feed back into work.

---

## Three Non-Negotiable Principles

1. **Originals Are Sacred** — raw captures are immutable source of truth; wiki pages are AI interpretations, explicitly labeled.
2. **AI Suggests, User Decides** — every AI action is a suggestion; user has full manual override.
3. **Vaults Are Dynamic** — created on demand per project/topic; no hardcoded categories.

---

## Branch & Repo

- **Repo**: `shankara-93/wiki-maker`
- **Branch**: `claude/llm-wiki-system-W7Lf9`

---

## Current Phase: Phase 1 — Source-Anchored Vaults 🔨

See `docs/build-plan.md` for full details.

**What's done**:
- `supabase/schema_v2.sql` — new tables (vaults, captures, wiki_pages, citations, relationships)
- `backend/` — vault CRUD, capture endpoints, LLM two-step pipeline
- `frontend/` — wiki-os fork cloned in, server stripped (Chunk 1)

**What's next** (in order):
1. Chunk 2: rewire frontend api.ts to our FastAPI + add Supabase auth
2. Chunk 3: add multi-vault UI to wiki-os (currently single-vault)
3. Chunk 4: add capture flow + update Chrome extension
4. Run `schema_v2.sql` in Supabase, test end-to-end

---

## Docs Index

| File | Read when you need to know about |
|---|---|
| `docs/decisions.md` | Why decisions were made (D1–D5 brainstorming answers) |
| `docs/build-plan.md` | What each phase builds + success test per phase |
| `docs/architecture.md` | Data model, system architecture, tech stack, frontend strategy |
| `docs/features.md` | Full feature list by category |
| `docs/inspirations.md` | Karpathy, wiki-os, critical articles, comparison table |

---

## Key Rules for AI Assistants Working on This Codebase

1. **Read `docs/decisions.md` first** before suggesting any architectural changes.
2. **Frontend = wiki-os fork.** Never rewrite it from scratch in freehand Tailwind.
3. **Multi-user, no team.** Every table has `user_id` + RLS. No shared vault tables.
4. **Two-table capture model.** `captures` = raw + immutable. `wiki_pages` = AI interpretation. Never merge them.
5. **Phase order matters.** Chat (Phase 3) before typed graph (Phase 4) — see `docs/decisions.md` D5.
