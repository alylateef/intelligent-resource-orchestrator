# GigRadar backend

FastAPI + LangGraph + Groq + Chroma + Postgres + Redis (arq), all via Docker Compose.

## Run

```bash
cd backend
cp .env.example .env          # add your free Groq key from console.groq.com
docker compose up --build
```

- API: http://localhost:8000 (docs at `/docs`)
- The worker scans RemoteOK, WeWorkRemotely and HN "Who is hiring" on startup and every `SCAN_INTERVAL_MINUTES`.
- Trigger a scan manually: `curl -X POST localhost:8000/api/runs`

Point the frontend at it with `VITE_API_URL=http://localhost:8000`.

## Pipeline (LangGraph)

scrape → dedupe (Postgres primary keys) → embed + similarity filter (Chroma, MiniLM) → fit scoring (Groq Llama 3.3 70B, structured output) → auto-draft proposals for score ≥ `AUTO_DRAFT_SCORE` → human approve/reject in the UI.

Each step is recorded on the run (status, duration, detail) and shown on the Activity page. Set `LANGCHAIN_TRACING_V2=true` + `LANGCHAIN_API_KEY` for LangSmith traces. A Redis lock prevents overlapping scans; each run is capped by `MAX_JOBS_PER_RUN`.
