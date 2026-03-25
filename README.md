<div align="center">
  <img src="https://noeosorio.com/logo.png" alt="Noe Osorio" width="72" />

  <h1>🧠 KOS — Knowledge Operating System</h1>
  <p><em>Your mind's operating system. A second brain that generates knowledge, not just stores it.</em></p>

  [![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=flat-square)](https://react.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://typescriptlang.org)
  [![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white&style=flat-square)](https://vitejs.dev)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)](https://tailwindcss.com)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi&logoColor=white&style=flat-square)](https://fastapi.tiangolo.com)
  [![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white&style=flat-square)](https://python.org)
  [![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white&style=flat-square)](https://docker.com)
  [![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?logo=supabase&logoColor=white&style=flat-square)](https://supabase.com)
  [![Claude](https://img.shields.io/badge/Claude-Sonnet-CC785C?logo=anthropic&logoColor=white&style=flat-square)](https://anthropic.com)
  [![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
</div>

---

## What is KOS?

KOS is a conversational knowledge system built around a simple insight: **you learn by talking, not by reading in silence**. Instead of dumping information into a note-taking app, you talk to KOS — and KOS asks you the right questions so *you* generate the knowledge yourself.

Every insight you surface gets saved, embedded, and connected into a living graph of your mind. Over time, that graph becomes a creative engine: generate scripts in your voice, review with spaced repetition, chat with a version of yourself that remembers everything.

> *"You read chapter 3 of Thinking Fast and Slow — how does that connect to what you learned about team decisions last week?"*

---

## System Architecture

```
Capa 0 — Input         Conversación libre (voz + texto). Modo socrático.
Capa 1 — Activity Log  Qué hiciste: libro, capítulo, autor, área, fecha.
Capa 2 — Knowledge     Qué aprendiste, en tus palabras. Aquí nacen conexiones.

Applications
├── Chat with your brain     (RAG sobre tu knowledge base)
├── Script generator         (50% tu red + 50% investigación web)
├── Weekly exams             (spaced repetition con tu contenido)
└── Learning timeline        (trazabilidad visual)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Python 3.12 + FastAPI |
| Database | Supabase + pgvector |
| AI | Claude API (Sonnet) |
| Embeddings | OpenAI text-embedding-3-small |
| Knowledge Graph | Cytoscape.js |
| Web Research | Perplexity API |
| Infrastructure | Docker Compose |

---

## Project Structure

```
kos/
├── frontend/          # Vite + React + TS + Tailwind
├── backend/           # FastAPI + Python
├── docker-compose.yml # Full stack orchestration
└── CLAUDE.md          # AI assistant context
```

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.12+ (for local backend dev)

### Run with Docker

```bash
cp .env.example .env          # fill in your API keys
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

### Local Development

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

---

## Roadmap

- [x] Project scaffold (monorepo, Docker, CI-ready)
- [ ] **Week 1** — Socratic chat MVP + activity log + auto-save
- [ ] **Week 2** — Interactive knowledge graph (Cytoscape.js)
- [ ] **Week 3** — RAG pipeline + chat with your brain
- [ ] **Week 4** — Script generator (RAG + Perplexity)
- [ ] **Week 5–6** — Spaced repetition exams + timeline PWA

---

## Author

**Noe Osorio**
- Website: [noeosorio.com](https://noeosorio.com)
- Email: [business@noeosorio.com](mailto:business@noeosorio.com)
- Built with intention, for long-term learning.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://noeosorio.com">Noe Osorio</a></sub>
</div>
