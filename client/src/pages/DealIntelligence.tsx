import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Zap, AlertTriangle, TrendingUp, TrendingDown, Clock, CheckCircle,
  RefreshCw, ChevronRight, X, Loader2, Flame, Shield, Activity,
  ArrowRight, Eye, Check
} from "lucide-react";

const ALERT_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  stale: { label: "Stale Deal", icon: Clock, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
  follow_up_overdue: { label: "Overdue", icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  momentum: { label: "Momentum", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 border-green-200" },
  at_risk: { label: "At Risk", icon: Shield, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  drift: { label: "Drifting", icon: TrendingDown, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  likely_won: { label: "Likely Won", icon: Flame, color: "text-green-700", bg: "bg-green-50 border-green-200" },
  likely_lost: { label: "Likely Lost", icon: TrendingDown, color: "text-red-700", bg: "bg-red-50 border-red-200" },
  pattern_match: { label: "Pattern Match", icon: Activity, color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
  competitor_risk: { label: "Competitor Risk", icon: Shield, color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-gray-100 text-gray-600" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-700" },
  high: { label: "High", color: "bg-orange-100 text-orange-700" },
  critical: { label: "Critical", color: "bg-red-100 text-red-700" },
};

export default function DealIntelligence() {
  const [filter, setFilter] = useState<"all" | "unread" | "high">("unread");
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const { data: alerts = [], isLoading, refetch } = trpc.dealIntelligence.getAlerts.useQuery(
    filter === "unread" ? { unreadOnly: true } :
    filter === "high" ? { severity: "high" } : {},
    { refetchInterval: 30000 }
  );

  const runAnalysis = trpc.dealIntelligence.runAnalysis.useMutation({
    onSuccess: (result) => {
      toast.success(`Analysis complete — ${result.alertsCreated} new alert${result.alertsCreated !== 1 ? "s" : ""} generated`);
      refetch();
      setIsRunning(false);
    },
    onError: (err) => {
      toast.error(`Analysis failed: ${err.message}`);
      setIsRunning(false);
    },
  });

  const markRead = trpc.dealIntelligence.markRead.useMutation({ onSuccess: () => refetch() });
  const dismiss = trpc.dealIntelligence.dismiss.useMutation({
    onSuccess: () => { toast.success("Alert dismissed"); refetch(); },
  });
  const markActioned = trpc.dealIntelligence.markActioned.useMutation({
    onSuccess: () => {
      toast.success("Marked as actioned");
      setActioningId(null);
      setActionNote("");
      refetch();
    },
  });

  function handleRunAnalysis() {
    setIsRunning(true);
    runAnalysis.mutate();
  }

  const unreadCount = alerts.filter(a => !a.isRead).length;
  const criticalCount = alerts.filter(a => a.severity === "critical" || a.severity === "high").length;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Zap className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Deal Intelligence</h1>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white border-0">{unreadCount} new</Badge>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            Proactive AI alerts for deal drift, momentum, and risk patterns — no prompting required.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1.5" />Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleRunAnalysis}
            disabled={isRunning}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Zap className="w-4 h-4 mr-1.5" />}
            Run Analysis
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-gray-900">{alerts.length}</div>
          <div className="text-sm text-gray-500">Active Alerts</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
          <div className="text-sm text-gray-500">High / Critical</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
          <div className="text-sm text-gray-500">Unread</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 w-fit">
        {[
          { key: "unread", label: "Unread" },
          { key: "high", label: "High Priority" },
          { key: "all", label: "All Alerts" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />Loading alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed p-16 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            {filter === "unread" ? "All caught up!" : "No alerts"}
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            {filter === "unread"
              ? "No unread alerts. Run an analysis to check your pipeline for new signals."
              : "Run an analysis to scan your pipeline for deal risks and opportunities."}
          </p>
          <Button onClick={handleRunAnalysis} disabled={isRunning} className="bg-amber-500 hover:bg-amber-600 text-white">
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
            Run Analysis Now
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => {
            const typeConfig = ALERT_TYPE_CONFIG[alert.alertType] || ALERT_TYPE_CONFIG.pattern_match;
            const severityConfig = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
            const Icon = typeConfig.icon;

            return (
              <div
                key={alert.id}
                className={`bg-white rounded-xl border-2 transition-all ${
                  !alert.isRead ? "border-amber-200 shadow-sm" : "border-gray-100"
                } ${alert.actionTaken ? "opacity-60" : ""}`}
                onClick={() => { if (!alert.isRead) markRead.mutate({ alertId: alert.id }); }}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${typeConfig.bg} shrink-0`}>
                      <Icon className={`w-4 h-4 ${typeConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-900">{alert.dealName}</span>
                        <Badge className={`text-xs border-0 ${severityConfig.color}`}>
                          {severityConfig.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{typeConfig.label}</Badge>
                        {!alert.isRead && (
                          <span className="w-2 h-2 bg-amber-500 rounded-full" />
                        )}
                        {alert.actionTaken && (
                          <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                            <Check className="w-3 h-3 mr-1" />Actioned
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                      <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-2">
                        <ArrowRight className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700">{alert.recommendation}</p>
                      </div>
                      {alert.actionNote && (
                        <p className="text-xs text-gray-400 mt-2 italic">Note: {alert.actionNote}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                        {alert.confidence && (
                          <span>{alert.confidence}% confidence</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!alert.actionTaken && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setActioningId(alert.id); }}
                          className="text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />Action
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); dismiss.mutate({ alertId: alert.id }); }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action note dialog */}
      <Dialog open={!!actioningId} onOpenChange={() => setActioningId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Actioned</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            Add an optional note about what action you took on this deal.
          </p>
          <Textarea
            placeholder="e.g. Called Sarah, she confirmed budget approved — moving to proposal stage"
            value={actionNote}
            onChange={e => setActionNote(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setActioningId(null)}>Cancel</Button>
            <Button
              onClick={() => markActioned.mutate({ alertId: actioningId!, note: actionNote || undefined })}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-4 h-4 mr-2" />Mark Actioned
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
