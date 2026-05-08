import httpx
import trafilatura
from urllib.parse import urlparse
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


async def scrape_url(url: str) -> dict:
    """Fetch a URL server-side and extract clean content."""
    parsed = urlparse(url)
    domain = parsed.netloc.replace("www.", "")

    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        html = response.text

    return _process_html(url, domain, html)


async def scrape_from_html(url: str, html: str) -> dict:
    """Process HTML already fetched by the browser extension.
    This handles JS-rendered pages (LinkedIn, Twitter, SPAs) that
    server-side scraping can't access."""
    parsed = urlparse(url)
    domain = parsed.netloc.replace("www.", "")
    return _process_html(url, domain, html)


def _process_html(url: str, domain: str, html: str) -> dict:
    content = trafilatura.extract(
        html,
        include_comments=False,
        include_tables=True,
        no_fallback=False,
        favor_recall=True,
    )

    if not content:
        content = _bs4_extract(html)

    title = _extract_title(html)

    return {
        "url": url,
        "domain": domain,
        "title": title,
        "content": content or "",
    }


def _extract_title(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")

    og = soup.find("meta", property="og:title")
    if og and og.get("content"):
        return og["content"].strip()

    tw = soup.find("meta", attrs={"name": "twitter:title"})
    if tw and tw.get("content"):
        return tw["content"].strip()

    if soup.title and soup.title.string:
        return soup.title.string.strip()

    return "Untitled"


def _bs4_extract(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe"]):
        tag.decompose()

    for selector in ["article", "main", "[role='main']"]:
        el = soup.select_one(selector)
        if el:
            return el.get_text(separator="\n", strip=True)

    divs = soup.find_all("div")
    if divs:
        return max(divs, key=lambda d: len(d.get_text())).get_text(separator="\n", strip=True)

    return soup.get_text(separator="\n", strip=True)
