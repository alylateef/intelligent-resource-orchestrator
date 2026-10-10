# RepoPilot — AI Codebase Onboarding Agent

Chat with any real public GitHub repo: it clones, chunks, and embeds the code into Chroma, then a LangGraph agent answers questions ("where is auth handled?", "what breaks if I change this function?") with file/line citations. Groq powers fast multi-step reasoning. No dummy data — it works on real repos the user picks.

## Architecture (two repos)

```text
React/TS frontend (this workspace)  ──REST/SSE──▶  FastAPI backend (separate repo)
                                                      │
                              LangGraph agent (triage → retrieve → reason → answer)
                                                      │
                          Groq API (llama-3.3-70b) · Chroma (vectors) · Postgres (repos, chats, citations) · Redis (job queue for indexing) · Docker Compose
```

## Frontend — built in this workspace (TanStack Start + React 19 + Tailwind v4 + shadcn)

1. **Home (`/`)** — paste a GitHub URL → kicks off indexing; list of indexed repos with status (indexing/ready/failed), file counts, last indexed time.
2. **Chat (`/repo/$id`)** — the star screen:
   - Streaming chat answers with inline file/line citations; click a citation → code viewer with highlighted lines.
   - Agent trace panel: shows each LangGraph step + tool calls (vector search, file read, dependency lookup) as they stream.
   - Suggested questions per repo.
3. **Repo overview (`/repo/$id/overview`)** — auto-generated architecture summary, directory tree, key modules, dependency stats.
4. **Design** — dark IDE-inspired aesthetic: monospace code, syntax highlighting, semantic status colors.
5. **Data layer** — a typed API client module pointing at the FastAPI base URL (env var `VITE_API_URL`); includes a dev-mode simulated stream so the UI is demoable before the backend is connected. Real Groq/Chroma data flows once the backend runs.

## Backend blueprint — delivered as a ready-to-run skeleton (`backend/` folder + docs)

- **FastAPI**: REST endpoints (index repo, list repos, chat) + SSE streaming for agent runs.
- **LangChain + LangGraph**: agent graph — query triage → Chroma retrieval tool → file/AST tools → answer composer with citations; human-in-the-loop optional for destructive answers.
- **Groq**: `llama-3.3-70b-versatile` via `langchain-groq` for reasoning; Groq's speed makes multi-step agent loops feel real-time.
- **Chroma**: per-repo collections, code-aware chunking (by function/class), embeddings via a free local model (sentence-transformers) so no extra API cost.
- **Postgres**: repos, conversations, messages, citations.
- **Redis + Celery (or arq)**: background indexing jobs (clone → chunk → embed).
- **Docker Compose**: one command spins up api + worker + postgres + redis + chroma.
- **LangSmith**: tracing on every agent run; eval dataset for answer quality.
- Requires a free Groq API key (console.groq.com) — user adds it to `.env`.

## Technical notes

- This workspace builds only the frontend; Python backend is a separate folder/repo you run locally with Docker. The frontend works standalone in demo mode and switches to the real backend via one env var.
- Every route gets its own `head()` metadata.

## Resume framing

"Built RepoPilot: a LangGraph agent that onboards engineers onto any codebase — clones and embeds repos into Chroma (code-aware chunking), answers questions with file/line citations over Groq-hosted Llama 3.3 70B, FastAPI + SSE streaming, Redis job queue, Postgres, Docker Compose, LangSmith tracing/evals, React/TypeScript IDE-style frontend."
