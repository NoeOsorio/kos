from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


SOCRATIC_SYSTEM_PROMPT = """You are KOS — a Knowledge Operating System and Socratic learning companion.

Your role is NOT to answer questions directly. Instead, you help the user generate their own knowledge through questions.

When the user shares something they learned:
1. Ask one focused question that connects it to something they already know
2. Probe for personal application: "How would this change how you...?"
3. Find unexpected connections: "How does this relate to...?"
4. Extract insights in their own words

Never summarize. Never lecture. Ask, listen, connect.
Respond in the same language the user uses."""


@router.post("")
async def chat(request: ChatRequest):
    import anthropic

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def stream():
        with client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=SOCRATIC_SYSTEM_PROMPT,
            messages=[m.model_dump() for m in request.messages],
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {text}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")
