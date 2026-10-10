# AI SRE Copilot — Resume-Grade Agentic AI Project

An autonomous incident-investigation agent: when an alert fires, it investigates logs, metrics, and deploy history, correlates causes, and produces a root-cause report with a suggested fix — with a live agent-trace dashboard.

## What we build in this workspace (React + TypeScript, TanStack Start)

1. **Dashboard home (`/`)** — fleet/service health overview, active incidents list, alert feed.
2. **Incident detail (`/incidents/$id`)** — the star screen:
   - Live streaming agent trace (planner → log investigator → metrics investigator → deploy correlator → report writer), rendered as a step timeline with tool calls.
   - Final root-cause report with evidence citations and suggested remediation.
   - Approve/reject human-in-the-loop controls.
3. **Services (`/services`)** — service registry with health, recent deploys, error rates (charts).
4. **Reports (`/reports`)** — archive of generated postmortems, searchable.
5. **Simulated backend layer** — a typed mock API module that streams realistic agent events (SSE-like async generator), so the whole demo works end-to-end without the Python backend. Swapping in the real FastAPI later means changing one data-access module.
6. **Design** — dark, observability-tool aesthetic (think Datadog/LangSmith): dense data, monospace accents for logs/traces, status colors via semantic tokens, charts via recharts.

## Backend blueprint (delivered as docs + code skeleton, runs outside this workspace)

- `ARCHITECTURE.md` + a `backend/` skeleton you run locally with Docker Compose:
  - **FastAPI** — REST + SSE streaming endpoint for agent runs.
  - **LangGraph** — multi-agent graph: supervisor, log-analysis agent, metrics agent, deploy-correlation agent, report writer; human-in-the-loop interrupt before publishing a report.
  - **LangSmith** — tracing + evals on report quality.
  - **Postgres** — incidents, services, deploys, reports (pgvector for log-embedding search).
  - **Redis** — task queue + caching of investigation results.
  - **Docker Compose** — one-command local stack.
- The frontend's data module documents the exact API contract the FastAPI app must implement.

## Technical notes

- Stack here is fixed: TanStack Start + React 19 + Tailwind v4 + shadcn. No Python runs in this workspace; the backend is a separate repo you present alongside.
- Streaming simulated with async generators client-side; real version uses SSE from FastAPI.
- Seeded with realistic demo data: 4 services, ~12 incidents, deploy history, synthetic logs/metrics.

## Resume framing

"Built an autonomous SRE copilot: LangGraph multi-agent system that investigates production incidents across logs/metrics/deploys and drafts root-cause reports with human-in-the-loop approval. FastAPI + SSE streaming, Postgres/pgvector, Redis queue, Docker; React/TypeScript observability dashboard; LangSmith tracing and evals."
