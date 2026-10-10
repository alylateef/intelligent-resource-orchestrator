# GigRadar — Autonomous Freelance Job Hunter

An agent that continuously scans real job boards (RemoteOK, WeWorkRemotely, Upwork RSS, HN "Who is hiring"), matches postings against your profile, scores fit, and drafts personalized proposals you approve with one click. Real data, no dummy content.

## Architecture (two repos)

```text
React/TS frontend (this workspace) ──REST/SSE──▶ FastAPI backend (separate repo)
                                                      │
              LangGraph pipeline: scrape → dedupe → embed/match (Chroma) → score → draft proposal → human approve
                                                      │
              Groq (llama-3.3-70b reasoning + Whisper if voice notes) · Chroma (job + profile vectors)
              Postgres (jobs, matches, proposals, profile) · Redis (scheduler/queue) · Docker Compose
```

## Frontend — built in this workspace (TanStack Start + React 19 + Tailwind v4 + shadcn)

1. **Dashboard (`/`)** — new matches today, fit-score distribution, pipeline stats (found → matched → drafted → approved → sent), recent high-score matches.
2. **Matches (`/matches`)** — filterable feed of real job postings with fit score, matched skills, salary/ budget, source. Sort by score, filter by source/min score.
3. **Match detail (`/matches/$id`)** — full posting, why-it-matched breakdown (skills overlap, semantic similarity), and the **drafted proposal** with streaming regeneration, inline editing, and Approve / Reject / Regenerate actions.
4. **Profile (`/profile`)** — your skills, portfolio links, rate, past work — the text the agent embeds into Chroma and matches against.
5. **Agent activity (`/activity`)** — live run log: each LangGraph step, tool calls, LangSmith trace links, jobs processed per run.
6. **Design** — dark, sharp command-center aesthetic (Linear/Vercel feel): dense tables, score badges, monospace accents, semantic status colors.
7. **Data layer** — typed API client pointing at `VITE_API_URL` (the FastAPI backend); dev-mode simulated stream so the UI demos before the backend is connected.

## Backend blueprint — ready-to-run `backend/` skeleton + docs

- **FastAPI**: REST (jobs, matches, proposals, profile, approve/reject) + SSE for live agent-run streaming.
- **LangGraph**: scheduled pipeline graph — source scrapers (RSS/JSON APIs of real boards) → dedupe (Postgres unique keys) → chunk+embed into Chroma → semantic match vs profile → Groq fit-scoring with reasoning → proposal drafting (references the client's actual requirements) → human-in-the-loop interrupt awaiting approval.
- **Groq**: `llama-3.3-70b-versatile` via `langchain-groq` — sub-second scoring/drafting per job.
- **Chroma**: job embeddings + profile/portfolio embeddings; similarity pre-filter before LLM scoring (cheap + fast).
- **Postgres**: jobs, matches, proposals, profile, run history.
- **Redis + arq/celery beat**: scheduled scan every N minutes; bounded batch per run, idempotent dedupe, single-flight lock.
- **Docker Compose**: api + worker + postgres + redis + chroma in one command.
- **LangSmith**: tracing every run; eval set for proposal quality.
- Requires a free Groq API key (console.groq.com) in `.env`.

## Technical notes

- This workspace builds only the frontend; the Python backend is a separate folder you run locally with Docker. Frontend works standalone in demo mode, switches to the real backend via one env var.
- Every route gets its own `head()` metadata.

## Resume framing

"Built GigRadar: an autonomous LangGraph agent that scans real freelance job boards on a schedule, embeds postings into Chroma, semantically matches them against my profile, scores fit with Groq-hosted Llama 3.3 70B, and drafts personalized proposals with human-in-the-loop approval. FastAPI + SSE, Redis task queue, Postgres, Docker Compose, LangSmith tracing/evals, React/TypeScript command-center dashboard."
