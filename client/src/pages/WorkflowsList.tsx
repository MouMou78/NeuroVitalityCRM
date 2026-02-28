import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Play,
  Pause,
  Workflow,
  Users,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface WorkflowRow {
  id: string;
  workflow_id: string;
  name: string;
  status: "draft" | "active" | "paused" | "archived";
  version: number;
  created_at: string;
  updated_at: string;
  enrollment_count?: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "secondary",
  active: "default",
  paused: "outline",
  archived: "destructive",
};

async function fetchWorkflows(): Promise<WorkflowRow[]> {
  const res = await fetch("/api/engine/workflows");
  if (!res.ok) throw new Error("Failed to load workflows");
  return res.json();
}

export default function WorkflowsList() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WorkflowRow | null>(null);
  const qc = useQueryClient();

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["engine-workflows"],
    queryFn: fetchWorkflows,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/engine/workflows/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete workflow");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engine-workflows"] });
      toast.success("Workflow deleted");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete workflow"),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/engine/workflows/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engine-workflows"] });
      toast.success("Workflow status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const filtered = workflows.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: workflows.length,
    active: workflows.filter((w) => w.status === "active").length,
    draft: workflows.filter((w) => w.status === "draft").length,
    totalEnrollments: workflows.reduce((a, w) => a + (w.enrollment_count || 0), 0),
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Build event-driven, conditional outreach workflows for your leads.
          </p>
        </div>
        <Button onClick={() => navigate("/engine/workflows/new")}>
          <Plus className="h-4 w-4 mr-2" /> New Workflow
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, icon: Workflow, color: "text-primary" },
          { label: "Active", value: stats.active, icon: Play, color: "text-emerald-500" },
          { label: "Draft", value: stats.draft, icon: Clock, color: "text-amber-500" },
          { label: "Enrollments", value: stats.totalEnrollments, icon: Users, color: "text-blue-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center gap-3">
              <Icon className={`h-5 w-5 ${color}`} />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search workflows..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          Loading workflows...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Workflow className="h-10 w-10 text-muted-foreground mb-4" />
          <CardTitle className="text-lg mb-1">No workflows yet</CardTitle>
          <CardDescription className="mb-4">
            Create your first event-driven workflow to start automating lead outreach.
          </CardDescription>
          <Button onClick={() => navigate("/engine/workflows/new")}>
            <Plus className="h-4 w-4 mr-2" /> Create Workflow
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((wf) => (
            <Card
              key={wf.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/engine/workflows/${wf.id}/edit`)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Workflow className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{wf.name}</p>
                    <Badge variant={STATUS_COLORS[wf.status] as any} className="text-xs shrink-0">
                      {wf.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground shrink-0">v{wf.version}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {wf.enrollment_count || 0} enrollments
                    </span>
                    <span>
                      Updated {new Date(wf.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/engine/workflows/${wf.id}/edit`);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    {wf.status === "active" ? (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          statusMutation.mutate({ id: wf.id, status: "paused" });
                        }}
                      >
                        <Pause className="h-4 w-4 mr-2" /> Pause
                      </DropdownMenuItem>
                    ) : wf.status !== "archived" ? (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          statusMutation.mutate({ id: wf.id, status: "active" });
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" /> Activate
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(wf);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all its
              enrollment history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
