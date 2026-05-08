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


# ── Wiki page CRUD ────────────────────────────────────────────────────────────

def insert_wiki_page(user_id: str, data: dict) -> dict:
    sb = get_supabase()
    row = {**data, "user_id": user_id}
    result = sb.table("wiki_pages").insert(row).execute()
    return result.data[0]


def get_wiki_page(wiki_id: str, user_id: str) -> dict | None:
    sb = get_supabase()
    result = (
        sb.table("wiki_pages")
        .select("*")
        .eq("id", wiki_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    return result.data


def list_wiki_pages(
    user_id: str,
    category: str | None = None,
    tag: str | None = None,
    search: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    sb = get_supabase()
    query = sb.table("wiki_pages").select("*", count="exact").eq("user_id", user_id)

    if category:
        query = query.eq("category", category)

    if tag:
        query = query.contains("tags", [tag])

    if search:
        query = query.or_(
            f"title.ilike.%{search}%,summary.ilike.%{search}%,detailed_notes.ilike.%{search}%"
        )

    offset = (page - 1) * per_page
    result = query.order("created_at", desc=True).range(offset, offset + per_page - 1).execute()

    return {
        "total": result.count or 0,
        "page": page,
        "per_page": per_page,
        "pages": result.data or [],
    }


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


def get_category_counts(user_id: str) -> list[dict]:
    sb = get_supabase()
    result = sb.table("wiki_pages").select("category").eq("user_id", user_id).execute()
    counts: dict = {}
    for row in result.data or []:
        cat = row["category"]
        counts[cat] = counts.get(cat, 0) + 1
    return [{"category": k, "count": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])]


def get_all_tags(user_id: str) -> list[dict]:
    sb = get_supabase()
    result = sb.table("wiki_pages").select("tags").eq("user_id", user_id).execute()
    counts: dict = {}
    for row in result.data or []:
        for tag in row.get("tags") or []:
            counts[tag] = counts.get(tag, 0) + 1
    return [{"tag": k, "count": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])]


def get_graph_data(user_id: str) -> dict:
    """Return nodes + edges for graph visualization.
    Edges connect pages that share tags or the same category."""
    sb = get_supabase()
    result = sb.table("wiki_pages").select("id,title,category,tags,source_domain").eq("user_id", user_id).execute()
    pages = result.data or []

    nodes = [
        {
            "id": p["id"],
            "label": p["title"][:40],
            "category": p["category"],
            "domain": p.get("source_domain", ""),
        }
        for p in pages
    ]

    edges = []
    seen = set()
    for i, a in enumerate(pages):
        for j, b in enumerate(pages):
            if i >= j:
                continue
            pair = (a["id"], b["id"])
            if pair in seen:
                continue
            a_tags = set(a.get("tags") or [])
            b_tags = set(b.get("tags") or [])
            shared_tags = a_tags & b_tags
            same_category = a["category"] == b["category"]
            if shared_tags or same_category:
                edges.append({
                    "source": a["id"],
                    "target": b["id"],
                    "weight": len(shared_tags) + (1 if same_category else 0),
                    "shared_tags": list(shared_tags),
                })
                seen.add(pair)

    return {"nodes": nodes, "edges": edges}
