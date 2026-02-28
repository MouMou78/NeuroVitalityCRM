import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Snowflake,
  Zap,
  Target,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface LeadScoreRow {
  id: string;
  entity_id: string;
  entity_name?: string;
  entity_email?: string;
  score: number;
  tier: "cold" | "warm" | "hot" | "sales_ready";
  last_activity_at?: string;
  updated_at: string;
}

interface ScoreStats {
  total: number;
  cold: number;
  warm: number;
  hot: number;
  sales_ready: number;
  avg_score: number;
  distribution: { range: string; count: number }[];
}

const TIER_CONFIG = {
  cold: { label: "Cold", color: "#6b7280", bg: "bg-gray-100 text-gray-700", icon: Snowflake },
  warm: { label: "Warm", color: "#f59e0b", bg: "bg-amber-100 text-amber-700", icon: Minus },
  hot: { label: "Hot", color: "#ef4444", bg: "bg-red-100 text-red-700", icon: Flame },
  sales_ready: { label: "Sales Ready", color: "#10b981", bg: "bg-emerald-100 text-emerald-700", icon: Target },
};

async function fetchScores(tier: string, search: string): Promise<LeadScoreRow[]> {
  const params = new URLSearchParams();
  if (tier !== "all") params.set("tier", tier);
  if (search) params.set("q", search);
  const res = await fetch(`/api/engine/scores?${params}`);
  if (!res.ok) throw new Error("Failed to load scores");
  return res.json();
}

async function fetchStats(): Promise<ScoreStats> {
  const res = await fetch("/api/engine/scores/stats");
  if (!res.ok) throw new Error("Failed to load stats");
  return res.json();
}

export default function EngineLeadScoring() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<LeadScoreRow | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustDelta, setAdjustDelta] = useState(0);
  const [sortField, setSortField] = useState<"score" | "updated_at">("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const qc = useQueryClient();

  const { data: scores = [], isLoading, refetch } = useQuery({
    queryKey: ["engine-scores", tierFilter, search],
    queryFn: () => fetchScores(tierFilter, search),
    staleTime: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ["engine-scores-stats"],
    queryFn: fetchStats,
    staleTime: 60000,
  });

  const adjustMutation = useMutation({
    mutationFn: async ({ entityId, delta }: { entityId: string; delta: number }) => {
      const res = await fetch("/api/engine/scores/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_id: entityId, delta, reason: "manual_adjustment" }),
      });
      if (!res.ok) throw new Error("Failed to adjust score");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engine-scores"] });
      qc.invalidateQueries({ queryKey: ["engine-scores-stats"] });
      toast.success("Score adjusted");
      setAdjustOpen(false);
    },
    onError: () => toast.error("Failed to adjust score"),
  });

  const sorted = [...scores].sort((a, b) => {
    const va = sortField === "score" ? a.score : new Date(a.updated_at).getTime();
    const vb = sortField === "score" ? b.score : new Date(b.updated_at).getTime();
    return sortDir === "desc" ? vb - va : va - vb;
  });

  const toggleSort = (field: "score" | "updated_at") => {
    if (sortField === field) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: string }) =>
    sortField === field ? (
      sortDir === "desc" ? <ChevronDown className="h-3 w-3 inline ml-1" /> : <ChevronUp className="h-3 w-3 inline ml-1" />
    ) : null;

  const scoreBar = (score: number) => {
    const pct = Math.min(100, Math.max(0, score));
    const color = score >= 80 ? "#10b981" : score >= 50 ? "#ef4444" : score >= 25 ? "#f59e0b" : "#6b7280";
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <span className="text-xs font-mono w-6 text-right">{score}</span>
      </div>
    );
  };

  const defaultStats: ScoreStats = {
    total: 0, cold: 0, warm: 0, hot: 0, sales_ready: 0, avg_score: 0,
    distribution: [
      { range: "0–24", count: 0 },
      { range: "25–49", count: 0 },
      { range: "50–74", count: 0 },
      { range: "75–100", count: 0 },
    ],
  };
  const s = stats || defaultStats;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/engine/workflows")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Scoring</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Real-time engagement scores with time-decay across all leads.
          </p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ["engine-scores-stats"] }); }}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { key: "cold", label: "Cold", value: s.cold },
          { key: "warm", label: "Warm", value: s.warm },
          { key: "hot", label: "Hot", value: s.hot },
          { key: "sales_ready", label: "Sales Ready", value: s.sales_ready },
          { key: "avg", label: "Avg Score", value: Math.round(s.avg_score) },
        ].map(({ key, label, value }) => {
          const tier = TIER_CONFIG[key as keyof typeof TIER_CONFIG];
          const Icon = tier?.icon || TrendingUp;
          const color = tier?.color || "#6366f1";
          return (
            <Card
              key={key}
              className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${tierFilter === key ? "ring-2 ring-primary" : ""}`}
              onClick={() => key !== "avg" && setTierFilter(tierFilter === key ? "all" : key)}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 shrink-0" style={{ color }} />
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Distribution chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={s.distribution} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {s.distribution.map((_, i) => (
                  <Cell key={i} fill={["#6b7280", "#f59e0b", "#ef4444", "#10b981"][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="sales_ready">Sales Ready</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("score")}
              >
                Score <SortIcon field="score" />
              </TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("updated_at")}
              >
                Updated <SortIcon field="updated_at" />
              </TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Loading scores...
                </TableCell>
              </TableRow>
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No scored leads found
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((lead) => {
                const tc = TIER_CONFIG[lead.tier] || TIER_CONFIG.cold;
                const Icon = tc.icon;
                return (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{lead.entity_name || lead.entity_id}</p>
                        {lead.entity_email && (
                          <p className="text-xs text-muted-foreground">{lead.entity_email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${tc.bg} border-0 flex items-center gap-1 w-fit text-xs`}>
                        <Icon className="h-3 w-3" />
                        {tc.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      {scoreBar(lead.score)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {lead.last_activity_at
                        ? new Date(lead.last_activity_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(lead.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => {
                          setSelectedLead(lead);
                          setAdjustDelta(0);
                          setAdjustOpen(true);
                        }}
                      >
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Adjust score dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Score</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{selectedLead.entity_name || selectedLead.entity_id}</p>
                <p className="text-xs text-muted-foreground">Current score: {selectedLead.score}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Delta (+/-)</label>
                <Input
                  type="number"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  New score: {Math.max(0, Math.min(100, selectedLead.score + adjustDelta))}
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
                <Button
                  onClick={() =>
                    adjustMutation.mutate({ entityId: selectedLead.entity_id, delta: adjustDelta })
                  }
                  disabled={adjustMutation.isPending || adjustDelta === 0}
                >
                  Apply
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
