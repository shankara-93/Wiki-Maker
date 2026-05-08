from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

from auth import get_current_user
from database import (
    insert_wiki_page,
    get_wiki_page,
    list_wiki_pages,
    delete_wiki_page,
    get_category_counts,
    get_all_tags,
    get_graph_data,
)
from scraper import scrape_url, scrape_from_html
from llm_processor import process_content

load_dotenv()

app = FastAPI(
    title="LLM Wiki API",
    description="Capture web content and store it as AI-structured wiki pages",
    version="1.0.0",
)

origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten to `origins` in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────

class CaptureURLRequest(BaseModel):
    url: str


class CaptureHTMLRequest(BaseModel):
    url: str
    html: str  # Full document.documentElement.outerHTML from extension


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


# ── Capture endpoints ─────────────────────────────────────────────────────────

@app.post("/api/capture/url")
async def capture_url(
    request: CaptureURLRequest,
    user: dict = Depends(get_current_user),
):
    """Server-side scrape + LLM process + store. Works for public pages."""
    try:
        scraped = await scrape_url(request.url)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to fetch URL: {e}")

    if not scraped["content"].strip():
        raise HTTPException(
            status_code=422,
            detail="No readable content found. The page may require login or JavaScript rendering. Try the extension instead.",
        )

    return await _process_and_store(scraped, user["id"])


@app.post("/api/capture/html")
async def capture_html(
    request: CaptureHTMLRequest,
    user: dict = Depends(get_current_user),
):
    """Process HTML sent from the browser extension.
    Handles JS-rendered pages (LinkedIn, Twitter, SPAs)."""
    try:
        scraped = await scrape_from_html(request.url, request.html)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to process HTML: {e}")

    if not scraped["content"].strip():
        raise HTTPException(status_code=422, detail="No readable content extracted from page.")

    return await _process_and_store(scraped, user["id"])


async def _process_and_store(scraped: dict, user_id: str) -> dict:
    try:
        wiki_data = await process_content(scraped)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM processing failed: {e}")

    row = {
        "title": wiki_data["title"],
        "source_url": scraped["url"],
        "source_domain": scraped["domain"],
        "category": wiki_data["category"],
        "tags": wiki_data["tags"],
        "summary": wiki_data["summary"],
        "key_insights": wiki_data["key_insights"],
        "detailed_notes": wiki_data["detailed_notes"],
        "code_examples": wiki_data["code_examples"],
        "wiki_markdown": wiki_data["wiki_markdown"],
    }

    try:
        saved = insert_wiki_page(user_id, row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save to database: {e}")

    return saved


# ── Wiki CRUD ─────────────────────────────────────────────────────────────────

@app.get("/api/wikis")
def list_wikis(
    category: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    return list_wiki_pages(user["id"], category, tag, search, page, per_page)


@app.get("/api/wikis/{wiki_id}")
def get_wiki(wiki_id: str, user: dict = Depends(get_current_user)):
    page = get_wiki_page(wiki_id, user["id"])
    if not page:
        raise HTTPException(status_code=404, detail="Wiki page not found")
    return page


@app.delete("/api/wikis/{wiki_id}")
def delete_wiki(wiki_id: str, user: dict = Depends(get_current_user)):
    deleted = delete_wiki_page(wiki_id, user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Wiki page not found")
    return {"deleted": True}


# ── Discovery endpoints ───────────────────────────────────────────────────────

@app.get("/api/categories")
def categories(user: dict = Depends(get_current_user)):
    return get_category_counts(user["id"])


@app.get("/api/tags")
def tags(user: dict = Depends(get_current_user)):
    return get_all_tags(user["id"])


@app.get("/api/graph")
def graph(user: dict = Depends(get_current_user)):
    """Graph data: nodes = wiki pages, edges = shared tags/category."""
    return get_graph_data(user["id"])
