from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
from typing import Literal

router = APIRouter()


class LogEntry(BaseModel):
    type: Literal["book", "idea", "class", "connection", "article"]
    title: str
    author: str | None = None
    chapter: str | None = None
    area: str | None = None


class LogResponse(LogEntry):
    id: str
    created_at: datetime


@router.get("")
async def list_logs():
    # TODO: connect to Supabase
    return []


@router.post("", response_model=LogResponse)
async def create_log(entry: LogEntry):
    # TODO: save to Supabase
    return {**entry.model_dump(), "id": "placeholder", "created_at": datetime.utcnow()}
