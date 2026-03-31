from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Literal

from app.core.supabase import get_supabase

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
async def list_logs() -> list[LogResponse]:
    sb = get_supabase()
    result = sb.table("logs").select("*").order("created_at", desc=True).execute()
    return result.data or []


@router.post("", response_model=LogResponse)
async def create_log(entry: LogEntry) -> LogResponse:
    sb = get_supabase()
    result = sb.table("logs").insert(entry.model_dump(exclude_none=True)).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create log")
    return result.data[0]
