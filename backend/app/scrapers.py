"""Real job-board sources. Each returns normalized dicts; ids are stable for dedupe."""
import hashlib
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser
import httpx
from bs4 import BeautifulSoup

UA = {"User-Agent": "GigRadar/1.0 (job matching agent)"}
KNOWN_SKILLS = [
    "Python", "TypeScript", "JavaScript", "React", "Next.js", "Node.js", "FastAPI", "Django", "Flask",
    "LangChain", "LangGraph", "LLM", "RAG", "OpenAI", "PyTorch", "TensorFlow", "PostgreSQL", "Redis",
    "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Go", "Rust", "Machine Learning", "NLP", "Vector DB",
]


def _clean(html: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", BeautifulSoup(html or "", "html.parser").get_text("\n")).strip()


def _skills(text: str) -> list[str]:
    low = text.lower()
    return [s for s in KNOWN_SKILLS if re.search(rf"(?<![a-z]){re.escape(s.lower())}(?![a-z])", low)]


def _id(source: str, key: str) -> str:
    return f"{source}:{hashlib.sha1(key.encode()).hexdigest()[:16]}"


async def remoteok(client: httpx.AsyncClient) -> list[dict]:
    r = await client.get("https://remoteok.com/api", headers=UA)
    r.raise_for_status()
    out = []
    for j in r.json()[1:]:
        desc = _clean(j.get("description", ""))
        lo, hi = j.get("salary_min"), j.get("salary_max")
        out.append({
            "id": _id("remoteok", str(j["id"])), "title": j.get("position", ""), "client": j.get("company", ""),
            "source": "RemoteOK", "url": j.get("url", ""),
            "budget": f"${lo:,}–${hi:,}/yr" if lo and hi else "Not specified",
            "posted_at": datetime.fromtimestamp(int(j.get("epoch", 0)), tz=timezone.utc),
            "description": desc, "skills": sorted(set(_skills(desc) + [t for t in j.get("tags", []) if t in KNOWN_SKILLS])),
        })
    return out


async def weworkremotely(client: httpx.AsyncClient) -> list[dict]:
    r = await client.get("https://weworkremotely.com/categories/remote-programming-jobs.rss", headers=UA)
    feed = feedparser.parse(r.text)
    out = []
    for e in feed.entries:
        company, _, title = e.title.partition(": ")
        desc = _clean(e.get("summary", ""))
        out.append({
            "id": _id("wwr", e.link), "title": title or e.title, "client": company, "source": "WeWorkRemotely",
            "url": e.link, "budget": "Not specified",
            "posted_at": parsedate_to_datetime(e.published) if e.get("published") else datetime.now(timezone.utc),
            "description": desc, "skills": _skills(desc),
        })
    return out


async def hn_whos_hiring(client: httpx.AsyncClient) -> list[dict]:
    s = await client.get("https://hn.algolia.com/api/v1/search_by_date",
                         params={"query": "Ask HN: Who is hiring?", "tags": "story,author_whoishiring", "hitsPerPage": 1})
    hits = s.json()["hits"]
    if not hits:
        return []
    story = (await client.get(f"https://hn.algolia.com/api/v1/items/{hits[0]['objectID']}")).json()
    out = []
    for c in story.get("children", [])[:150]:
        text = _clean(c.get("text") or "")
        if "remote" not in text.lower() or len(text) < 120:
            continue
        head = text.split("\n")[0]
        parts = [p.strip() for p in head.split("|")]
        out.append({
            "id": _id("hn", str(c["id"])), "title": parts[1] if len(parts) > 1 else head[:80],
            "client": f"HN — {parts[0][:60]}", "source": "HN Who's Hiring",
            "url": f"https://news.ycombinator.com/item?id={c['id']}", "budget": "Not specified",
            "posted_at": datetime.fromisoformat(c["created_at"].replace("Z", "+00:00")),
            "description": text, "skills": _skills(text),
        })
    return out


SOURCES = {"RemoteOK": remoteok, "WeWorkRemotely": weworkremotely, "HN Who's Hiring": hn_whos_hiring}
