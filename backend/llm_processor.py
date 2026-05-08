import anthropic
import json
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

CATEGORIES = [
    "AI & Machine Learning",
    "Software Engineering",
    "Web Development",
    "Product & SaaS",
    "Data Science",
    "DevOps & Infrastructure",
    "Business & Startups",
    "Security & Privacy",
    "Tools & Productivity",
    "Research & Papers",
    "Career & Growth",
    "Other",
]

SYSTEM_PROMPT = f"""You are a personal knowledge curator. You read raw web content and transform it into a structured, high-quality wiki page for long-term reference.

Output ONLY valid JSON with this exact schema:

{{
  "title": "Concise, memorable title (not a copy of the article headline)",
  "category": "Exactly one of: {', '.join(CATEGORIES)}",
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "2-3 sentence TL;DR that captures the core value of this content",
  "key_insights": [
    "Actionable insight starting with a verb",
    "..."
  ],
  "detailed_notes": "Full markdown notes. Use ## headings, bullet points, **bold** for key terms. Write as if explaining to yourself 6 months from now. Minimum 200 words.",
  "code_examples": [
    {{
      "language": "python",
      "description": "What this code does",
      "code": "actual code here"
    }}
  ],
  "wiki_markdown": "Complete self-contained wiki page in markdown. Include: # Title, ## Summary, ## Key Insights, ## Detailed Notes, ## Code Examples (if any), ## Source. No external links needed to understand it."
}}

Rules:
- tags: 3-7 lowercase, specific tags (prefer 'prompt-caching' over 'ai')
- key_insights: 3-8 items, each starting with a verb, specific not vague
- code_examples: empty array [] if no code in the article
- Output JSON only — no markdown fences, no explanation"""


async def process_content(scraped: dict) -> dict:
    content = scraped["content"]
    if len(content) > 40000:
        content = content[:40000] + "\n\n[Content truncated]"

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": (
                f"SOURCE URL: {scraped['url']}\n"
                f"DOMAIN: {scraped['domain']}\n"
                f"ORIGINAL TITLE: {scraped['title']}\n\n"
                f"CONTENT:\n{content}\n\n"
                "Convert this to a structured wiki page. Output JSON only."
            ),
        }],
    )

    raw = message.content[0].text.strip()

    # Strip accidental markdown fences
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    parsed = json.loads(raw)

    parsed.setdefault("title", scraped["title"])
    parsed.setdefault("category", "Other")
    parsed.setdefault("tags", [])
    parsed.setdefault("summary", "")
    parsed.setdefault("key_insights", [])
    parsed.setdefault("detailed_notes", "")
    parsed.setdefault("code_examples", [])
    parsed.setdefault("wiki_markdown", "")

    return parsed
