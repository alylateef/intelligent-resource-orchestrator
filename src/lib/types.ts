export type JobSource = "RemoteOK" | "WeWorkRemotely" | "Upwork" | "HN Who's Hiring";

export type MatchStatus = "new" | "drafted" | "approved" | "rejected" | "sent";

export interface Job {
  id: string;
  title: string;
  client: string;
  source: JobSource;
  url: string;
  budget: string;
  postedAt: string; // ISO
  description: string;
  skills: string[];
}

export interface Proposal {
  text: string;
  draftedAt: string; // ISO
  model: string;
}

export interface Match {
  id: string;
  job: Job;
  score: number; // 0-100
  semanticSimilarity: number; // 0-1
  skillsOverlap: string[];
  missingSkills: string[];
  reasoning: string;
  status: MatchStatus;
  proposal?: Proposal | undefined;
}

export interface Profile {
  name: string;
  title: string;
  rate: string;
  location: string;
  bio: string;
  skills: string[];
  portfolio: { label: string; url: string }[];
}

export interface PipelineStats {
  jobsFound: number;
  matched: number;
  drafted: number;
  approved: number;
  sent: number;
  newToday: number;
  avgScore: number;
  scoreDistribution: { range: string; count: number }[];
}

export interface AgentStep {
  name: string;
  tool?: string;
  status: "done" | "running" | "pending" | "failed";
  durationMs?: number;
  detail?: string;
}

export interface AgentRun {
  id: string;
  startedAt: string; // ISO
  finishedAt?: string;
  status: "running" | "done" | "failed";
  jobsFound: number;
  jobsMatched: number;
  proposalsDrafted: number;
  steps: AgentStep[];
  langsmithUrl?: string;
}
