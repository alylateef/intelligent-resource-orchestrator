import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { api, profileQuery } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/profile")({
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQuery()),
  head: () => ({
    meta: [
      { title: "Profile — GigRadar" },
      { name: "description", content: "Your skills, rate and bio — the text the agent embeds into Chroma and matches jobs against." },
      { property: "og:title", content: "Profile — GigRadar" },
      { property: "og:description", content: "The profile the agent matches job postings against." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(profileQuery());
  const [form, setForm] = useState(data);
  const [skill, setSkill] = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  function addSkill() {
    const s = skill.trim();
    if (s && !form.skills.includes(s)) set("skills", [...form.skills, s]);
    setSkill("");
  }

  async function save() {
    setSaving(true);
    try {
      await api.saveProfile(form);
      await qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved — re-embedded into Chroma on next run");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is what the agent embeds into Chroma and matches every posting against. Better profile → better matches.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} className="bg-secondary/40" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} className="bg-secondary/40" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rate">Rate</Label>
            <Input id="rate" value={form.rate} onChange={(e) => set("rate", e.target.value)} className="bg-secondary/40" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc">Location</Label>
            <Input id="loc" value={form.location} onChange={(e) => set("location", e.target.value)} className="bg-secondary/40" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bio</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            className="min-h-[120px] bg-secondary/40"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {form.skills.map((s) => (
              <Badge key={s} variant="outline" className="gap-1 border-primary/30 bg-primary/10 font-mono text-xs text-primary">
                {s}
                <button
                  onClick={() => set("skills", form.skills.filter((x) => x !== s))}
                  className="rounded-full hover:text-foreground"
                  aria-label={`Remove ${s}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              placeholder="Add a skill…"
              className="w-56 bg-secondary/40"
            />
            <Button variant="outline" size="sm" onClick={addSkill}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          Save profile
        </Button>
      </div>
    </div>
  );
}
