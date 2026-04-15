import json
from typing import Literal

import anthropic
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.config import settings
from app.services.rag import search_knowledge

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    mode: Literal["socratic", "brain", "metaphor"] = "socratic"


SOCRATIC_SYSTEM_PROMPT = """You are KOS — a Knowledge Operating System and Socratic learning companion.

Your role is NOT to answer questions directly. Instead, you help the user generate their own knowledge through questions.

When the user shares something they learned:
1. Ask one focused question that connects it to something they already know
2. Probe for personal application: "How would this change how you...?"
3. Find unexpected connections: "How does this relate to...?"
4. Extract insights in their own words

Never summarize. Never lecture. Ask, listen, connect.
Respond in the same language the user uses."""

_BRAIN_SYSTEM_TEMPLATE = """You are KOS in Brain mode. Answer using the user's own stored knowledge.

Ground every answer in the knowledge base below. If the answer isn't there, say so honestly and ask a question to help the user build that knowledge.

Cite insights naturally — e.g. "Based on what you noted about X..." — don't just quote them verbatim.
Respond in the same language the user uses.

--- KNOWLEDGE BASE ---
{insights}
--- END KNOWLEDGE BASE ---"""

_METAPHOR_SYSTEM_TEMPLATE = """You are KOS in Metaphor mode. Find surprising cross-domain connections.

Surface the most unexpected, non-obvious connection between what the user is saying and their stored insights. One metaphor per response. Explain WHY it is a real conceptual connection, not just wordplay.

Respond in the same language the user uses.

--- KNOWLEDGE BASE ---
{insights}
--- END KNOWLEDGE BASE ---"""


def _build_system_prompt(mode: str, sources: list[dict]) -> str:
    if mode == "socratic" or not sources:
        return SOCRATIC_SYSTEM_PROMPT

    insights_text = "\n\n".join(
        f"[{i + 1}] {src['content']}" + (f" (area: {src['area']})" if src.get("area") else "")
        for i, src in enumerate(sources)
    )

    template = _BRAIN_SYSTEM_TEMPLATE if mode == "brain" else _METAPHOR_SYSTEM_TEMPLATE
    return template.format(insights=insights_text)


@router.post("")
async def chat(request: ChatRequest):
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    sources: list[dict] = []
    if request.mode in ("brain", "metaphor") and request.messages:
        last_user = next(
            (m.content for m in reversed(request.messages) if m.role == "user"),
            "",
        )
        if last_user:
            sources = search_knowledge(last_user)

    system_prompt = _build_system_prompt(request.mode, sources)

    def stream():
        with client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system_prompt,
            messages=[m.model_dump() for m in request.messages],
        ) as s:
            for text in s.text_stream:
                yield f"data: {text}\n\n"

        if sources:
            sources_payload = json.dumps({
                "sources": [
                    {"id": src["id"], "content": src["content"], "area": src.get("area")}
                    for src in sources
                ]
            })
            yield f"data: [SOURCES]{sources_payload}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")
