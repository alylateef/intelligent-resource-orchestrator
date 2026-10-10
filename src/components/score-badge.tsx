import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MatchStatus } from "@/lib/types";

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const tone =
    score >= 85
      ? "border-primary/40 bg-primary/15 text-primary"
      : score >= 70
        ? "border-chart-2/40 bg-chart-2/15 text-chart-2"
        : "border-muted-foreground/30 bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border font-mono text-sm font-semibold tabular-nums",
        tone,
        className,
      )}
    >
      {score}
    </span>
  );
}

const statusStyles: Record<MatchStatus, string> = {
  new: "border-chart-2/40 bg-chart-2/10 text-chart-2",
  drafted: "border-chart-4/40 bg-chart-4/10 text-chart-4",
  approved: "border-primary/40 bg-primary/10 text-primary",
  rejected: "border-destructive/40 bg-destructive/10 text-destructive",
  sent: "border-primary/40 bg-primary text-primary-foreground",
};

export function StatusBadge({ status }: { status: MatchStatus }) {
  return (
    <Badge variant="outline" className={cn("font-mono text-[11px] uppercase tracking-wide", statusStyles[status])}>
      {status}
    </Badge>
  );
}
