import json
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import func, select
from sse_starlette.sse import EventSourceResponse

from .config import settings
from .db import Job, Match, Profile, Run, Session, init_db
from .graph import _draft_inputs
from .llm import drafter


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    app.state.arq = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    yield
    await app.state.arq.close()


app = FastAPI(title="GigRadar API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins.split(","),
                   allow_methods=["*"], allow_headers=["*"])


def iso(d: datetime | None) -> str | None:
    return d.isoformat() if d else None


def match_out(m: Match) -> dict:
    j = m.job
    return {
        "id": m.id, "score": m.score, "semanticSimilarity": m.semantic_similarity,
        "skillsOverlap": m.skills_overlap, "missingSkills": m.missing_skills,
        "reasoning": m.reasoning, "status": m.status,
        "proposal": {"text": m.proposal_text, "draftedAt": iso(m.proposal_drafted_at), "model": m.proposal_model}
        if m.proposal_text else None,
        "job": {"id": j.id, "title": j.title, "client": j.client, "source": j.source, "url": j.url,
                "budget": j.budget, "postedAt": iso(j.posted_at), "description": j.description, "skills": j.skills},
    }


@app.get("/health")
async def health():
    return {"ok": True}


@app.get("/api/matches")
async def list_matches():
    async with Session() as s:
        rows = (await s.scalars(select(Match).order_by(Match.score.desc()).limit(500))).all()
        return [match_out(m) for m in rows]


@app.get("/api/matches/{mid}")
async def get_match(mid: str):
    async with Session() as s:
        m = await s.get(Match, mid)
        if not m:
            raise HTTPException(404, "Match not found")
        return match_out(m)


class StatusIn(BaseModel):
    status: str
    proposal_text: str | None = None


@app.post("/api/matches/{mid}/status")
async def set_status(mid: str, body: StatusIn):
    if body.status not in {"new", "drafted", "approved", "rejected", "sent"}:
        raise HTTPException(400, "Invalid status")
    async with Session() as s:
        m = await s.get(Match, mid)
        if not m:
            raise HTTPException(404, "Match not found")
        m.status = body.status
        if body.proposal_text is not None and m.proposal_text is not None:
            m.proposal_text = body.proposal_text
        await s.commit()
        return match_out(m)


@app.post("/api/matches/{mid}/draft")
async def draft(mid: str):
    async with Session() as s:
        m = await s.get(Match, mid)
        if not m:
            raise HTTPException(404, "Match not found")
        prof = (await s.get(Profile, 1)).data
        inputs = _draft_inputs(m, prof)

    async def gen():
        text = ""
        async for chunk in drafter().astream(inputs):
            if chunk.content:
                text += chunk.content
                yield {"data": json.dumps({"token": chunk.content})}
        async with Session() as s2:
            mm = await s2.get(Match, mid)
            mm.proposal_text, mm.proposal_model = text, f"{settings.groq_model} (Groq)"
            mm.proposal_drafted_at = datetime.now(timezone.utc)
            if mm.status == "new":
                mm.status = "drafted"
            await s2.commit()
        yield {"data": "[DONE]"}

    return EventSourceResponse(gen())


@app.get("/api/stats")
async def stats():
    async with Session() as s:
        ms = (await s.scalars(select(Match))).all()
        jobs_found = await s.scalar(select(func.count()).select_from(Job))
    day = datetime.now(timezone.utc) - timedelta(days=1)
    buckets = [(60, 69), (70, 79), (80, 89), (90, 100)]
    return {
        "jobsFound": jobs_found or 0, "matched": len(ms),
        "drafted": sum(1 for m in ms if m.proposal_text),
        "approved": sum(1 for m in ms if m.status in ("approved", "sent")),
        "sent": sum(1 for m in ms if m.status == "sent"),
        "newToday": sum(1 for m in ms if m.job.posted_at and m.job.posted_at >= day),
        "avgScore": round(sum(m.score for m in ms) / len(ms)) if ms else 0,
        "scoreDistribution": [{"range": f"{lo}-{hi}", "count": sum(1 for m in ms if lo <= m.score <= hi)}
                              for lo, hi in buckets],
    }


@app.get("/api/runs")
async def runs():
    async with Session() as s:
        rows = (await s.scalars(select(Run).order_by(Run.started_at.desc()).limit(30))).all()
    return [{"id": r.id, "startedAt": iso(r.started_at), "finishedAt": iso(r.finished_at), "status": r.status,
             "jobsFound": r.jobs_found, "jobsMatched": r.jobs_matched, "proposalsDrafted": r.proposals_drafted,
             "steps": r.steps, "langsmithUrl": r.langsmith_url} for r in rows]


@app.post("/api/runs")
async def trigger_run():
    job = await app.state.arq.enqueue_job("scan")
    return {"queued": bool(job)}


@app.get("/api/profile")
async def get_profile():
    async with Session() as s:
        return (await s.get(Profile, 1)).data


class ProfileIn(BaseModel):
    name: str
    title: str
    rate: str
    location: str
    bio: str
    skills: list[str]
    portfolio: list[dict]


@app.put("/api/profile")
async def put_profile(p: ProfileIn):
    async with Session() as s:
        row = await s.get(Profile, 1)
        row.data = p.model_dump()
        await s.commit()
        return row.data
