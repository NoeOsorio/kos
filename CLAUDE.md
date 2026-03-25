# KOS — Claude Context

**Project:** Knowledge Operating System — conversational second brain with socratic AI, RAG, and knowledge graph.

## Stack
- `frontend/` — Vite + React 18 + TypeScript + Tailwind CSS (port 5173)
- `backend/` — Python 3.12 + FastAPI (port 8000, docs at /docs)
- **DB:** Supabase + pgvector | **AI:** Claude Sonnet | **Graph:** Cytoscape.js

## Key Commands
```bash
docker compose up --build      # full stack
cd frontend && npm run dev     # frontend only
cd backend && uvicorn app.main:app --reload  # backend only
```

## Code Map
| Path | Purpose |
|------|---------|
| `backend/app/main.py` | FastAPI entry point |
| `backend/app/api/routes/` | API endpoints |
| `backend/app/core/config.py` | Settings / env vars |
| `frontend/src/App.tsx` | React root |
| `frontend/src/pages/` | Route pages |
| `frontend/src/components/` | Shared UI components |

## DB Schema
- `logs` — activity entries (book, chapter, area, date)
- `insights` — distilled knowledge + embeddings (vector 1536)
- `connections` — graph edges between insights

## Agent Architecture
1. **Socratic Agent** — orchestrator, asks questions, detects intent
2. **Connections Agent** — background, finds concept relationships
3. **RAG Agent** — semantic search over knowledge base
4. **Researcher Agent** — Perplexity API for scripts
5. **Writer Agent** — combines RAG + research into scripts

## Conventions
- Backend: async FastAPI routes, Pydantic v2 models, env via `core/config.py`
- Frontend: functional components, `src/pages/` for routes, `src/components/` for UI
- No direct DB calls from frontend — always through backend API
