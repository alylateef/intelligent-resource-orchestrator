import type { AgentRun, Match, Profile } from "./types";

// Demo-mode seed used only when VITE_API_URL is not set.
// With the FastAPI backend running, all data comes from live job boards.

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const demoProfile: Profile = {
  name: "Ali Latif",
  title: "AI Engineer — LLM agents & RAG systems",
  rate: "$45–65/hr",
  location: "Karachi, PK (remote, UTC+5)",
  bio: "I build production LLM applications: multi-agent workflows with LangGraph, retrieval pipelines with vector databases, and FastAPI backends deployed with Docker. Focused on reliable, observable AI systems with tracing and evals.",
  skills: [
    "Python", "LangChain", "LangGraph", "LangSmith", "FastAPI", "RAG", "Chroma",
    "PostgreSQL", "Redis", "Docker", "TypeScript", "React", "Groq", "OpenAI API",
  ],
  portfolio: [
    { label: "GitHub", url: "https://github.com/" },
    { label: "GigRadar (this project)", url: "https://github.com/" },
  ],
};

const P = (text: string, h: number) => ({ text, draftedAt: hoursAgo(h), model: "llama-3.3-70b-versatile (Groq)" });

export const demoMatches: Match[] = [
  {
    id: "m1",
    score: 94,
    semanticSimilarity: 0.89,
    status: "drafted",
    skillsOverlap: ["LangGraph", "RAG", "FastAPI", "PostgreSQL", "Docker"],
    missingSkills: ["AWS Bedrock"],
    reasoning:
      "Near-exact stack match: client needs a multi-agent RAG system over legal documents with FastAPI + Postgres. Candidate has shipped LangGraph agents and vector retrieval. Only gap is Bedrock, which is swappable for the existing LLM layer.",
    job: {
      id: "j1",
      title: "Senior LLM Engineer — Multi-agent RAG for legal contracts",
      client: "Clauseworks (Series A legaltech)",
      source: "RemoteOK",
      url: "https://remoteok.com",
      budget: "$70–90k / yr, contract-to-hire",
      postedAt: hoursAgo(2),
      skills: ["LangGraph", "RAG", "FastAPI", "PostgreSQL", "Docker", "AWS Bedrock"],
      description:
        "We're building an AI paralegal that reviews contracts, extracts clauses, and flags risk against our playbooks. You'll own the agent architecture (LangGraph), the retrieval layer, and the FastAPI service. Must care about evals and tracing — we use LangSmith. Bonus: experience with Bedrock.",
    },
    proposal: P(
      `Hi Clauseworks team,

Your AI paralegal is very close to what I build day to day. I recently shipped a LangGraph pipeline that routes work across specialised agents (retrieve → analyse → draft) with a human-approval step before anything is published — the same shape as clause extraction → risk flagging → reviewer sign-off.

How I'd approach your first 30 days:
1. Clause extraction as a typed LangGraph node with structured outputs, evaluated against a small gold set of your contracts in LangSmith.
2. Playbook retrieval: chunk playbooks by rule, embed them, and retrieve per-clause so every risk flag cites the exact rule it violates.
3. FastAPI service with SSE streaming so reviewers watch the analysis happen live.

On Bedrock: my LLM layer is provider-agnostic (LangChain chat models), so switching to Bedrock-hosted Claude is a config change, not a rewrite.

Happy to walk through a live demo of a similar agent this week.

— Ali`,
      1,
    ),
  },
  {
    id: "m2",
    score: 88,
    semanticSimilarity: 0.84,
    status: "drafted",
    skillsOverlap: ["Python", "LangChain", "Redis", "FastAPI"],
    missingSkills: ["Kubernetes"],
    reasoning:
      "Strong fit for an AI customer-support agent with escalation. Candidate's human-in-the-loop LangGraph experience maps directly. Kubernetes is nice-to-have per the post.",
    job: {
      id: "j2",
      title: "Build an AI support agent with human escalation (Zendesk)",
      client: "Pallet & Co — e-commerce ops",
      source: "Upwork",
      url: "https://upwork.com",
      budget: "$6,000 fixed",
      postedAt: hoursAgo(5),
      skills: ["Python", "LangChain", "Redis", "FastAPI", "Kubernetes"],
      description:
        "Need an agent that answers tier-1 tickets from our help center and order DB, escalates to humans when confidence is low, and drafts replies for agents to approve inside Zendesk. Redis queue preferred. Kubernetes nice to have.",
    },
    proposal: P(
      `Hi Pallet team,

An agent that answers tier-1 tickets but knows when to hand off is exactly the pattern I like building. My plan:

• Retrieval over your help center + a read-only order lookup tool, so answers are grounded in real order status.
• A confidence gate in LangGraph: low-confidence or refund-related tickets go to a human with a drafted reply instead of auto-sending.
• Redis queue for incoming Zendesk webhooks so spikes never drop tickets.

Milestone 1 (week 1): read-only agent drafting replies in a Zendesk side panel, with accuracy measured on 200 historical tickets.

I can deploy with Docker today and add Kubernetes manifests if you want them.

— Ali`,
      3,
    ),
  },
  {
    id: "m3",
    score: 81,
    semanticSimilarity: 0.78,
    status: "new",
    skillsOverlap: ["TypeScript", "React", "OpenAI API", "PostgreSQL"],
    missingSkills: ["Next.js", "Stripe"],
    reasoning:
      "Good overlap on AI + full-stack. Frontend framework differs (Next.js vs React/TanStack) but transferable. Payments experience not demonstrated.",
    job: {
      id: "j3",
      title: "Full-stack engineer for AI writing SaaS",
      client: "Draftly",
      source: "WeWorkRemotely",
      url: "https://weworkremotely.com",
      budget: "$55/hr, 30 hrs/wk",
      postedAt: hoursAgo(8),
      skills: ["TypeScript", "React", "Next.js", "OpenAI API", "PostgreSQL", "Stripe"],
      description:
        "Join a 4-person team building an AI writing assistant for marketers. You'll ship features end-to-end: streaming generation UI, prompt pipelines, usage billing with Stripe.",
    },
  },
  {
    id: "m4",
    score: 77,
    semanticSimilarity: 0.74,
    status: "approved",
    skillsOverlap: ["Python", "RAG", "Chroma", "LangSmith"],
    missingSkills: ["Airflow"],
    reasoning:
      "Internal knowledge-base RAG with eval focus. Strong match on retrieval + evaluation; Airflow orchestration is new but similar to the candidate's scheduled-pipeline work.",
    job: {
      id: "j4",
      title: "RAG engineer — internal knowledge assistant (fintech)",
      client: "HN: Ledgerline (YC W25)",
      source: "HN Who's Hiring",
      url: "https://news.ycombinator.com",
      budget: "$120–150k + equity",
      postedAt: hoursAgo(20),
      skills: ["Python", "RAG", "Chroma", "LangSmith", "Airflow"],
      description:
        "Ledgerline | Remote | Full-time. We need someone to own our internal assistant over policies, runbooks and Slack history. Retrieval quality and evals matter more than flashy UI.",
    },
    proposal: P(
      `Hi Ledgerline,

"Retrieval quality and evals over flashy UI" — agreed. I build RAG systems with Chroma and measure them in LangSmith with labeled question sets before tuning chunking or rerankers.

For your assistant I'd start by building a 100-question eval set from real Slack questions, then iterate on chunking and hybrid search with every change scored.

— Ali`,
      18,
    ),
  },
  {
    id: "m5",
    score: 72,
    semanticSimilarity: 0.7,
    status: "new",
    skillsOverlap: ["Python", "FastAPI", "Docker"],
    missingSkills: ["Computer vision", "PyTorch"],
    reasoning:
      "Backend skills match, but the core of the role is computer vision model training, which isn't in the profile. Worth applying only if interested in CV.",
    job: {
      id: "j5",
      title: "ML backend engineer — document OCR pipeline",
      client: "Scanwise",
      source: "RemoteOK",
      url: "https://remoteok.com",
      budget: "$4,500/mo",
      postedAt: hoursAgo(26),
      skills: ["Python", "FastAPI", "Docker", "PyTorch", "Computer vision"],
      description:
        "Serve and scale our OCR + layout models behind FastAPI. Some model fine-tuning required.",
    },
  },
  {
    id: "m6",
    score: 64,
    semanticSimilarity: 0.61,
    status: "rejected",
    skillsOverlap: ["React", "TypeScript"],
    missingSkills: ["React Native", "Swift"],
    reasoning: "Primarily a mobile role. Low overlap with AI engineering focus.",
    job: {
      id: "j6",
      title: "React Native dev for AI fitness app",
      client: "RepCount",
      source: "Upwork",
      url: "https://upwork.com",
      budget: "$35/hr",
      postedAt: hoursAgo(30),
      skills: ["React Native", "TypeScript", "Swift"],
      description: "Build the mobile client for our AI workout coach. iOS first.",
    },
  },
];

export const demoRuns: AgentRun[] = [
  {
    id: "run_0412",
    startedAt: hoursAgo(0.3),
    finishedAt: hoursAgo(0.28),
    status: "done",
    jobsFound: 47,
    jobsMatched: 6,
    proposalsDrafted: 2,
    langsmithUrl: "https://smith.langchain.com",
    steps: [
      { name: "scrape_sources", tool: "rss + json feeds (4 boards)", status: "done", durationMs: 3120, detail: "47 postings fetched" },
      { name: "dedupe", tool: "postgres unique(source, url)", status: "done", durationMs: 41, detail: "31 new, 16 already seen" },
      { name: "embed_jobs", tool: "chroma.add", status: "done", durationMs: 880, detail: "31 vectors upserted" },
      { name: "semantic_match", tool: "chroma.query(profile)", status: "done", durationMs: 120, detail: "9 above 0.70 similarity" },
      { name: "score_fit", tool: "groq llama-3.3-70b", status: "done", durationMs: 2410, detail: "6 scored ≥ 70" },
      { name: "draft_proposals", tool: "groq llama-3.3-70b", status: "done", durationMs: 3890, detail: "2 drafts for score ≥ 85" },
      { name: "await_approval", tool: "langgraph interrupt", status: "done", detail: "2 proposals waiting for you" },
    ],
  },
  {
    id: "run_0411",
    startedAt: hoursAgo(1.3),
    finishedAt: hoursAgo(1.28),
    status: "done",
    jobsFound: 39,
    jobsMatched: 2,
    proposalsDrafted: 0,
    langsmithUrl: "https://smith.langchain.com",
    steps: [
      { name: "scrape_sources", tool: "rss + json feeds (4 boards)", status: "done", durationMs: 2870, detail: "39 postings fetched" },
      { name: "dedupe", tool: "postgres unique(source, url)", status: "done", durationMs: 38, detail: "8 new" },
      { name: "embed_jobs", tool: "chroma.add", status: "done", durationMs: 310 },
      { name: "semantic_match", tool: "chroma.query(profile)", status: "done", durationMs: 95, detail: "2 above threshold" },
      { name: "score_fit", tool: "groq llama-3.3-70b", status: "done", durationMs: 980 },
      { name: "draft_proposals", tool: "groq llama-3.3-70b", status: "done", durationMs: 0, detail: "none above 85" },
    ],
  },
  {
    id: "run_0410",
    startedAt: hoursAgo(2.3),
    status: "failed",
    jobsFound: 0,
    jobsMatched: 0,
    proposalsDrafted: 0,
    steps: [
      { name: "scrape_sources", tool: "rss + json feeds (4 boards)", status: "failed", durationMs: 10000, detail: "Upwork feed timed out — retried next run" },
    ],
  },
];
