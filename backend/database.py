import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        _client = create_client(url, key)
    return _client


# ── Captures ──────────────────────────────────────────────────────────────────

def insert_capture(user_id: str, vault_id: str, data: dict) -> dict:
    sb = get_supabase()
    row = {
        "user_id": user_id,
        "vault_id": vault_id,
        "source_url": data["url"],
        "source_domain": data.get("domain", ""),
        "source_type": data.get("source_type", "article"),
        "title": data.get("title", ""),
        "raw_content": data["content"],
        "raw_html": data.get("html", ""),
    }
    result = sb.table("captures").insert(row).execute()
    return result.data[0]


def get_capture(capture_id: str, user_id: str) -> dict | None:
    sb = get_supabase()
    result = (
        sb.table("captures")
        .select("*")
        .eq("id", capture_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    return result.data


def list_captures(user_id: str, vault_id: str, page: int = 1, per_page: int = 20) -> dict:
    sb = get_supabase()
    offset = (page - 1) * per_page
    result = (
        sb.table("captures")
        .select("id,source_url,source_domain,source_type,title,why_saved,captured_at", count="exact")
        .eq("user_id", user_id)
        .eq("vault_id", vault_id)
        .order("captured_at", desc=True)
        .range(offset, offset + per_page - 1)
        .execute()
    )
    return {
        "total": result.count or 0,
        "page": page,
        "per_page": per_page,
        "captures": result.data or [],
    }


def delete_capture(capture_id: str, user_id: str) -> bool:
    sb = get_supabase()
    result = (
        sb.table("captures")
        .delete()
        .eq("id", capture_id)
        .eq("user_id", user_id)
        .execute()
    )
    return len(result.data) > 0


# ── Wiki Pages ────────────────────────────────────────────────────────────────

def insert_wiki_page(user_id: str, vault_id: str, data: dict) -> dict:
    sb = get_supabase()
    row = {
        "user_id": user_id,
        "vault_id": vault_id,
        "entity_type": data.get("entity_type", "concept"),
        "title": data["title"],
        "summary": data.get("summary", ""),
        "key_insights": data.get("key_insights", []),
        "detailed_notes": data.get("detailed_notes", ""),
        "code_examples": data.get("code_examples", []),
        "tags": data.get("tags", []),
        "confidence": data.get("confidence", "low"),
        "source_count": 1,
    }
    result = sb.table("wiki_pages").insert(row).execute()
    return result.data[0]


def get_wiki_page(wiki_id: str, user_id: str) -> dict | None:
    sb = get_supabase()
    result = (
        sb.table("wiki_pages")
        .select("*, citations(*)")
        .eq("id", wiki_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    return result.data


def list_wiki_pages(
    user_id: str,
    vault_id: str | None = None,
    tag: str | None = None,
    search: str | None = None,
    entity_type: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    sb = get_supabase()
    query = sb.table("wiki_pages").select("*", count="exact").eq("user_id", user_id)

    if vault_id:
        query = query.eq("vault_id", vault_id)
    if entity_type:
        query = query.eq("entity_type", entity_type)
    if tag:
        query = query.contains("tags", [tag])
    if search:
        query = query.or_(
            f"title.ilike.%{search}%,summary.ilike.%{search}%,detailed_notes.ilike.%{search}%"
        )

    offset = (page - 1) * per_page
    result = query.order("updated_at", desc=True).range(offset, offset + per_page - 1).execute()
    return {
        "total": result.count or 0,
        "page": page,
        "per_page": per_page,
        "pages": result.data or [],
    }


def update_wiki_page(wiki_id: str, user_id: str, updates: dict) -> dict | None:
    sb = get_supabase()
    allowed = {
        "title", "summary", "key_insights", "detailed_notes",
        "code_examples", "tags", "entity_type", "confidence", "source_count",
    }
    clean = {k: v for k, v in updates.items() if k in allowed}
    if not clean:
        return get_wiki_page(wiki_id, user_id)
    result = (
        sb.table("wiki_pages")
        .update(clean)
        .eq("id", wiki_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0] if result.data else None


def delete_wiki_page(wiki_id: str, user_id: str) -> bool:
    sb = get_supabase()
    result = (
        sb.table("wiki_pages")
        .delete()
        .eq("id", wiki_id)
        .eq("user_id", user_id)
        .execute()
    )
    return len(result.data) > 0


# ── Citations ─────────────────────────────────────────────────────────────────

def insert_citations(wiki_page_id: str, capture_id: str, citations: list[dict]) -> list[dict]:
    """citations: list of {claim_text, excerpt}"""
    sb = get_supabase()
    if not citations:
        return []
    rows = [
        {
            "wiki_page_id": wiki_page_id,
            "capture_id": capture_id,
            "claim_text": c["claim_text"],
            "excerpt": c["excerpt"],
        }
        for c in citations
    ]
    result = sb.table("citations").insert(rows).execute()
    return result.data or []


# ── Relationships ─────────────────────────────────────────────────────────────

def insert_relationships(vault_id: str, relationships: list[dict]) -> list[dict]:
    """relationships: list of {source_page, target_page, type, evidence, capture_id?}"""
    sb = get_supabase()
    if not relationships:
        return []
    rows = [
        {
            "vault_id": vault_id,
            "source_page": r["source_page"],
            "target_page": r["target_page"],
            "type": r["type"],
            "evidence": r.get("evidence", ""),
            "capture_id": r.get("capture_id"),
        }
        for r in relationships
    ]
    result = sb.table("relationships").upsert(rows, on_conflict="source_page,target_page,type").execute()
    return result.data or []


def get_graph_data(user_id: str, vault_id: str) -> dict:
    """Return typed graph for a vault: nodes = wiki pages, edges = typed relationships."""
    sb = get_supabase()

    pages_result = (
        sb.table("wiki_pages")
        .select("id,title,entity_type,tags,confidence,source_count")
        .eq("vault_id", vault_id)
        .eq("user_id", user_id)
        .execute()
    )
    pages = pages_result.data or []

    edges_result = (
        sb.table("relationships")
        .select("source_page,target_page,type,evidence")
        .eq("vault_id", vault_id)
        .execute()
    )
    edges = edges_result.data or []

    page_ids = {p["id"] for p in pages}

    nodes = [
        {
            "id": p["id"],
            "label": p["title"][:50],
            "entity_type": p["entity_type"],
            "tags": p.get("tags") or [],
            "confidence": p["confidence"],
            "source_count": p["source_count"],
        }
        for p in pages
    ]

    typed_edges = [
        {
            "source": e["source_page"],
            "target": e["target_page"],
            "type": e["type"],
            "evidence": e.get("evidence", ""),
        }
        for e in edges
        if e["source_page"] in page_ids and e["target_page"] in page_ids
    ]

    return {"nodes": nodes, "edges": typed_edges}


# ── Search ────────────────────────────────────────────────────────────────────

def search_pages(
    user_id: str,
    query: str,
    vault_id: str | None = None,
    tag: str | None = None,
    per_page: int = 30,
) -> list[dict]:
    sb = get_supabase()
    q = (
        sb.table("wiki_pages")
        .select("id,vault_id,title,summary,tags,entity_type,confidence,updated_at")
        .eq("user_id", user_id)
        .or_(f"title.ilike.%{query}%,summary.ilike.%{query}%,detailed_notes.ilike.%{query}%")
    )
    if vault_id:
        q = q.eq("vault_id", vault_id)
    if tag:
        q = q.contains("tags", [tag])
    result = q.order("updated_at", desc=True).limit(per_page).execute()
    return result.data or []
