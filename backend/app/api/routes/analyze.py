import json
from typing import Literal
from fastapi import APIRouter
from pydantic import BaseModel, ValidationError
import anthropic

from app.core.config import settings

router = APIRouter()

# Hardcoded knowledge base used for similarity until Supabase/pgvector is wired
_KNOWLEDGE_BASE = [
    {"id": "node-dw", "title": "Deep Work", "excerpt": "Concentrated, distraction-free work produces rare and valuable output."},
    {"id": "node-fs", "title": "Flow State", "excerpt": "Peak performance emerges when challenge and skill are perfectly balanced."},
    {"id": "node-tb", "title": "Time Blocking", "excerpt": "Scheduling dedicated time blocks turns vague intention into reliable output."},
    {"id": "node-st", "title": "Stoicism", "excerpt": "Focus only on what is within your control; accept everything else with equanimity."},
    {"id": "node-fp", "title": "First Principles", "excerpt": "Break problems to fundamental truths and reason up rather than by analogy."},
    {"id": "node-mm", "title": "Mental Models", "excerpt": "A diverse toolkit of mental models lets you see patterns across disciplines."},
    {"id": "node-sb", "title": "Second Brain", "excerpt": "Externalizing ideas into a trusted system frees mental RAM for higher-order thinking."},
    {"id": "node-zk", "title": "Zettelkasten", "excerpt": "Notes connected by idea relationships rather than folders form an emergent knowledge graph."},
]

_EXTRACTION_PROMPT = """Extract the main knowledge topics from this conversation exchange and classify the content type.

User message: {message}
AI response: {response}

Return a JSON object with this exact shape:
{{
  "type": "idea",
  "new_topics": [
    {{"name": "Topic Name", "description": "One sentence description"}}
  ],
  "similar_keywords": ["keyword1", "keyword2"]
}}

Rules for "type" — pick ONE:
- "book": user explicitly mentions a book or author
- "class": user mentions a class, course, lecture, or university subject
- "article": user mentions an article, paper, or blog post
- "connection": user describes a relationship between two concepts
- "idea": everything else (default)

Rules for topics:
- Only concrete knowledge topics (concepts, frameworks, skills). Skip small talk.
- Maximum 2 new_topics. Empty list if no clear topic.
- similar_keywords: 2-4 single words for matching existing knowledge. Empty list if none.
- Return only valid JSON, nothing else."""


class AnalyzeRequest(BaseModel):
    message: str
    response: str


class TopicItem(BaseModel):
    name: str
    description: str


class SimilarItem(BaseModel):
    id: str
    title: str
    excerpt: str


class AnalyzeResponse(BaseModel):
    type: Literal["book", "idea", "class", "connection", "article"] = "idea"
    new_topics: list[TopicItem]
    similar: list[SimilarItem]


def _find_similar(keywords: list[str]) -> list[SimilarItem]:
    """Keyword match against the knowledge base. Top 3 matches."""
    if not keywords:
        return []
    lower_keywords = [k.lower() for k in keywords]
    scored: list[tuple[int, dict]] = []
    for item in _KNOWLEDGE_BASE:
        searchable = (item["title"] + " " + item["excerpt"]).lower()
        score = sum(1 for kw in lower_keywords if kw in searchable)
        if score > 0:
            scored.append((score, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [SimilarItem(**item) for _, item in scored[:3]]


@router.post("", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    # Skip trivially short exchanges
    if len(request.message.strip()) < 10:
        return AnalyzeResponse(type="idea", new_topics=[], similar=[])

    # Skip AI extraction if no API key is configured
    if not settings.anthropic_api_key:
        return AnalyzeResponse(type="idea", new_topics=[], similar=[])

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    prompt = _EXTRACTION_PROMPT.format(
        message=request.message,
        response=request.response,
    )

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        text = message.content[0].text.strip()
        # Strip markdown code fences if present (```json ... ``` or ``` ... ```)
        if text.startswith("```"):
            text = text.split("\n", 1)[-1]
            text = text.rsplit("```", 1)[0].strip()
        raw = json.loads(text)
        intent_type = raw.get("type", "idea")
        if intent_type not in ("book", "idea", "class", "connection", "article"):
            intent_type = "idea"
        new_topics = [TopicItem(**t) for t in raw.get("new_topics", [])]
        similar = _find_similar(raw.get("similar_keywords", []))
    except (json.JSONDecodeError, KeyError, TypeError, ValidationError):
        return AnalyzeResponse(type="idea", new_topics=[], similar=[])

    return AnalyzeResponse(type=intent_type, new_topics=new_topics, similar=similar)
