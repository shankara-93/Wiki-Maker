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
