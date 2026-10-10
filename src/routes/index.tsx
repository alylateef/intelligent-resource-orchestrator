import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, FileText, Radar, Target, TrendingUp } from "lucide-react";
import { matchesQuery, statsQuery } from "@/lib/api";
import { ScoreBadge, StatusBadge } from "@/components/score-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/time";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(statsQuery()),
      context.queryClient.ensureQueryData(matchesQuery()),
    ]),
  head: () => ({
    meta: [
      { title: "Dashboard — GigRadar" },
      { name: "description", content: "Pipeline overview: jobs found, matched, drafted and approved by the GigRadar agent." },
      { property: "og:title", content: "Dashboard — GigRadar" },
      { property: "og:description", content: "Pipeline overview of the autonomous freelance job hunter." },
    ],
  }),
  component: Dashboard,
});

function Stat({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: typeof Radar; hint?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="font-mono text-2xl font-semibold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">
            {label}
            {hint ? ` · ${hint}` : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { data: stats } = useSuspenseQuery(statsQuery());
  const { data: matches } = useSuspenseQuery(matchesQuery());
  const top = matches.slice(0, 4);
  const maxBucket = Math.max(...stats.scoreDistribution.map((b) => b.count), 1);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The agent scans 4 job boards on a schedule, matches against your profile, and drafts proposals for approval.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/activity">
            View agent runs <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="jobs scanned" value={stats.jobsFound.toLocaleString()} icon={Radar} />
        <Stat label="new matches today" value={stats.newToday} icon={Target} />
        <Stat label="proposals drafted" value={stats.drafted} icon={FileText} />
        <Stat label="approved" value={stats.approved} icon={CheckCircle2} hint={`avg score ${stats.avgScore}`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Top matches</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link to="/matches">
                All matches <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {top.map((m) => (
              <Link
                key={m.id}
                to="/matches/$id"
                params={{ id: m.id }}
                className="flex items-center gap-3 rounded-md border border-border bg-secondary/40 p-3 transition-colors hover:bg-secondary"
              >
                <ScoreBadge score={m.score} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.job.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.job.client} · {m.job.source} · {timeAgo(m.job.postedAt)}
                  </p>
                </div>
                <StatusBadge status={m.status} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" /> Fit score distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.scoreDistribution.map((b) => (
              <div key={b.range} className="space-y-1">
                <div className="flex justify-between font-mono text-xs text-muted-foreground">
                  <span>{b.range}</span>
                  <span>{b.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(b.count / maxBucket) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              Scores come from Groq llama-3.3-70b reasoning over Chroma similarity + skill overlap.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
