import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Activity, LayoutDashboard, Radar, User, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDemo } from "@/lib/api";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/matches", label: "Matches", icon: Briefcase },
  { to: "/activity", label: "Agent activity", icon: Activity },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2 px-4 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Radar className="h-4 w-4" />
          </span>
          <div>
            <p className="font-mono text-sm font-semibold tracking-tight">gigradar</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">job hunter agent</p>
          </div>
        </div>
        <nav className="mt-2 flex flex-col gap-0.5 px-2">
          {nav.map(({ to, label, icon: Icon, ...rest }) => {
            const active = "exact" in rest && rest.exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-4 py-4">
          <div className="rounded-md border border-border bg-card p-3 text-xs">
            <p className="flex items-center gap-1.5 font-medium">
              <span className={cn("h-1.5 w-1.5 rounded-full", isDemo ? "bg-chart-4" : "bg-primary")} />
              {isDemo ? "Demo mode" : "Live backend"}
            </p>
            <p className="mt-1 text-muted-foreground">
              {isDemo ? "Set VITE_API_URL to connect the FastAPI agent." : "Connected to FastAPI + LangGraph."}
            </p>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-6 py-6 lg:px-10">
        <Outlet />
      </main>
    </div>
  );
}
