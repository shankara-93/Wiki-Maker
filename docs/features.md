# Feature List

All features planned for LLM Wiki Maker. See `docs/build-plan.md` for which phase each lands in.

---

## Capture
- One-click Chrome extension (any web page)
- Manual URL paste in web UI
- Multi-content: articles, LinkedIn posts, Twitter threads, YouTube (transcripts)
- Extension sends full rendered HTML for JS-heavy pages (LinkedIn, Twitter, SPAs)
- Capture-time prompt: "Why did you save this?" (one sentence, stored with capture)
- Highlight text → save just that quote (future)

## Vault Intelligence
- AI suggests existing vault match with confidence % ("GSI Application — 87% match")
- AI proposes new vault name + description when no existing vault fits
- User can override, rename, or pick a different vault at any time
- Vault fingerprint (topics/entities/keywords) auto-updates after each new capture
- Three capture modes:
  - **Smart** (default): AI suggests vault + fields, user confirms with one click
  - **Confirm Everything**: AI processes → user reviews every field → save
  - **Full Manual**: capture goes to Inbox, user writes wiki and files manually

## Wiki Compilation
- Entity pages: one page per concept / tool / person / decision (not one per article)
- AI deduplication: before creating, check if an entity page already exists (fuzzy title + embedding similarity). If yes, update it; if no, create new.
- Mandatory citations on every AI claim (exact quote from capture → claim in wiki page)
- Confidence scoring: `high` if 2+ captures agree, `medium` if single source, `low` if AI inference only
- Source count visible on each page ("3 sources")
- Re-run AI processing on any page

## Knowledge Graph
- Typed relationships extracted by LLM during compilation:
  REQUIRES | CONTRADICTS | BUILDS_ON | EXAMPLES | ENABLES | PART_OF | USED_BY | REPLACES
- Sigma.js graph visualization per vault
- Edge colors by relationship type; hover shows type + evidence excerpt
- Per-vault link_types configuration (vault can restrict allowed relationship types)
- Relationship management UI: view, edit, delete

## Search & Retrieval
- Hybrid search: keyword (pg full-text search) + semantic (pgvector cosine similarity) + graph traversal
- Per-vault search or global across all vaults
- Tag filter
- Source always retrievable: original capture never deleted when wiki page is edited

## Chat Interface (Phase 3)
- Conversational retrieval: ask "What do I know about RAG limitations?" in natural language
- Backend retrieves via hybrid search; Claude synthesizes answer with citations
- Every answer shows which captures it drew from, with exact quotes
- Message history within a session
- Cross-vault chat (optional: query all vaults at once)

## MCP Integration (Phase 5 — the killer feature)
- MCP server alongside FastAPI
- Tools exposed to Claude Code, Cursor, Windsurf:
  - `list_vaults()` — show all user vaults
  - `search_vault(vault, query)` — semantic search in a vault
  - `get_wiki_page(vault, title)` — fetch a specific page
  - `get_related(vault, topic)` — find related pages
  - `ask_vault(vault, question)` — conversational retrieval
  - `save_to_vault(vault, content, source)` — capture from inside Claude Code
- Auth: same Supabase JWT
- Config: `~/.claude/mcp.json` with server URL + token

## Engagement (solves cognitive offloading)
- Capture-time: "Why did you save this?" — stored, surfaces in digest
- Weekly digest: 3 ideas from this week — "do you still remember?"
- Teach-back mode: user explains a concept → Claude grades understanding
- All engagement optional (can be turned off per vault)

## User Control
- Edit any AI-generated field on a wiki page
- Move pages between vaults
- Re-run AI processing on any capture
- Delete captures (removes from vault; wiki page orphaned but kept)
- Delete wiki pages (citations removed; original capture kept)
- Delete entire vault (cascades to all captures + pages)

## Vault Health (Future — see D1 in docs/decisions.md)
- Cluster pages by embedding similarity within a vault
- Surface statistical outliers: pages that don't fit the dominant theme
- "3 pages in your GSI vault seem off-topic — want to move them?"
- Suggest: move to existing vault, or create a new vault from the cluster
- Vault fingerprint auto-updates as vault grows
