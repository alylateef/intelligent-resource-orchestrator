from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from .config import settings

engine = create_async_engine(settings.database_url, pool_pre_ping=True)
Session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


def now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[str] = mapped_column(String, primary_key=True)  # source:external_id (dedupe key)
    title: Mapped[str] = mapped_column(String)
    client: Mapped[str] = mapped_column(String)
    source: Mapped[str] = mapped_column(String, index=True)
    url: Mapped[str] = mapped_column(String, unique=True)
    budget: Mapped[str] = mapped_column(String, default="Not specified")
    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    description: Mapped[str] = mapped_column(Text)
    skills: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Match(Base):
    __tablename__ = "matches"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id"), unique=True)
    score: Mapped[int] = mapped_column(Integer, index=True)
    semantic_similarity: Mapped[float] = mapped_column(Float)
    skills_overlap: Mapped[list] = mapped_column(JSON, default=list)
    missing_skills: Mapped[list] = mapped_column(JSON, default=list)
    reasoning: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="new", index=True)
    proposal_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    proposal_drafted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    proposal_model: Mapped[str | None] = mapped_column(String, nullable=True)
    job: Mapped[Job] = relationship(lazy="joined")


class Profile(Base):
    __tablename__ = "profile"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    data: Mapped[dict] = mapped_column(JSON)


class Run(Base):
    __tablename__ = "runs"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String, default="running")
    jobs_found: Mapped[int] = mapped_column(Integer, default=0)
    jobs_matched: Mapped[int] = mapped_column(Integer, default=0)
    proposals_drafted: Mapped[int] = mapped_column(Integer, default=0)
    steps: Mapped[list] = mapped_column(JSON, default=list)
    langsmith_url: Mapped[str | None] = mapped_column(String, nullable=True)


DEFAULT_PROFILE = {
    "name": "Your Name",
    "title": "AI Engineer",
    "rate": "$60/hr",
    "location": "Remote",
    "bio": "I build production LLM systems: RAG, agents with LangGraph, FastAPI services.",
    "skills": ["Python", "LangChain", "LangGraph", "FastAPI", "RAG", "PostgreSQL", "Docker", "React", "TypeScript"],
    "portfolio": [],
}


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with Session() as s:
        if not await s.get(Profile, 1):
            s.add(Profile(id=1, data=DEFAULT_PROFILE))
            await s.commit()
