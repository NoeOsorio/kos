from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class InsightCreate(BaseModel):
    log_id: str
    content: str


class InsightResponse(InsightCreate):
    id: str
    created_at: datetime


@router.get("")
async def list_insights():
    # TODO: connect to Supabase
    return []


@router.post("", response_model=InsightResponse)
async def create_insight(insight: InsightCreate):
    # TODO: generate embedding + save to Supabase
    return {**insight.model_dump(), "id": "placeholder", "created_at": datetime.utcnow()}


class TopicInsightCreate(BaseModel):
    title: str
    description: str


class TopicInsightResponse(BaseModel):
    id: str
    title: str
    description: str


@router.post("/topic", response_model=TopicInsightResponse, status_code=201)
async def save_topic_insight(insight: TopicInsightCreate) -> TopicInsightResponse:
    # TODO: generate embedding + save to Supabase; replace id with UUID from DB insert
    return TopicInsightResponse(
        id="placeholder-" + insight.title.lower().replace(" ", "-"),
        title=insight.title,
        description=insight.description,
    )
