"""LangGraph pipeline: scrape -> dedupe -> embed -> match -> score -> draft."""
import asyncio
import time
import uuid
from datetime import datetime, timezone
from typing import TypedDict

import httpx
from langchain_core.documents import Document
from langgraph.graph import END, StateGraph
from sqlalchemy import select

from .config import settings
from .db import Job, Match, Profile, Run, Session
from .llm import drafter, jobs_store, profile_text, scorer
from .scrapers import SOURCES


class State(TypedDict, total=False):
    run_id: str
    profile: dict
    scraped: list[dict]
    new_jobs: list[dict]
    candidates: list[tuple[dict, float]]
    scored: list[dict]
    drafted: int


async def _step(run_id: str, name: str, tool: str, fn, detail_fn):
    t = time.perf_counter()
    async with Session() as s:
        run = await s.get(Run, run_id)
        run.steps = [*run.steps, {"name": name, "tool": tool, "status": "running"}]
        await s.commit()
    try:
        result = await fn()
        status, detail = "done", detail_fn(result)
    except Exception as e:  # record failure on the step, then re-raise
        status, detail, result = "failed", str(e)[:300], None
    async with Session() as s:
        run = await s.get(Run, run_id)
        steps = list(run.steps)
        steps[-1] = {**steps[-1], "status": status, "durationMs": int((time.perf_counter() - t) * 1000), "detail": detail}
        run.steps = steps
        await s.commit()
    if status == "failed":
        raise RuntimeError(detail)
    return result


async def scrape(state: State) -> State:
    async def go():
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as c:
            res = await asyncio.gather(*(f(c) for f in SOURCES.values()), return_exceptions=True)
        return [j for r in res if isinstance(r, list) for j in r]
    jobs = await _step(state["run_id"], "Scrape job boards", "httpx/feedparser", go, lambda r: f"{len(r)} postings")
    return {"scraped": jobs}


async def dedupe(state: State) -> State:
    async def go():
        ids = [j["id"] for j in state["scraped"]]
        async with Session() as s:
            seen = set((await s.scalars(select(Job.id).where(Job.id.in_(ids)))).all())
            fresh = [j for j in state["scraped"] if j["id"] not in seen and j["url"]][: settings.max_jobs_per_run]
            for j in fresh:
                s.add(Job(**j))
            await s.commit()
            prof = (await s.get(Profile, 1)).data
        return fresh, prof
    fresh, prof = await _step(state["run_id"], "Dedupe (Postgres)", "postgres", go, lambda r: f"{len(r[0])} new")
    return {"new_jobs": fresh, "profile": prof}


async def embed_and_match(state: State) -> State:
    async def go():
        if not state["new_jobs"]:
            return []
        store = jobs_store()
        docs = [Document(page_content=f"{j['title']}\n{j['description'][:4000]}", metadata={"job_id": j["id"]})
                for j in state["new_jobs"]]
        await asyncio.to_thread(store.add_documents, docs, ids=[j["id"] for j in state["new_jobs"]])
        hits = await asyncio.to_thread(store.similarity_search_with_relevance_scores,
                                       profile_text(state["profile"]), k=len(docs),
                                       filter={"job_id": {"$in": [j["id"] for j in state["new_jobs"]]}})
        by_id = {j["id"]: j for j in state["new_jobs"]}
        return [(by_id[d.metadata["job_id"]], sim) for d, sim in hits if sim >= settings.min_similarity]
    cands = await _step(state["run_id"], "Embed + semantic match", "chroma", go, lambda r: f"{len(r)} above threshold")
    return {"candidates": cands}


async def score(state: State) -> State:
    async def go():
        chain, prof = scorer(), profile_text(state["profile"])
        sem = asyncio.Semaphore(4)

        async def one(job, sim):
            async with sem:
                fs = await chain.ainvoke({"profile": prof, "title": job["title"], "client": job["client"],
                                          "budget": job["budget"], "description": job["description"][:6000]})
                return {"job": job, "sim": sim, "fit": fs}
        res = await asyncio.gather(*(one(j, s) for j, s in state["candidates"]), return_exceptions=True)
        ok = [r for r in res if isinstance(r, dict)]
        async with Session() as s:
            for r in ok:
                f = r["fit"]
                s.add(Match(id=uuid.uuid4().hex[:12], job_id=r["job"]["id"], score=f.score,
                            semantic_similarity=round(r["sim"], 3), skills_overlap=f.skills_overlap,
                            missing_skills=f.missing_skills, reasoning=f.reasoning))
            await s.commit()
        return ok
    scored = await _step(state["run_id"], "Score fit (Groq)", settings.groq_model, go, lambda r: f"{len(r)} scored")
    return {"scored": scored}


async def draft(state: State) -> State:
    async def go():
        n = 0
        async with Session() as s:
            rows = (await s.scalars(select(Match).where(
                Match.job_id.in_([r["job"]["id"] for r in state["scored"]]),
                Match.score >= settings.auto_draft_score))).all()
            for m in rows:
                await draft_for_match(m, state["profile"])
                n += 1
            await s.commit()
        return n
    n = await _step(state["run_id"], "Draft proposals", settings.groq_model, go, lambda r: f"{r} drafted")
    return {"drafted": n}


async def draft_for_match(m: Match, profile: dict) -> None:
    msg = await drafter().ainvoke(_draft_inputs(m, profile))
    m.proposal_text, m.proposal_model = msg.content, f"{settings.groq_model} (Groq)"
    m.proposal_drafted_at, m.status = datetime.now(timezone.utc), "drafted" if m.status == "new" else m.status


def _draft_inputs(m: Match, profile: dict) -> dict:
    return {"profile": profile_text(profile), "title": m.job.title, "client": m.job.client, "budget": m.job.budget,
            "description": m.job.description[:6000], "overlap": ", ".join(m.skills_overlap),
            "gaps": ", ".join(m.missing_skills) or "none"}


def build_graph():
    g = StateGraph(State)
    for name, fn in [("scrape", scrape), ("dedupe", dedupe), ("match", embed_and_match), ("score", score), ("draft", draft)]:
        g.add_node(name, fn)
    g.set_entry_point("scrape")
    g.add_edge("scrape", "dedupe")
    g.add_conditional_edges("dedupe", lambda s: "match" if s["new_jobs"] else END)
    g.add_edge("match", "score")
    g.add_edge("score", "draft")
    g.add_edge("draft", END)
    return g.compile()


async def run_pipeline() -> str:
    run_id = uuid.uuid4().hex[:10]
    async with Session() as s:
        s.add(Run(id=run_id, steps=[]))
        await s.commit()
    status, final = "done", {}
    try:
        final = await build_graph().ainvoke({"run_id": run_id}, config={"run_name": f"gigradar-run-{run_id}"})
    except Exception:
        status = "failed"
    async with Session() as s:
        run = await s.get(Run, run_id)
        run.status, run.finished_at = status, datetime.now(timezone.utc)
        run.jobs_found = len(final.get("scraped", []))
        run.jobs_matched = len(final.get("scored", []))
        run.proposals_drafted = final.get("drafted", 0)
        await s.commit()
    return run_id
