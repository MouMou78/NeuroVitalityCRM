import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Search,
  TrendingUp,
  Minus,
  Flame,
  Snowflake,
  Zap,
  Target,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  Save,
  Settings2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface ScoringConfig {
  fit: {
    industries: { name: string; points: number }[];
    companySizes: { range: string; points: number; label: string }[];
    seniorities: { level: string; points: number }[];
    regions: { name: string; points: number }[];
    tiers: {
      A: { min: number; label: string };
      B: { min: number; max: number; label: string };
      C: { max: number; label: string };
    };
  };
  intent: {
    events: { type: string; points: number }[];
    decayHalfLife: number;
    tiers: {
      Hot: { min: number; label: string };
      Warm: { min: number; max: number; label: string };
      Cold: { max: number; label: string };
    };
  };
  combined: {
    fitWeight: number;
    intentWeight: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  cold: { label: "Cold", color: "#6b7280", bg: "bg-gray-100 text-gray-700", icon: Snowflake },
  warm: { label: "Warm", color: "#f59e0b", bg: "bg-amber-100 text-amber-700", icon: Minus },
  hot: { label: "Hot", color: "#ef4444", bg: "bg-red-100 text-red-700", icon: Flame },
  sales_ready: { label: "Sales Ready", color: "#10b981", bg: "bg-emerald-100 text-emerald-700", icon: Target },
};

const DEFAULT_CONFIG: ScoringConfig = {
  fit: {
    industries: [
      { name: "SaaS", points: 25 },
      { name: "Technology", points: 25 },
      { name: "B2B Software", points: 25 },
      { name: "Enterprise Software", points: 25 },
    ],
    companySizes: [
      { range: "51-200", points: 20, label: "Ideal (51–200)" },
      { range: "201-500", points: 20, label: "Ideal (201–500)" },
      { range: "501-1000", points: 20, label: "Good (501–1000)" },
      { range: "1001-5000", points: 15, label: "Acceptable (1001–5000)" },
    ],
    seniorities: [
      { level: "C-Level", points: 15 },
      { level: "VP", points: 15 },
      { level: "Director", points: 15 },
      { level: "Manager", points: 10 },
    ],
    regions: [
      { name: "UK&I", points: 10 },
      { name: "Western Europe", points: 10 },
      { name: "North America", points: 10 },
    ],
    tiers: {
      A: { min: 70, label: "Tier A (70+)" },
      B: { min: 40, max: 69, label: "Tier B (40–69)" },
      C: { max: 39, label: "Tier C (0–39)" },
    },
  },
  intent: {
    events: [
      { type: "sales.meeting_booked", points: 20 },
      { type: "sales.demo_attended", points: 15 },
      { type: "website.pricing_view", points: 8 },
      { type: "website.demo_view", points: 6 },
      { type: "marketing.email_click", points: 5 },
      { type: "marketing.content_download", points: 4 },
    ],
    decayHalfLife: 21,
    tiers: {
      Hot: { min: 60, label: "Hot (60+)" },
      Warm: { min: 25, max: 59, label: "Warm (25–59)" },
      Cold: { max: 24, label: "Cold (0–24)" },
    },
  },
  combined: {
    fitWeight: 60,
    intentWeight: 40,
  },
};

// ─── API helpers ──────────────────────────────────────────────────────────────

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

async function fetchScoringConfig(): Promise<ScoringConfig> {
  const res = await fetch("/api/engine/scoring-config");
  if (!res.ok) return DEFAULT_CONFIG;
  return res.json();
}

async function saveScoringConfig(config: ScoringConfig): Promise<void> {
  const res = await fetch("/api/engine/scoring-config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Failed to save config");
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EngineLeadScoring() {
  const [activeTab, setActiveTab] = useState("scores");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lead Scoring</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Real-time engagement scores with time-decay, and the rules that drive them.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-2">
          <TabsTrigger value="scores" className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Live Scores
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Scoring Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scores">
          <LiveScoresTab />
        </TabsContent>

        <TabsContent value="rules">
          <ScoringRulesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Live Scores Tab ──────────────────────────────────────────────────────────

function LiveScoresTab() {
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
    <div className="space-y-6">
      {/* Refresh */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ["engine-scores-stats"] }); }}>
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
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("score")}>
                Score <SortIcon field="score" />
              </TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("updated_at")}>
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

// ─── Scoring Rules Tab ────────────────────────────────────────────────────────

function ScoringRulesTab() {
  const qc = useQueryClient();

  const { data: savedConfig } = useQuery({
    queryKey: ["engine-scoring-config"],
    queryFn: fetchScoringConfig,
    staleTime: 60000,
  });

  const [config, setConfig] = useState<ScoringConfig>(DEFAULT_CONFIG);
  const [newIndustry, setNewIndustry] = useState({ name: "", points: 25 });
  const [newRegion, setNewRegion] = useState({ name: "", points: 10 });
  const [newEvent, setNewEvent] = useState({ type: "", points: 5 });
  const [fitWeight, setFitWeight] = useState(60);
  const [decayHalfLife, setDecayHalfLife] = useState(21);

  // Sync local state when remote config loads
  const effectiveConfig = savedConfig || config;

  const saveMutation = useMutation({
    mutationFn: () => saveScoringConfig({
      ...effectiveConfig,
      combined: { fitWeight, intentWeight: 100 - fitWeight },
      intent: { ...effectiveConfig.intent, decayHalfLife },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engine-scoring-config"] });
      toast.success("Scoring rules saved successfully");
    },
    onError: () => toast.error("Failed to save scoring rules"),
  });

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setFitWeight(60);
    setDecayHalfLife(21);
    toast.info("Reset to default configuration");
  };

  // Industry helpers
  const addIndustry = () => {
    if (!newIndustry.name.trim()) { toast.error("Industry name cannot be empty"); return; }
    setConfig(c => ({ ...c, fit: { ...c.fit, industries: [...c.fit.industries, newIndustry] } }));
    setNewIndustry({ name: "", points: 25 });
  };
  const removeIndustry = (i: number) =>
    setConfig(c => ({ ...c, fit: { ...c.fit, industries: c.fit.industries.filter((_, idx) => idx !== i) } }));

  // Region helpers
  const addRegion = () => {
    if (!newRegion.name.trim()) { toast.error("Region name cannot be empty"); return; }
    setConfig(c => ({ ...c, fit: { ...c.fit, regions: [...c.fit.regions, newRegion] } }));
    setNewRegion({ name: "", points: 10 });
  };
  const removeRegion = (i: number) =>
    setConfig(c => ({ ...c, fit: { ...c.fit, regions: c.fit.regions.filter((_, idx) => idx !== i) } }));

  // Intent event helpers
  const addEvent = () => {
    if (!newEvent.type.trim()) { toast.error("Event type cannot be empty"); return; }
    setConfig(c => ({ ...c, intent: { ...c.intent, events: [...c.intent.events, newEvent] } }));
    setNewEvent({ type: "", points: 5 });
  };
  const removeEvent = (i: number) =>
    setConfig(c => ({ ...c, intent: { ...c.intent, events: c.intent.events.filter((_, idx) => idx !== i) } }));

  const displayConfig = savedConfig ? { ...savedConfig, fit: { ...savedConfig.fit, industries: config.fit.industries, regions: config.fit.regions }, intent: { ...savedConfig.intent, events: config.intent.events } } : config;

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleReset}>Reset to Defaults</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Rules"}
        </Button>
      </div>

      {/* Fit Scoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Fit Scoring Rules
          </CardTitle>
          <CardDescription>
            Criteria that determine how well a lead matches your ideal customer profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Industries */}
          <div>
            <Label className="text-base font-semibold">Target Industries</Label>
            <p className="text-sm text-muted-foreground mb-3">Industries that match your ICP</p>
            <div className="space-y-2">
              {config.fit.industries.map((ind, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{ind.name}</span>
                    <Badge variant="secondary">+{ind.points} pts</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeIndustry(i)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 mt-3">
                <Input
                  placeholder="Industry name"
                  value={newIndustry.name}
                  onChange={(e) => setNewIndustry({ ...newIndustry, name: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Points"
                  className="w-24"
                  value={newIndustry.points}
                  onChange={(e) => setNewIndustry({ ...newIndustry, points: parseInt(e.target.value) || 0 })}
                />
                <Button onClick={addIndustry}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>
            </div>
          </div>

          {/* Company Sizes (read-only display) */}
          <div>
            <Label className="text-base font-semibold">Company Size Preferences</Label>
            <p className="text-sm text-muted-foreground mb-3">Employee count ranges that match your target market</p>
            <div className="space-y-2">
              {effectiveConfig.fit.companySizes.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{s.label}</span>
                  <Badge variant="secondary">+{s.points} pts</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Seniorities (read-only display) */}
          <div>
            <Label className="text-base font-semibold">Decision Maker Seniority</Label>
            <p className="text-sm text-muted-foreground mb-3">Job seniority levels that indicate decision-making authority</p>
            <div className="space-y-2">
              {effectiveConfig.fit.seniorities.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{s.level}</span>
                  <Badge variant="secondary">+{s.points} pts</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Regions */}
          <div>
            <Label className="text-base font-semibold">Priority Regions</Label>
            <p className="text-sm text-muted-foreground mb-3">Geographic regions you actively target</p>
            <div className="space-y-2">
              {config.fit.regions.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{r.name}</span>
                    <Badge variant="secondary">+{r.points} pts</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeRegion(i)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 mt-3">
                <Input
                  placeholder="Region name"
                  value={newRegion.name}
                  onChange={(e) => setNewRegion({ ...newRegion, name: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Points"
                  className="w-24"
                  value={newRegion.points}
                  onChange={(e) => setNewRegion({ ...newRegion, points: parseInt(e.target.value) || 0 })}
                />
                <Button onClick={addRegion}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>
            </div>
          </div>

          {/* Fit Tier Thresholds */}
          <div>
            <Label className="text-base font-semibold">Fit Tier Thresholds</Label>
            <p className="text-sm text-muted-foreground mb-3">Score ranges that determine fit tier classification</p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="p-3 border rounded-lg">
                <Badge className="mb-2">Tier A</Badge>
                <p className="text-sm text-muted-foreground">{effectiveConfig.fit.tiers.A.label}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge variant="secondary" className="mb-2">Tier B</Badge>
                <p className="text-sm text-muted-foreground">{effectiveConfig.fit.tiers.B.label}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge variant="outline" className="mb-2">Tier C</Badge>
                <p className="text-sm text-muted-foreground">{effectiveConfig.fit.tiers.C.label}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Intent Scoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5" />
            Intent Scoring Rules
          </CardTitle>
          <CardDescription>
            Event-based signals that indicate buying intent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Intent Events */}
          <div>
            <Label className="text-base font-semibold">Intent Signals</Label>
            <p className="text-sm text-muted-foreground mb-3">Actions that indicate interest and buying intent</p>
            <div className="space-y-2">
              {config.intent.events.map((ev, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium text-sm">{ev.type.replace(/_/g, " ").replace(/\./g, " › ")}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">+{ev.points} pts</Badge>
                    <Button variant="ghost" size="sm" onClick={() => removeEvent(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 mt-3">
                <Input
                  placeholder="e.g. website.pricing_view"
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Points"
                  className="w-24"
                  value={newEvent.points}
                  onChange={(e) => setNewEvent({ ...newEvent, points: parseInt(e.target.value) || 0 })}
                />
                <Button onClick={addEvent}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>
            </div>
          </div>

          {/* Decay Model */}
          <div>
            <Label className="text-base font-semibold">Score Decay Model</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Intent signals decay over time using exponential half-life
            </p>
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Half-life Period</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-20 h-8 text-sm"
                    value={decayHalfLife}
                    min={1}
                    max={365}
                    onChange={(e) => setDecayHalfLife(parseInt(e.target.value) || 21)}
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Intent scores are reduced by 50% every {decayHalfLife} day{decayHalfLife !== 1 ? "s" : ""} to prioritise recent activity
              </p>
            </div>
          </div>

          {/* Intent Tier Thresholds */}
          <div>
            <Label className="text-base font-semibold">Intent Tier Thresholds</Label>
            <p className="text-sm text-muted-foreground mb-3">Score ranges that determine intent tier classification</p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="p-3 border rounded-lg">
                <Badge variant="destructive" className="mb-2">Hot</Badge>
                <p className="text-sm text-muted-foreground">{effectiveConfig.intent.tiers.Hot.label}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge className="mb-2">Warm</Badge>
                <p className="text-sm text-muted-foreground">{effectiveConfig.intent.tiers.Warm.label}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge variant="secondary" className="mb-2">Cold</Badge>
                <p className="text-sm text-muted-foreground">{effectiveConfig.intent.tiers.Cold.label}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Combined Weighting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Combined Score Weighting
          </CardTitle>
          <CardDescription>
            How fit and intent scores are combined to calculate the overall lead score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Fit Weight</p>
                <p className="text-xs text-muted-foreground">ICP match contribution</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-20 h-8 text-sm"
                  value={fitWeight}
                  min={0}
                  max={100}
                  onChange={(e) => setFitWeight(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Intent Weight</p>
                <p className="text-xs text-muted-foreground">Behavioural signal contribution</p>
              </div>
              <Badge variant="outline" className="text-sm px-3">{100 - fitWeight}%</Badge>
            </div>
            {/* Visual weight bar */}
            <div className="h-3 rounded-full overflow-hidden flex">
              <div className="h-full bg-primary transition-all" style={{ width: `${fitWeight}%` }} />
              <div className="h-full bg-amber-400 flex-1" />
            </div>
            <p className="text-xs text-muted-foreground">
              Combined Score = (Fit Score × {fitWeight}%) + (Intent Score × {100 - fitWeight}%)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
