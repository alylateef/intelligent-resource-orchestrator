import { queryOptions } from "@tanstack/react-query";
import { demoMatches, demoProfile, demoRuns } from "./demo-data";
import type { AgentRun, Match, MatchStatus, PipelineStats, Profile } from "./types";

/**
 * Typed client for the GigRadar FastAPI backend.
 * Set VITE_API_URL (e.g. http://localhost:8000) to use live data.
 * Without it, the app runs in demo mode on in-memory seed data.
 */
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
export const isDemo = !API_URL;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ---- demo store (mutable in memory) ----
let matches = structuredClone(demoMatches);
let profile = structuredClone(demoProfile);
const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

function computeStats(list: Match[]): PipelineStats {
  const buckets = ["60-69", "70-79", "80-89", "90-100"];
  return {
    jobsFound: 1284,
    matched: list.length,
    drafted: list.filter((m) => m.proposal).length,
    approved: list.filter((m) => m.status === "approved" || m.status === "sent").length,
    sent: list.filter((m) => m.status === "sent").length,
    newToday: list.filter((m) => Date.now() - new Date(m.job.postedAt).getTime() < 86400_000).length,
    avgScore: Math.round(list.reduce((s, m) => s + m.score, 0) / Math.max(list.length, 1)),
    scoreDistribution: buckets.map((range) => {
      const [lo, hi] = range.split("-").map(Number);
      return { range, count: list.filter((m) => m.score >= lo && m.score <= hi).length };
    }),
  };
}

export const api = {
  async getMatches(): Promise<Match[]> {
    if (!isDemo) return http("/api/matches");
    await delay();
    return [...matches].sort((a, b) => b.score - a.score);
  },
  async getMatch(id: string): Promise<Match | null> {
    if (!isDemo) return http(`/api/matches/${id}`);
    await delay();
    return matches.find((m) => m.id === id) ?? null;
  },
  async getStats(): Promise<PipelineStats> {
    if (!isDemo) return http("/api/stats");
    await delay();
    return computeStats(matches);
  },
  async getRuns(): Promise<AgentRun[]> {
    if (!isDemo) return http("/api/runs");
    await delay();
    return demoRuns;
  },
  async getProfile(): Promise<Profile> {
    if (!isDemo) return http("/api/profile");
    await delay();
    return profile;
  },
  async saveProfile(p: Profile): Promise<Profile> {
    if (!isDemo) return http("/api/profile", { method: "PUT", body: JSON.stringify(p) });
    await delay(300);
    profile = p;
    return p;
  },
  async setStatus(id: string, status: MatchStatus, proposalText?: string): Promise<Match> {
    if (!isDemo)
      return http(`/api/matches/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status, proposal_text: proposalText }),
      });
    await delay(200);
    matches = matches.map((m) =>
      m.id === id
        ? { ...m, status, proposal: m.proposal && proposalText != null ? { ...m.proposal, text: proposalText } : m.proposal }
        : m,
    );
    return matches.find((m) => m.id === id)!;
  },
  /** Streams a freshly drafted proposal token-by-token (SSE in live mode). */
  async *draftProposal(id: string, signal?: AbortSignal): AsyncGenerator<string> {
    if (!isDemo) {
      const res = await fetch(`${API_URL}/api/matches/${id}/draft`, { method: "POST", signal });
      if (!res.ok || !res.body) throw new Error(`API ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const ev of events) {
          const data = ev.replace(/^data: ?/gm, "");
          if (data === "[DONE]") return;
          yield JSON.parse(data).token as string;
        }
      }
      return;
    }
    const m = matches.find((x) => x.id === id);
    if (!m) return;
    const text = demoDraft(m);
    for (const word of text.split(/(\s+)/)) {
      if (signal?.aborted) return;
      await delay(18);
      yield word;
    }
    matches = matches.map((x) =>
      x.id === id
        ? { ...x, status: x.status === "new" ? "drafted" : x.status, proposal: { text, draftedAt: new Date().toISOString(), model: "llama-3.3-70b-versatile (Groq)" } }
        : x,
    );
  },
};

function demoDraft(m: Match) {
  const first = m.job.client.split(/[—(:]/)[0].replace("HN", "").trim();
  return `Hi ${first} team,

I read your post for "${m.job.title}" and it lines up closely with what I build: ${m.skillsOverlap.slice(0, 4).join(", ")}.

What I'd do first:
1. Clarify the success metric with you and turn it into a small evaluation set, so every change is measured.
2. Ship a thin end-to-end version in week one — ${m.job.skills.includes("FastAPI") ? "a FastAPI service" : "a working prototype"} you can actually click through.
3. Iterate on quality with tracing in LangSmith, so you can see exactly why the system made each decision.
${m.missingSkills.length ? `\nOn ${m.missingSkills.join(" and ")}: I haven't used it in production yet, but my stack is modular and I ramp quickly — happy to scope that piece honestly on a call.\n` : ""}
Budget (${m.job.budget}) works for me. Could we do a 20-minute call this week?

— ${profile.name.split(" ")[0]}`;
}

export const matchesQuery = () => queryOptions({ queryKey: ["matches"], queryFn: api.getMatches });
export const matchQuery = (id: string) => queryOptions({ queryKey: ["match", id], queryFn: () => api.getMatch(id) });
export const statsQuery = () => queryOptions({ queryKey: ["stats"], queryFn: api.getStats });
export const runsQuery = () => queryOptions({ queryKey: ["runs"], queryFn: api.getRuns });
export const profileQuery = () => queryOptions({ queryKey: ["profile"], queryFn: api.getProfile });
