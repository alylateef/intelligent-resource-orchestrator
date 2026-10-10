import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { matchesQuery } from "@/lib/api";
import { ScoreBadge, StatusBadge } from "@/components/score-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { timeAgo } from "@/lib/time";
import type { JobSource } from "@/lib/types";

export const Route = createFileRoute("/matches")({
  loader: ({ context }) => context.queryClient.ensureQueryData(matchesQuery()),
  head: () => ({
    meta: [
      { title: "Matches — GigRadar" },
      { name: "description", content: "Job postings matched to your profile, ranked by agent fit score." },
      { property: "og:title", content: "Matches — GigRadar" },
      { property: "og:description", content: "Job postings matched to your profile, ranked by agent fit score." },
    ],
  }),
  component: MatchesPage,
});

const sources: (JobSource | "all")[] = ["all", "RemoteOK", "WeWorkRemotely", "Upwork", "HN Who's Hiring"];

function MatchesPage() {
  const { data: matches } = useSuspenseQuery(matchesQuery());
  const [q, setQ] = useState("");
  const [source, setSource] = useState<string>("all");
  const [minScore, setMinScore] = useState(60);

  const filtered = useMemo(
    () =>
      matches.filter(
        (m) =>
          m.score >= minScore &&
          (source === "all" || m.job.source === source) &&
          (q === "" ||
            `${m.job.title} ${m.job.client} ${m.job.skills.join(" ")}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [matches, q, source, minScore],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {matches.length} postings above threshold, ranked by fit score.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, client, skill…"
          className="w-64 bg-card"
        />
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-44 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sources.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All sources" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
          <span className="font-mono text-xs text-muted-foreground">min score</span>
          <Slider
            value={[minScore]}
            onValueChange={([v]) => setMinScore(v ?? 60)}
            min={50}
            max={95}
            step={5}
            className="w-32"
          />
          <span className="w-6 font-mono text-xs text-primary">{minScore}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        {filtered.map((m) => (
          <Link
            key={m.id}
            to="/matches/$id"
            params={{ id: m.id }}
            className="flex items-center gap-4 border-b border-border bg-card p-4 transition-colors last:border-0 hover:bg-secondary/50"
          >
            <ScoreBadge score={m.score} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{m.job.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {m.job.client} · {m.job.budget}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {m.skillsOverlap.slice(0, 5).map((s) => (
                  <span key={s} className="rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <StatusBadge status={m.status} />
              <span className="text-[11px] text-muted-foreground">
                {m.job.source} · {timeAgo(m.job.postedAt)}
              </span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="p-10 text-center text-sm text-muted-foreground">No matches pass these filters.</p>
        )}
      </div>
    </div>
  );
}
