from functools import lru_cache

import chromadb
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from pydantic import BaseModel, Field

from .config import settings


@lru_cache
def llm(temperature: float = 0.2) -> ChatGroq:
    return ChatGroq(model=settings.groq_model, api_key=settings.groq_api_key, temperature=temperature)


@lru_cache
def jobs_store() -> Chroma:
    client = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
    emb = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    return Chroma(client=client, collection_name="jobs", embedding_function=emb,
                  collection_metadata={"hnsw:space": "cosine"})


class FitScore(BaseModel):
    score: int = Field(ge=0, le=100, description="Overall fit 0-100")
    skills_overlap: list[str]
    missing_skills: list[str]
    reasoning: str = Field(description="2-3 sentences, concrete, citing job requirements")


SCORE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are a strict technical recruiter. Score how well the freelancer fits the job. "
               "Penalize missing must-have skills, seniority mismatch, and on-site requirements. Be honest."),
    ("human", "FREELANCER PROFILE:\n{profile}\n\nJOB: {title} at {client}\nBudget: {budget}\n\n{description}"),
])

DRAFT_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "Write a concise, specific freelance proposal (150-220 words). Reference the client's actual "
               "requirements, propose a concrete first step, be honest about gaps, no fluff or clichés. "
               "Sign off with the freelancer's first name."),
    ("human", "FREELANCER:\n{profile}\n\nJOB: {title} at {client} ({budget})\n\n{description}\n\n"
              "Overlap: {overlap}\nGaps: {gaps}"),
])


def scorer():
    return SCORE_PROMPT | llm().with_structured_output(FitScore)


def drafter():
    return DRAFT_PROMPT | llm(0.6)


def profile_text(p: dict) -> str:
    return f"{p['name']} — {p['title']} ({p['rate']}, {p['location']})\nSkills: {', '.join(p['skills'])}\n{p['bio']}"
