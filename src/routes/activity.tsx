import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, ExternalLink, Loader2, XCircle } from "lucide-react";
import { runsQuery } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { AgentStep } from "@/lib/types";

export const Route = createFileRoute("/activity")({
  loader: ({ context }) => context.queryClient.ensureQueryData(runsQuery()),
  head: () => ({
    meta: [
      { title: "Agent activity — GigRadar" },
      { name: "description", content: "Live LangGraph run log: every step, tool call and result of the job-hunting agent." },
      { property: "og:title", content: "Agent activity — GigRadar" },
      { property: "og:description", content: "Live LangGraph run log of the job-hunting agent." },
    ],
  }),
  component: ActivityPage,
});

function StepIcon({ status }: { status: AgentStep["status"] }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-chart-4" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

function ActivityPage() {
  const { data: runs } = useSuspenseQuery(runsQuery());

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agent activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every scheduled LangGraph run: scrape → dedupe → embed → match → score → draft → await your approval.
        </p>
      </div>

      <div className="space-y-4">
        {runs.map((run) => (
          <Card key={run.id}>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <CardTitle className="font-mono text-sm">{run.id}</CardTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono text-[10px] uppercase",
                    run.status === "done" && "border-primary/40 bg-primary/10 text-primary",
                    run.status === "running" && "border-chart-4/40 bg-chart-4/10 text-chart-4",
                    run.status === "failed" && "border-destructive/40 bg-destructive/10 text-destructive",
                  )}
                >
                  {run.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {run.jobsFound} found · {run.jobsMatched} matched · {run.proposalsDrafted} drafted
                </span>
                <span>{timeAgo(run.startedAt)}</span>
                {run.langsmithUrl && (
                  <a
                    href={run.langsmithUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    LangSmith trace <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-0">
                {run.steps.map((step, i) => (
                  <li key={step.name} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < run.steps.length - 1 && (
                      <span className="absolute left-[7px] top-5 h-full w-px bg-border" aria-hidden />
                    )}
                    <StepIcon status={step.status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <span className="font-mono text-sm">{step.name}</span>
                        {step.tool && <span className="font-mono text-[11px] text-muted-foreground">{step.tool}</span>}
                        {step.durationMs != null && (
                          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                            {(step.durationMs / 1000).toFixed(2)}s
                          </span>
                        )}
                      </div>
                      {step.detail && <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
