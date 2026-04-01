import anthropic
from app.core.config import settings
from app.core.supabase import get_supabase


def find_and_save_connections(insight_id: str, content: str, embedding: list[float]) -> None:
    """
    Background task: find similar insights via pgvector, ask Claude Haiku to label
    the connection, and upsert into the connections table.
    """
    sb = get_supabase()

    try:
        result = sb.rpc("match_insights", {
            "query_embedding": embedding,
            "match_threshold": 0.75,
            "match_count": 5,
            "exclude_id": insight_id,
        }).execute()
        similar = result.data or []
    except Exception:
        return

    if not similar:
        return

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    for item in similar:
        target_id = item["id"]
        target_content = item["content"]

        try:
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=60,
                messages=[{
                    "role": "user",
                    "content": (
                        f'Insight A: "{content}"\n'
                        f'Insight B: "{target_content}"\n\n'
                        "In 5 words or fewer, describe HOW these two ideas connect. "
                        "If they are not meaningfully connected, reply exactly: null"
                    ),
                }],
            )
            label_raw = msg.content[0].text.strip()
            if label_raw.lower() == "null":
                continue
            label = label_raw[:80]
        except Exception:
            label = "related"

        try:
            sb.table("connections").upsert({
                "source_id": insight_id,
                "target_id": target_id,
                "label": label,
                "strength": round(float(item.get("similarity", 0.8)), 3),
            }, on_conflict="source_id,target_id").execute()
        except Exception:
            pass
