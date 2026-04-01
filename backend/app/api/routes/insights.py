from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime

from app.core.supabase import get_supabase
from app.services.embeddings import embed
from app.services.connections import find_and_save_connections

router = APIRouter()


class InsightCreate(BaseModel):
    log_id: str
    content: str


class InsightResponse(BaseModel):
    id: str
    log_id: str | None
    content: str
    area: str | None = None
    created_at: datetime


@router.get("")
async def list_insights() -> list[InsightResponse]:
    sb = get_supabase()
    result = (
        sb.table("insights")
        .select("id,log_id,content,area,created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.post("", response_model=InsightResponse)
async def create_insight(insight: InsightCreate, background_tasks: BackgroundTasks) -> InsightResponse:
    sb = get_supabase()
    embedding = embed(insight.content)
    result = sb.table("insights").insert({
        "log_id": insight.log_id,
        "content": insight.content,
        "embedding": embedding,
    }).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create insight")
    saved = result.data[0]
    background_tasks.add_task(find_and_save_connections, saved["id"], insight.content, embedding)
    return saved


class TopicInsightCreate(BaseModel):
    title: str
    description: str


class TopicInsightResponse(BaseModel):
    id: str
    title: str
    description: str


@router.post("/topic", response_model=TopicInsightResponse, status_code=201)
async def save_topic_insight(
    insight: TopicInsightCreate, background_tasks: BackgroundTasks
) -> TopicInsightResponse:
    sb = get_supabase()

    log_result = sb.table("logs").insert({
        "type": "idea",
        "title": insight.title,
    }).execute()
    if not log_result.data:
        raise HTTPException(status_code=500, detail="Failed to create log")
    log_id = log_result.data[0]["id"]

    content = f"{insight.title}: {insight.description}"
    embedding = embed(content)
    ins_result = sb.table("insights").insert({
        "log_id": log_id,
        "content": content,
        "embedding": embedding,
    }).execute()
    if not ins_result.data:
        raise HTTPException(status_code=500, detail="Failed to create insight")
    saved = ins_result.data[0]

    background_tasks.add_task(find_and_save_connections, saved["id"], content, embedding)
    return TopicInsightResponse(id=saved["id"], title=insight.title, description=insight.description)
