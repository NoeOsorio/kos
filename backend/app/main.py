from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import chat, logs, insights, graph, talk, analyze

app = FastAPI(
    title="KOS API",
    description="Knowledge Operating System — Backend API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(talk.router, prefix="/api/talk", tags=["talk"])
app.include_router(logs.router, prefix="/api/logs", tags=["logs"])
app.include_router(insights.router, prefix="/api/insights", tags=["insights"])
app.include_router(graph.router, prefix="/api/graph", tags=["graph"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
