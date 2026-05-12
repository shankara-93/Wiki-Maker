# Decisions Log — Locked Brainstorming Answers

> These are answers the user gave during the brainstorming session.
> Treat them as **locked decisions**. Future AI assistants must re-read
> these before changing direction or suggesting alternatives.

---

## D1 — Biggest Fear / Failure Mode

> "Getting things wrongly placed could become overwhelming, and I'd forget
> where I saved things. Maybe later we can analyze a vault, find clusters,
> detect outliers, and suggest creating a new vault from them. Complex —
> plan for the future."

**Implication**: build cluster-based outlier detection (vault health). Future phase, not now.
See `docs/features.md` → Vault Health section.

---

## D2 — Solo or Team?

> "I am the user. I create my personal vaults. Personal brain. Some other
> user comes and creates their own personal brain — that is private. I
> want that. Team support (10 people pulling captures together to build
> shared vaults) — we are not at that stage. Don't build that now."

**Implication**:
- Multi-user from day one (each user fully private).
- All tables have `user_id` + Row-Level Security.
- No team / shared vault tables. No `vault_members`. No org concept.
- Future: when team support comes, add `vault_members` + relax RLS — but only when explicitly asked.

---

## D3 — Success Metrics (3 Concrete Bars)

> 1. "I never lose an article again" → bar: **capture reliability**
> 2. "I build better products using my saved research" → bar: **knowledge retrieval and application**
> 3. "I learn more deeply from what I read" → bar: **engagement loops and teach-back**

**Implication**: each phase has a success test tied to one of these bars.
See `docs/build-plan.md` for success test per phase.

---

## D4 — Beta-User Patience / Build Cadence

> "I want features built faster AND well-polished."

**The contract**:
- **Within a phase**: polish before moving on. No half-finished features.
- **Between phases**: move fast. Don't gold-plate Phase 1 before starting Phase 2.
- **"Daily-usable" is the bar** — not "shippable to strangers."
- **Always polished**: capture flow + data model. They're the spine.
- **OK to be rough**: visual polish, edge-case errors, mobile layout — until the system proves itself.

---

## D5 — Learn vs Use (The Real Pain)

> "I gathered information for my GSI application. But I never built features
> from what I captured. The data is scattered in LinkedIn saved pages, etc.
> I want to actually utilize that information."

**Implication**: the catastrophic failure of every existing tool is *captured but never used*.
- **Heavy tilt toward USE**: Phase 3 (chat) and Phase 5 (MCP) are critical, not optional.
- **Phase 4 (typed graph) deprioritized** — graph is a viewing tool; chat + MCP are application tools.
- **Chat before graph** — Phase 3 = hybrid search + chat; Phase 4 = typed knowledge graph.
- Engagement loops (digest, teach-back) matter for the "learn" half alongside MCP.

---

## D6 — Duplicate URL Handling (same URL captured again)

**Rule**: Always allow re-capture. Never block. Create a new immutable capture (timestamped snapshot). Old capture is never modified — originals are sacred.

**Processing pipeline (cheapest first, stop as soon as condition met)**:
1. **Hash check** — identical content? Stop. Update timestamp only. Zero LLM cost.
2. **Embedding similarity** — similarity > 0.92? Minor edit (typos, formatting). Skip LLM. Zero cost.
3. **Difflib delta** — extract only the changed/added sections. Send ONLY the diff to Claude (not the full document). Update wiki page with new insights.

**UI behaviour**: when user re-pastes a known URL, show a gentle notice —
*"You captured this on Jan 3. Re-capturing will update your wiki page with any new content."*
Not a block. Just awareness.

**Why**: articles get updated over time. Re-capturing creates a version history.
The wiki page evolves as the source evolves. `source_count` increments, `confidence` may rise.

---

## D7 — Entity Deduplication (different URL, same concept)

**Problem**: user captures 4 articles about "RAG optimization" from 4 different sources.
Without deduplication → 4 duplicate wiki pages, noise, confusion.
User cannot remember what they already captured.

**Rule**: before creating a new wiki page, check if an entity page for this concept
already exists in the vault. If yes, update it. If no, create new.

**Processing pipeline**:
1. Save the new capture first (always — originals are sacred).
2. Generate embedding for the new capture.
3. Compare against ALL existing wiki page embeddings in the vault via pgvector cosine similarity.
4. Similarity > **0.82** → same entity → add capture as new source, update wiki page with any new insights, increment `source_count`, raise `confidence` if applicable.
5. Similarity < 0.82 → new entity → create new wiki page.

**Similarity threshold**: starts at 0.82, configurable per vault.
- Tighter threshold (e.g. 0.88) for focused project vaults (GSI Application).
- Looser threshold (e.g. 0.75) for broad topic vaults (AI Research).

**Result**: 4 RAG articles → 1 entity page, `source_count: 4`, `confidence: high`.
User never sees duplicates. System merges silently.

---

## D8 — Deduplication Comparison Method

**Chosen method: Embedding similarity (pgvector cosine similarity)**

Rejected alternatives:
- **Programmatic / text diff (difflib, BM25, fuzzy string)** — compares words, not meaning.
  "RAG optimization techniques" vs "Retrieval Augmented Generation best practices" = low text
  similarity but same concept. Misses most real duplicates from different sources. ❌
- **LLM comparison (send both to Claude)** — most accurate but does not scale.
  200 pages in vault × 1 LLM call each = 200 API calls per capture. Too expensive. ❌
- **Embeddings** — captures semantic meaning, not just words. One embedding per capture
  (generated once, cheap). Compare new capture against all pages in milliseconds via pgvector. ✅

**Full deduplication order (cheapest → most expensive, stop early)**:
```
Hash check → same content? Stop (free)
     ↓
Embedding similarity → same concept? Merge (cheap, one-time embedding cost)
     ↓
Difflib delta → what specifically changed? Feed only diff to LLM (reduces tokens ~90%)
     ↓
LLM → only if user manually requests a re-review (rare)
```

---

## D9 — Media Handling (images and video in captured pages)

**Problem**: trafilatura extracts text only. Images (diagrams, charts, code screenshots)
and videos (YouTube, LinkedIn, Twitter) are lost during capture.

**Images — three categories**:

| Type | Examples | Handling |
|---|---|---|
| Decorative | Stock photos, headshots | Ignore — no information value |
| Meaningful | Architecture diagrams, charts, infographics | Claude Vision — send image URL to Claude, store description in capture |
| Code screenshots | Code rendered as image | Claude Vision — Claude extracts the code text |

Image URLs stored in `captures.media_items` (jsonb). Descriptions added at capture time.

**Video**:

| Type | Handling |
|---|---|
| YouTube (standalone page or embedded) | YouTube transcript/subtitle API — free, no key needed for most videos. Transcript treated as article text. |
| LinkedIn video posts | No public API. Capture surrounding text + post caption only. |
| Twitter/X video | Same — caption + thread text only. |
| Other embedded video | Ignore for now. |

**Phased rollout**:
- **Phase 1**: extract YouTube transcript when URL is a YouTube page. Store image URLs only (no vision yet).
- **Phase 2**: add Claude Vision for meaningful images (architecture diagrams, charts, code screenshots).
- **Not in scope**: downloading video files, Whisper transcription — too complex, too much storage.

---

## D10 — First-Time User / Zero Vault State

**Problem**: new user has no vaults. Capture bar works but `/api/capture/suggest` has nothing
to compare against. Flow would break or return empty suggestions.

**Rule**: when user has zero vaults, AI analyses the captured content and proposes a vault name
+ description. User sees an editable form pre-filled by AI — they can change the name before
confirming. Vault is created and capture is saved in one single step.

**Flow**:
```
User pastes first URL (no vaults exist)
         ↓
AI analyses content → proposes vault name + description
         ↓
UI shows: "Create your first vault?"
          [GSI Application        ]  ← editable, pre-filled by AI
          [Research for GSI project]  ← editable
         ↓
User edits if needed → clicks "Create & Save"
         ↓
Vault created + capture saved in one step
```

**Why (b) not (a) or (c)**:
- (a) Force vault creation first → friction, dead state for new users
- (c) Default Inbox vault → adds a concept (Inbox) that conflicts with "vaults are dynamic"
- (b) AI proposes, user confirms with edit option → zero friction, consistent with "AI suggests, user decides"

---

## D11 — Vault Lifecycle (Archive vs Delete)

**Problem**: projects end. Vaults accumulate. User doesn't want to lose old knowledge
but doesn't want old vaults cluttering the active list.

**Three vault states**:

| State | Description | How to get there |
|---|---|---|
| **Active** | Normal. Captures can be added. Shown in vault list. | Default on creation |
| **Archived** | Read-only. Hidden from main list. Still searchable + MCP-accessible. | Manual or auto (inactivity) |
| **Deleted** | Permanent. Everything gone. No recovery. | Manual only, double confirmation |

**Auto-archive trigger**:
- No new captures added for **90 days** (configurable per vault)
- System surfaces prompt: *"GSI Application hasn't been updated in 90 days. Archive it?"*
- User confirms → archived. User dismisses → reminder again in 30 days.

**What "Archived" means in practice**:
- Hidden from vault list by default
- "Show archived vaults" toggle to surface them
- Still fully searchable (global search + MCP)
- Can un-archive anytime (project restarts)
- Cannot add new captures while archived
- Wiki pages are read-only

**Delete rules**:
- Requires double confirmation: *"This will permanently delete X captures and Y pages. Type the vault name to confirm."*
- No soft delete, no recovery after confirmation
- Cascade: vault → captures → wiki_pages → citations → relationships all deleted

**Schema implication**: add `status` column to `vaults` table:
```
status  text not null default 'active'  -- active | archived | deleted
last_activity_at  timestamptz           -- updated on every new capture
```
