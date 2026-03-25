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
