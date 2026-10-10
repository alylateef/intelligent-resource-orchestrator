import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  ArrowLeft, Check, ExternalLink, Loader2, RefreshCw, Sparkles, ThumbsDown, ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import { api, matchQuery } from "@/lib/api";
import { ScoreBadge, StatusBadge } from "@/components/score-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/lib/time";

export const Route = createFileRoute("/matches/$id")({
  loader: async ({ context, params }) => {
    const m = await context.queryClient.ensureQueryData(matchQuery(params.id));
    if (!m) throw notFound();
    return m;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.job.title ?? "Match"} — GigRadar` },
      { name: "description", content: "Fit breakdown and AI-drafted proposal for this job match." },
      { property: "og:title", content: `${loaderData?.job.title ?? "Match"} — GigRadar` },
      { property: "og:description", content: "Fit breakdown and AI-drafted proposal for this job match." },
    ],
  }),
  component: MatchDetail,
});

function MatchDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: match } = useSuspenseQuery(matchQuery(id));
  const [draft, setDraft] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  if (!match) throw notFound();

  const proposalText = draft ?? match.proposal?.text ?? "";

  async function regenerate() {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setStreaming(true);
    setDraft("");
    try {
      let acc = "";
      for await (const token of api.draftProposal(id, ac.signal)) {
        acc += token;
        setDraft(acc);
      }
      await qc.invalidateQueries({ queryKey: ["match", id] });
      await qc.invalidateQueries({ queryKey: ["matches"] });
      setDraft(null);
      toast.success("Proposal drafted");
    } catch {
      toast.error("Drafting failed");
    } finally {
      setStreaming(false);
    }
  }

  async function act(status: "approved" | "rejected") {
    setBusy(true);
    try {
      await api.setStatus(id, status, proposalText);
      await qc.invalidateQueries({ queryKey: ["match", id] });
      await qc.invalidateQueries({ queryKey: ["matches"] });
      toast.success(status === "approved" ? "Proposal approved — ready to send" : "Match rejected");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to="/matches">
          <ArrowLeft className="mr-1 h-4 w-4" /> All matches
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <ScoreBadge score={match.score} className="h-12 w-12 text-lg" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">{match.job.title}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {match.job.client} · {match.job.budget} · {timeAgo(match.job.postedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={match.status} />
          <Button asChild variant="outline" size="sm">
            <a href={match.job.url} target="_blank" rel="noreferrer">
              Original post <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Why it matched</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{match.reasoning}</p>
              <div className="flex items-center justify-between rounded-md bg-secondary/60 px-3 py-2 font-mono text-xs">
                <span className="text-muted-foreground">chroma similarity</span>
                <span className="text-primary">{match.semanticSimilarity.toFixed(2)}</span>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Overlapping skills</p>
                <div className="flex flex-wrap gap-1">
                  {match.skillsOverlap.map((s) => (
                    <Badge key={s} variant="outline" className="border-primary/30 bg-primary/10 font-mono text-[10px] text-primary">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              {match.missingSkills.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Gaps</p>
                  <div className="flex flex-wrap gap-1">
                    {match.missingSkills.map((s) => (
                      <Badge key={s} variant="outline" className="border-destructive/30 bg-destructive/10 font-mono text-[10px] text-destructive">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Job posting</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{match.job.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {match.job.skills.map((s) => (
                  <Badge key={s} variant="secondary" className="font-mono text-[10px]">
                    {s}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" /> Drafted proposal
            </CardTitle>
            {match.proposal && !streaming && (
              <span className="font-mono text-[10px] text-muted-foreground">
                {match.proposal.model} · {timeAgo(match.proposal.draftedAt)}
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {match.proposal || streaming ? (
              <>
                <Textarea
                  value={proposalText}
                  onChange={(e) => setDraft(e.target.value)}
                  readOnly={streaming}
                  className="min-h-[380px] resize-y bg-secondary/40 font-mono text-[13px] leading-relaxed"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={() => act("approved")} disabled={busy || streaming}>
                    {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ThumbsUp className="mr-1 h-4 w-4" />}
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => act("rejected")} disabled={busy || streaming}>
                    <ThumbsDown className="mr-1 h-4 w-4" /> Reject
                  </Button>
                  <Button size="sm" variant="outline" onClick={regenerate} disabled={busy || streaming}>
                    {streaming ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
                    {streaming ? "Drafting…" : "Regenerate"}
                  </Button>
                  {match.status === "approved" && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-primary">
                      <Check className="h-3.5 w-3.5" /> Approved — copy and send
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-[380px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border text-center">
                <p className="text-sm text-muted-foreground">
                  No proposal yet — the agent drafts automatically for scores ≥ 85,
                  <br /> or draft one now.
                </p>
                <Button size="sm" onClick={regenerate} disabled={streaming}>
                  <Sparkles className="mr-1 h-4 w-4" /> Draft proposal
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
