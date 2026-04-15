"""RAG service — embed a query and retrieve the top-k most relevant insights."""
from app.core.supabase import get_supabase
from app.services.embeddings import embed

MATCH_THRESHOLD = 0.4
MATCH_COUNT = 5


def search_knowledge(query: str, exclude_id: str | None = None) -> list[dict]:
    """Return up to MATCH_COUNT insights semantically similar to *query*.

    Each result dict has: id, content, area, similarity.
    Returns [] if the DB call fails or no insights are stored yet.
    """
    try:
        query_embedding = embed(query)
        sb = get_supabase()
        params: dict = {
            "query_embedding": query_embedding,
            "match_threshold": MATCH_THRESHOLD,
            "match_count": MATCH_COUNT,
        }
        if exclude_id:
            params["exclude_id"] = exclude_id

        result = sb.rpc("search_insights", params).execute()
        return result.data or []
    except Exception:
        return []
