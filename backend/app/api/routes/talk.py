from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter()


class TalkRequest(BaseModel):
    message: str


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
async def talk(request: TalkRequest):
    import anthropic

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SOCRATIC_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": request.message}],
    )

    return {"response": message.content[0].text}
