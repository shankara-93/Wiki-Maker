from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

from auth import get_current_user
from database import (
    get_supabase,
    insert_capture,
    get_capture,
    list_captures,
    delete_capture,
    insert_wiki_page,
    get_wiki_page,
    list_wiki_pages,
    update_wiki_page,
    delete_wiki_page,
    insert_citations,
    insert_relationships,
    get_graph_data,
    search_pages,
)
from vaults import (
    create_vault,
    list_vaults,
    get_vault,
    update_vault,
    delete_vault,
)
from scraper import scrape_url, scrape_from_html
from llm_processor import process_content, suggest_vault

load_dotenv()

app = FastAPI(
    title="LLM Wiki Maker API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


# ── Vault endpoints ───────────────────────────────────────────────────────────

class VaultCreate(BaseModel):
    name: str
    description: str = ""


class VaultUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    vault_prompt: Optional[str] = None


@app.post("/api/vaults", status_code=201)
def create_vault_endpoint(body: VaultCreate, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    return create_vault(sb, user["id"], body.name, body.description)


@app.get("/api/vaults")
def list_vaults_endpoint(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    return list_vaults(sb, user["id"])


@app.get("/api/vaults/{vault_id}")
def get_vault_endpoint(vault_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    vault = get_vault(sb, vault_id, user["id"])
    if not vault:
        raise HTTPException(status_code=404, detail="Vault not found")
    return vault


@app.patch("/api/vaults/{vault_id}")
def update_vault_endpoint(vault_id: str, body: VaultUpdate, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    updated = update_vault(sb, vault_id, user["id"], body.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Vault not found")
    return updated


@app.delete("/api/vaults/{vault_id}")
def delete_vault_endpoint(vault_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    deleted = delete_vault(sb, vault_id, user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Vault not found")
    return {"deleted": True}


# ── Capture endpoints ─────────────────────────────────────────────────────────

class CaptureURLRequest(BaseModel):
    url: str
    vault_id: Optional[str] = None  # None = analyze and suggest vault first


class CaptureHTMLRequest(BaseModel):
    url: str
    html: str
    vault_id: Optional[str] = None


class ConfirmCaptureRequest(BaseModel):
    capture_id: str
    vault_id: str
    why_saved: Optional[str] = None


@app.post("/api/capture/suggest")
async def suggest_vault_endpoint(
    body: CaptureURLRequest,
    user: dict = Depends(get_current_user),
):
    """Scrape URL and return vault suggestions without saving anything yet."""
    try:
        scraped = await scrape_url(body.url)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to fetch URL: {e}")

    if not scraped["content"].strip():
        raise HTTPException(
            status_code=422,
            detail="No readable content found. Try the extension instead.",
        )

    sb = get_supabase()
    vaults = list_vaults(sb, user["id"])
    suggestions = await suggest_vault(scraped, vaults)

    return {
        "scraped": {
            "url": scraped["url"],
            "title": scraped.get("title", ""),
            "domain": scraped.get("domain", ""),
            "content_preview": scraped["content"][:500],
        },
        **suggestions,
    }


@app.post("/api/capture/url")
async def capture_url(
    body: CaptureURLRequest,
    user: dict = Depends(get_current_user),
):
    """Server-side scrape + save capture + compile wiki page."""
    if not body.vault_id:
        raise HTTPException(status_code=400, detail="vault_id required. Use /api/capture/suggest first.")

    sb = get_supabase()
    vault = get_vault(sb, body.vault_id, user["id"])
    if not vault:
        raise HTTPException(status_code=404, detail="Vault not found")

    try:
        scraped = await scrape_url(body.url)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to fetch URL: {e}")

    if not scraped["content"].strip():
        raise HTTPException(status_code=422, detail="No readable content found.")

    return await _process_and_store(scraped, user["id"], vault)


@app.post("/api/capture/html")
async def capture_html(
    body: CaptureHTMLRequest,
    user: dict = Depends(get_current_user),
):
    """Process HTML from browser extension + save + compile."""
    if not body.vault_id:
        raise HTTPException(status_code=400, detail="vault_id required.")

    sb = get_supabase()
    vault = get_vault(sb, body.vault_id, user["id"])
    if not vault:
        raise HTTPException(status_code=404, detail="Vault not found")

    try:
        scraped = await scrape_from_html(body.url, body.html)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to process HTML: {e}")

    if not scraped["content"].strip():
        raise HTTPException(status_code=422, detail="No readable content extracted.")

    return await _process_and_store(scraped, user["id"], vault)


async def _process_and_store(scraped: dict, user_id: str, vault: dict) -> dict:
    # 1. Save raw capture (source of truth, immutable)
    capture = insert_capture(user_id, vault["id"], scraped)

    # 2. Compile wiki page with LLM
    try:
        wiki_data = await process_content(scraped, vault_prompt=vault.get("vault_prompt") or "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM processing failed: {e}")

    # 3. Save wiki page
    page = insert_wiki_page(user_id, vault["id"], wiki_data)

    # 4. Save citations
    if wiki_data.get("citations"):
        insert_citations(page["id"], capture["id"], wiki_data["citations"])

    return {
        "capture": capture,
        "wiki_page": page,
        "suggested_relationships": wiki_data.get("suggested_relationships", []),
    }


# ── Captures CRUD ─────────────────────────────────────────────────────────────

@app.get("/api/vaults/{vault_id}/captures")
def list_captures_endpoint(
    vault_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    return list_captures(user["id"], vault_id, page, per_page)


@app.get("/api/captures/{capture_id}")
def get_capture_endpoint(capture_id: str, user: dict = Depends(get_current_user)):
    capture = get_capture(capture_id, user["id"])
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")
    return capture


@app.delete("/api/captures/{capture_id}")
def delete_capture_endpoint(capture_id: str, user: dict = Depends(get_current_user)):
    deleted = delete_capture(capture_id, user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Capture not found")
    return {"deleted": True}


# ── Wiki Pages CRUD ───────────────────────────────────────────────────────────

class WikiPageUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    key_insights: Optional[list] = None
    detailed_notes: Optional[str] = None
    code_examples: Optional[list] = None
    tags: Optional[list[str]] = None
    entity_type: Optional[str] = None


@app.get("/api/vaults/{vault_id}/pages")
def list_vault_pages(
    vault_id: str,
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(18, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    return list_wiki_pages(user["id"], vault_id, tag, search, entity_type, page, per_page)


@app.get("/api/wikis/{wiki_id}")
def get_wiki(wiki_id: str, user: dict = Depends(get_current_user)):
    page = get_wiki_page(wiki_id, user["id"])
    if not page:
        raise HTTPException(status_code=404, detail="Wiki page not found")
    return page


@app.patch("/api/wikis/{wiki_id}")
def update_wiki(wiki_id: str, body: WikiPageUpdate, user: dict = Depends(get_current_user)):
    updated = update_wiki_page(wiki_id, user["id"], body.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Wiki page not found")
    return updated


@app.delete("/api/wikis/{wiki_id}")
def delete_wiki(wiki_id: str, user: dict = Depends(get_current_user)):
    deleted = delete_wiki_page(wiki_id, user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Wiki page not found")
    return {"deleted": True}


# ── Graph ─────────────────────────────────────────────────────────────────────

@app.get("/api/vaults/{vault_id}/graph")
def vault_graph(vault_id: str, user: dict = Depends(get_current_user)):
    return get_graph_data(user["id"], vault_id)


# ── Relationships ─────────────────────────────────────────────────────────────

class RelationshipCreate(BaseModel):
    source_page: str
    target_page: str
    type: str
    evidence: str = ""
    capture_id: Optional[str] = None


@app.post("/api/vaults/{vault_id}/relationships", status_code=201)
def create_relationship(
    vault_id: str,
    body: RelationshipCreate,
    user: dict = Depends(get_current_user),
):
    sb = get_supabase()
    vault = get_vault(sb, vault_id, user["id"])
    if not vault:
        raise HTTPException(status_code=404, detail="Vault not found")

    results = insert_relationships(vault_id, [body.model_dump()])
    return results[0] if results else {}


# ── Search ────────────────────────────────────────────────────────────────────

@app.get("/api/search")
def search(
    q: str = Query(..., min_length=1),
    vault_id: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    per_page: int = Query(30, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    results = search_pages(user["id"], q, vault_id, tag, per_page)
    return {"results": results, "total": len(results)}


# ── Legacy compatibility (V1 clients) ─────────────────────────────────────────

@app.get("/api/wikis")
def list_wikis_legacy(
    category: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    """V1 compatibility: list all pages across all vaults."""
    return list_wiki_pages(user["id"], None, tag, search, None, page, per_page)


@app.get("/api/categories")
def categories_legacy(user: dict = Depends(get_current_user)):
    """V1 compatibility: return vault list as category-style response."""
    sb = get_supabase()
    vaults = list_vaults(sb, user["id"])
    return [{"category": v["name"], "count": v["page_count"], "vault_id": v["id"]} for v in vaults]


@app.get("/api/graph")
def graph_legacy(user: dict = Depends(get_current_user)):
    """V1 compatibility: return graph across all vaults (flattened)."""
    sb = get_supabase()
    vaults = list_vaults(sb, user["id"])
    all_nodes = []
    all_edges = []
    for v in vaults:
        data = get_graph_data(user["id"], v["id"])
        all_nodes.extend(data["nodes"])
        all_edges.extend(data["edges"])
    return {"nodes": all_nodes, "edges": all_edges}
