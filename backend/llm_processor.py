import anthropic
import json
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

ENTITY_TYPES = ["concept", "tool", "person", "decision"]

WIKI_SYSTEM_PROMPT = """You are a personal knowledge curator. You read raw web content and transform it into a structured wiki page for long-term reference.

You MUST output valid JSON with EXACTLY this schema (no extra fields, no markdown fences):

{
  "entity_type": "concept | tool | person | decision",
  "title": "Concise, memorable title (not a copy of the article headline)",
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "2-3 sentence TL;DR capturing the core value",
  "key_insights": [
    "Actionable insight starting with a verb"
  ],
  "detailed_notes": "Full markdown notes. Use ## headings, bullet points, **bold** for key terms. Write as if explaining to yourself 6 months from now. Minimum 200 words.",
  "code_examples": [
    {
      "language": "python",
      "description": "What this code does",
      "code": "actual code here"
    }
  ],
  "confidence": "high | medium | low",
  "citations": [
    {
      "claim_text": "A specific factual claim from the wiki page",
      "excerpt": "The exact quote from the original content that supports this claim"
    }
  ],
  "suggested_relationships": [
    {
      "related_title": "Title of a concept this page relates to",
      "type": "REQUIRES | CONTRADICTS | BUILDS_ON | EXAMPLES | ENABLES | PART_OF | USED_BY | REPLACES",
      "evidence": "Brief quote or reason for this relationship"
    }
  ]
}

Rules:
- entity_type: concept (idea/method), tool (software/service), person (individual), decision (architecture/product choice)
- tags: 3-7 lowercase specific tags (prefer 'prompt-caching' over 'ai')
- key_insights: 3-8 items, each starting with a verb, specific not vague
- code_examples: [] if no code in the article
- confidence: high = clear authoritative content; medium = single opinion/blog; low = unclear/speculative
- citations: 2-5 of the most important factual claims, each with a direct quote
- suggested_relationships: 0-3 relationships to other topics the user likely already knows about
- Output JSON only — no markdown fences, no explanation"""

VAULT_SUGGEST_PROMPT = """You are analyzing web content to determine which knowledge vault it belongs to.

Given the content and a list of existing vaults (with their names, descriptions, and fingerprints),
output valid JSON:

{
  "suggestions": [
    {
      "vault_id": "uuid-of-vault or null if new",
      "vault_name": "name of vault",
      "confidence": 0.0-1.0,
      "reason": "one sentence why this content belongs here"
    }
  ],
  "new_vault_suggestion": {
    "name": "Suggested vault name if no existing vault fits well",
    "description": "One sentence description of what this vault would cover"
  }
}

Rules:
- Return up to 3 existing vault matches, sorted by confidence descending
- Only suggest an existing vault if confidence > 0.4
- Always include new_vault_suggestion even if an existing vault matches well
- new_vault_suggestion.name should be concise (2-4 words) and project/topic focused
- Output JSON only"""


async def suggest_vault(scraped: dict, existing_vaults: list[dict]) -> dict:
    """Analyze content and suggest the best vault(s) to save it in."""
    content = scraped["content"]
    if len(content) > 8000:
        content = content[:8000] + "\n[truncated]"

    vaults_context = json.dumps([
        {
            "vault_id": v["id"],
            "name": v["name"],
            "description": v.get("description", ""),
            "fingerprint": v.get("fingerprint", {}),
        }
        for v in existing_vaults
    ], indent=2)

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=VAULT_SUGGEST_PROMPT,
        messages=[{
            "role": "user",
            "content": (
                f"SOURCE URL: {scraped['url']}\n"
                f"TITLE: {scraped.get('title', '')}\n\n"
                f"CONTENT (first 8000 chars):\n{content}\n\n"
                f"EXISTING VAULTS:\n{vaults_context}\n\n"
                "Analyze this content and suggest the best vault(s). Output JSON only."
            ),
        }],
    )

    raw = _strip_fences(message.content[0].text.strip())
    result = json.loads(raw)
    result.setdefault("suggestions", [])
    result.setdefault("new_vault_suggestion", {"name": "New Vault", "description": ""})
    return result


async def process_content(scraped: dict, vault_prompt: str = "") -> dict:
    """Compile raw scraped content into a structured wiki page."""
    content = scraped["content"]
    if len(content) > 40000:
        content = content[:40000] + "\n\n[Content truncated]"

    system = WIKI_SYSTEM_PROMPT
    if vault_prompt:
        system = f"{WIKI_SYSTEM_PROMPT}\n\nVAULT-SPECIFIC RULES:\n{vault_prompt}"

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=system,
        messages=[{
            "role": "user",
            "content": (
                f"SOURCE URL: {scraped['url']}\n"
                f"DOMAIN: {scraped.get('domain', '')}\n"
                f"ORIGINAL TITLE: {scraped.get('title', '')}\n\n"
                f"CONTENT:\n{content}\n\n"
                "Convert this to a structured wiki page. Output JSON only."
            ),
        }],
    )

    raw = _strip_fences(message.content[0].text.strip())
    parsed = json.loads(raw)

    parsed.setdefault("entity_type", "concept")
    parsed.setdefault("title", scraped.get("title", "Untitled"))
    parsed.setdefault("tags", [])
    parsed.setdefault("summary", "")
    parsed.setdefault("key_insights", [])
    parsed.setdefault("detailed_notes", "")
    parsed.setdefault("code_examples", [])
    parsed.setdefault("confidence", "medium")
    parsed.setdefault("citations", [])
    parsed.setdefault("suggested_relationships", [])

    return parsed


def _strip_fences(raw: str) -> str:
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()
