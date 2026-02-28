import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Pause,
  Play,
  StopCircle,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Enrollment {
  enrollment_id: string;
  workflow_id: string;
  workflow_name?: string;
  entity_id: string;
  entity_name?: string;
  entity_email?: string;
  current_node_id: string;
  current_node_label?: string;
  status: "active" | "paused" | "completed" | "stopped";
  outcome?: string;
  entered_at: string;
  last_transition_at: string;
  next_check_at?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: "Active", color: "default", icon: Play },
  paused: { label: "Paused", color: "secondary", icon: Pause },
  completed: { label: "Completed", color: "outline", icon: CheckCircle2 },
  stopped: { label: "Stopped", color: "destructive", icon: XCircle },
};

async function fetchEnrollments(status: string): Promise<Enrollment[]> {
  const params = status !== "all" ? `?status=${status}` : "";
  const res = await fetch(`/api/engine/enrollments${params}`);
  if (!res.ok) throw new Error("Failed to load enrollments");
  return res.json();
}

export default function EnrollmentManager() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const qc = useQueryClient();

  const { data: enrollments = [], isLoading, refetch } = useQuery({
    queryKey: ["engine-enrollments", statusFilter],
    queryFn: () => fetchEnrollments(statusFilter),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const res = await fetch(`/api/engine/enrollments/${id}/${action}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Failed to ${action} enrollment`);
    },
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ["engine-enrollments"] });
      toast.success(`Enrollment ${action}d`);
    },
    onError: (_, { action }) => toast.error(`Failed to ${action} enrollment`),
  });

  const filtered = enrollments.filter((e) => {
    const q = search.toLowerCase();
    return (
      (e.entity_name || "").toLowerCase().includes(q) ||
      (e.entity_email || "").toLowerCase().includes(q) ||
      (e.workflow_name || "").toLowerCase().includes(q)
    );
  });

  const stats = {
    active: enrollments.filter((e) => e.status === "active").length,
    paused: enrollments.filter((e) => e.status === "paused").length,
    completed: enrollments.filter((e) => e.status === "completed").length,
    stopped: enrollments.filter((e) => e.status === "stopped").length,
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const formatRelative = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/engine/workflows")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Enrollment Manager</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Monitor and manage all lead enrollments across your workflows.
          </p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active", value: stats.active, icon: Play, color: "text-emerald-500" },
          { label: "Paused", value: stats.paused, icon: Pause, color: "text-amber-500" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-blue-500" },
          { label: "Stopped", value: stats.stopped, icon: XCircle, color: "text-red-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card
            key={label}
            className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${statusFilter === label.toLowerCase() ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(statusFilter === label.toLowerCase() ? "all" : label.toLowerCase())}
          >
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

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or workflow..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="stopped">Stopped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Workflow</TableHead>
              <TableHead>Current Step</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Next Check</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Loading enrollments...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No enrollments found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => {
                const sc = STATUS_CONFIG[e.status];
                const Icon = sc.icon;
                return (
                  <TableRow key={e.enrollment_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{e.entity_name || e.entity_id}</p>
                        {e.entity_email && (
                          <p className="text-xs text-muted-foreground">{e.entity_email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{e.workflow_name || e.workflow_id}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                        {e.current_node_label || e.current_node_id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sc.color as any} className="flex items-center gap-1 w-fit text-xs">
                        <Icon className="h-3 w-3" />
                        {sc.label}
                      </Badge>
                      {e.outcome && (
                        <p className="text-xs text-muted-foreground mt-0.5">{e.outcome}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(e.entered_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatRelative(e.last_transition_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.next_check_at ? formatDate(e.next_check_at) : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {e.status === "active" && (
                            <DropdownMenuItem
                              onClick={() => actionMutation.mutate({ id: e.enrollment_id, action: "pause" })}
                            >
                              <Pause className="h-4 w-4 mr-2" /> Pause
                            </DropdownMenuItem>
                          )}
                          {e.status === "paused" && (
                            <DropdownMenuItem
                              onClick={() => actionMutation.mutate({ id: e.enrollment_id, action: "resume" })}
                            >
                              <Play className="h-4 w-4 mr-2" /> Resume
                            </DropdownMenuItem>
                          )}
                          {(e.status === "active" || e.status === "paused") && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => actionMutation.mutate({ id: e.enrollment_id, action: "stop" })}
                            >
                              <StopCircle className="h-4 w-4 mr-2" /> Stop
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
