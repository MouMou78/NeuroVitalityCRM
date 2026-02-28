import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Video, Play, Square, Clock, CheckCircle,
  AlertTriangle, Zap, TrendingUp, MessageSquare, ChevronDown,
  ChevronRight, Loader2, RefreshCw, X, Brain, Target,
  Shield, ArrowRight, Activity, Link2, FileText, Calendar,
  BarChart2, Sparkles, Users
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MeetingSession {
  id: string;
  title: string;
  meetingUrl: string;
  platform: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  summaryMarkdown: string | null;
  actionItems: string[] | null;
  dealStageRecommendation: string | null;
  sentimentScore: number | null;
  talkRatio: Record<string, number> | null;
  keyTopics: string[] | null;
  dealId: string | null;
  personId: string | null;
  accountId: string | null;
  createdAt: string;
}

interface TranscriptLine {
  id: string;
  speaker: string;
  text: string;
  startMs: number | null;
  createdAt: string;
}

interface CopilotSuggestion {
  id: string;
  type: string;
  title: string;
  body: string;
  triggerText: string | null;
  confidence: number | null;
  source?: string;
  createdAt: string;
  dismissed?: boolean;
}

interface Deal {
  id: string;
  name: string;
  value: number | null;
  currency: string | null;
}

interface PreBrief {
  objective: string;
  keyPoints: string[];
  suggestedAgenda: string[];
  watchOutFor: string[];
  openLoops: string[];
  talkingPoints: string[];
}

// ─── Config ───────────────────────────────────────────────────────────────────
const SUGGESTION_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  objection_handling: { label: "Objection", icon: Shield, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  competitor_mention: { label: "Competitor", icon: Target, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  next_step: { label: "Next Step", icon: ArrowRight, color: "text-green-600", bg: "bg-green-50 border-green-200" },
  risk_flag: { label: "Risk", icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  deal_context: { label: "Context", icon: Brain, color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
};

const PLATFORM_LABELS: Record<string, string> = {
  google_meet: "Google Meet",
  zoom: "Zoom",
  teams: "Microsoft Teams",
  webex: "Webex",
  unknown: "Meeting",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; pulse: boolean }> = {
  pending: { label: "Pending", color: "bg-gray-100 text-gray-600", pulse: false },
  joining: { label: "Joining...", color: "bg-yellow-100 text-yellow-700", pulse: true },
  in_progress: { label: "Live", color: "bg-green-100 text-green-700", pulse: true },
  post_processing: { label: "Processing", color: "bg-blue-100 text-blue-700", pulse: true },
  done: { label: "Complete", color: "bg-gray-100 text-gray-600", pulse: false },
  failed: { label: "Failed", color: "bg-red-100 text-red-700", pulse: false },
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTime(ms: number | null): string {
  if (ms === null) return "";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ─── Talk Ratio Bar ───────────────────────────────────────────────────────────
function TalkRatioBar({ talkRatio }: { talkRatio: Record<string, number> }) {
  const speakers = Object.entries(talkRatio).sort((a, b) => b[1] - a[1]);
  const total = speakers.reduce((sum, [, v]) => sum + v, 0);
  if (total === 0) return null;

  const COLORS = ["bg-violet-500", "bg-blue-500", "bg-green-500", "bg-orange-500", "bg-pink-500"];

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <BarChart2 className="w-3.5 h-3.5" />
        Talk Ratio
      </h4>
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-2">
        {speakers.map(([speaker, ms], i) => (
          <div
            key={speaker}
            className={`${COLORS[i % COLORS.length]} transition-all`}
            style={{ width: `${(ms / total) * 100}%` }}
            title={`${speaker}: ${Math.round((ms / total) * 100)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {speakers.map(([speaker, ms], i) => (
          <div key={speaker} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className={`w-2.5 h-2.5 rounded-full ${COLORS[i % COLORS.length]}`} />
            <span className="font-medium">{speaker}</span>
            <span className="text-gray-400">{Math.round((ms / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pre-brief Panel ──────────────────────────────────────────────────────────
function PreBriefPanel({ brief }: { brief: PreBrief }) {
  return (
    <div className="space-y-4">
      <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
        <p className="text-sm font-medium text-violet-900">{brief.objective}</p>
      </div>

      {brief.keyPoints.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Key Things to Know</h4>
          <ul className="space-y-1">
            {brief.keyPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-violet-400 font-bold mt-0.5">•</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.suggestedAgenda.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Suggested Agenda</h4>
          <ol className="space-y-1">
            {brief.suggestedAgenda.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-xs bg-gray-100 text-gray-500 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </div>
      )}

      {brief.talkingPoints.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Talking Points</h4>
          <ul className="space-y-1">
            {brief.talkingPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.watchOutFor.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
            Watch Out For
          </h4>
          <ul className="space-y-1">
            {brief.watchOutFor.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-yellow-800 bg-yellow-50 rounded p-2">
                <span className="text-yellow-400 font-bold mt-0.5">!</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.openLoops.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Open Loops from Previous Meetings</h4>
          <ul className="space-y-1">
            {brief.openLoops.map((l, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                {l}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MeetingCopilot() {
  const [sessions, setSessions] = useState<MeetingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<MeetingSession | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [suggestions, setSuggestions] = useState<CopilotSuggestion[]>([]);
  const [showStartForm, setShowStartForm] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDealId, setMeetingDealId] = useState("");
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<{
    session: MeetingSession;
    transcripts: TranscriptLine[];
    suggestions: CopilotSuggestion[];
    linkedDeal: Deal | null;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<"sessions" | "prebrief">("sessions");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [applyingToDeal, setApplyingToDeal] = useState(false);
  const [linkingDeal, setLinkingDeal] = useState<string | null>(null);
  const [linkDealId, setLinkDealId] = useState("");
  const [preBriefLoading, setPreBriefLoading] = useState(false);
  const [preBrief, setPreBrief] = useState<{ calEvent: any; brief: PreBrief } | null>(null);
  const [upcomingMeetings, setUpcomingMeetings] = useState<any[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // ─── Load sessions list ───────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/meetings", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (activeSession) {
          const updated = data.find((s: MeetingSession) => s.id === activeSession.id);
          if (updated) setActiveSession(updated);
        }
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [activeSession]);

  // ─── Load deals for linking ───────────────────────────────────────────────
  const loadDeals = useCallback(async () => {
    try {
      const res = await fetch("/api/deals", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDeals(Array.isArray(data) ? data : data.deals ?? []);
      }
    } catch {}
  }, []);

  // ─── Load upcoming meetings ───────────────────────────────────────────────
  const loadUpcoming = useCallback(async () => {
    setLoadingUpcoming(true);
    try {
      const res = await fetch("/api/meetings/upcoming", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUpcomingMeetings(data);
      }
    } catch {}
    setLoadingUpcoming(false);
  }, []);

  useEffect(() => {
    loadSessions();
    loadDeals();
    const interval = setInterval(loadSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === "prebrief") {
      loadUpcoming();
    }
  }, [activeTab]);

  // ─── SSE stream for active session ───────────────────────────────────────
  useEffect(() => {
    if (!activeSession || activeSession.status === "done" || activeSession.status === "failed") {
      eventSourceRef.current?.close();
      return;
    }

    const es = new EventSource(`/api/meetings/${activeSession.id}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.event === "transcript") {
          setTranscripts(prev => [...prev, data.utterance]);
          setTimeout(() => transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }

        if (data.event === "copilot_suggestion") {
          setSuggestions(prev => [data.suggestion, ...prev]);
          toast.info(`AI: ${data.suggestion.title}`, { duration: 4000 });
        }

        if (data.event === "meeting_complete") {
          setActiveSession(prev => prev ? {
            ...prev,
            status: "done",
            summaryMarkdown: data.summary,
            actionItems: data.actionItems,
            talkRatio: data.talkRatio,
            keyTopics: data.keyTopics,
            sentimentScore: data.sentimentScore,
          } : null);
          loadSessions();
          toast.success("Meeting complete — summary generated");
        }

        if (data.event === "status_change") {
          setActiveSession(prev => prev ? { ...prev, status: data.status } : null);
        }
      } catch {}
    };

    return () => es.close();
  }, [activeSession?.id, activeSession?.status]);

  // ─── Start a new meeting session ─────────────────────────────────────────
  const handleStart = async () => {
    if (!meetingUrl.trim()) {
      toast.error("Please enter a meeting URL");
      return;
    }
    setStarting(true);
    try {
      const res = await fetch("/api/meetings/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          meetingUrl: meetingUrl.trim(),
          title: meetingTitle.trim() || undefined,
          dealId: meetingDealId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start");

      toast.success(data.demo ? "Session created (demo mode — no bot)" : "AI bot is joining the meeting...");
      setShowStartForm(false);
      setMeetingUrl("");
      setMeetingTitle("");
      setMeetingDealId("");
      await loadSessions();

      const newSession: MeetingSession = {
        id: data.sessionId,
        title: meetingTitle || "Untitled Meeting",
        meetingUrl,
        platform: "google_meet",
        status: data.status,
        startedAt: null,
        endedAt: null,
        durationSeconds: null,
        summaryMarkdown: null,
        actionItems: null,
        dealStageRecommendation: null,
        sentimentScore: null,
        talkRatio: null,
        keyTopics: null,
        dealId: meetingDealId || null,
        personId: null,
        accountId: null,
        createdAt: new Date().toISOString(),
      };
      setActiveSession(newSession);
      setTranscripts([]);
      setSuggestions([]);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to start meeting session");
    } finally {
      setStarting(false);
    }
  };

  // ─── Stop the active session ──────────────────────────────────────────────
  const handleStop = async () => {
    if (!activeSession) return;
    setStopping(true);
    try {
      await fetch(`/api/meetings/${activeSession.id}/stop`, {
        method: "POST",
        credentials: "include",
      });
      toast.success("Meeting ended — generating summary...");
      setActiveSession(prev => prev ? { ...prev, status: "post_processing" } : null);
    } catch {
      toast.error("Failed to stop session");
    } finally {
      setStopping(false);
    }
  };

  // ─── Load session detail ──────────────────────────────────────────────────
  const loadSessionDetail = async (sessionId: string) => {
    setSelectedSession(sessionId);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/meetings/${sessionId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSessionDetail(data);
      }
    } catch {
      toast.error("Failed to load session detail");
    } finally {
      setLoadingDetail(false);
    }
  };

  // ─── Dismiss suggestion ───────────────────────────────────────────────────
  const dismissSuggestion = async (sessionId: string, suggestionId: string) => {
    setSuggestions(prev => prev.map(s => s.id === suggestionId ? { ...s, dismissed: true } : s));
    await fetch(`/api/meetings/${sessionId}/dismiss-suggestion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ suggestionId }),
    });
  };

  // ─── Link deal to session ─────────────────────────────────────────────────
  const handleLinkDeal = async (sessionId: string, dealId: string) => {
    if (!dealId) return;
    try {
      const res = await fetch(`/api/meetings/${sessionId}/link-deal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dealId }),
      });
      if (res.ok) {
        toast.success("Deal linked to session");
        setLinkingDeal(null);
        setLinkDealId("");
        await loadSessions();
        if (selectedSession === sessionId) {
          await loadSessionDetail(sessionId);
        }
      }
    } catch {
      toast.error("Failed to link deal");
    }
  };

  // ─── Apply meeting summary to deal ───────────────────────────────────────
  const handleApplyToDeal = async (sessionId: string, applyStageChange: boolean) => {
    setApplyingToDeal(true);
    try {
      const res = await fetch(`/api/meetings/${sessionId}/apply-to-deal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ applyStageChange }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to apply");
      toast.success(
        data.stageUpdated
          ? "Meeting notes and stage update applied to deal"
          : "Meeting notes applied to deal"
      );
    } catch (err: any) {
      toast.error(err.message ?? "Failed to apply to deal");
    } finally {
      setApplyingToDeal(false);
    }
  };

  // ─── Generate pre-brief ───────────────────────────────────────────────────
  const generatePreBrief = async (calEventId: string) => {
    setPreBriefLoading(true);
    setPreBrief(null);
    try {
      const res = await fetch(`/api/meetings/pre-brief/${calEventId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPreBrief(data);
      } else {
        toast.error("Failed to generate pre-brief");
      }
    } catch {
      toast.error("Failed to generate pre-brief");
    } finally {
      setPreBriefLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const activeSuggestions = suggestions.filter(s => !s.dismissed);
  const statusCfg = activeSession ? STATUS_CONFIG[activeSession.status] ?? STATUS_CONFIG.pending : null;

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Video className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Meeting Co-pilot</h1>
            <p className="text-sm text-gray-500">AI joins your calls and surfaces real-time suggestions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadSessions}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => setShowStartForm(true)}
          >
            <Play className="w-4 h-4 mr-1" />
            Start Session
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("sessions")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "sessions"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5" />
            Sessions
          </span>
        </button>
        <button
          onClick={() => setActiveTab("prebrief")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "prebrief"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Pre-brief
          </span>
        </button>
      </div>

      {/* ── SESSIONS TAB ──────────────────────────────────────────────────────── */}
      {activeTab === "sessions" && (
        <>
          {/* Start Session Form */}
          {showStartForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">New Meeting Session</h2>
                <button onClick={() => setShowStartForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Meeting URL *</label>
                  <Input
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={meetingUrl}
                    onChange={e => setMeetingUrl(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">Google Meet, Zoom, or Teams URL</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Session Title (optional)</label>
                  <Input
                    placeholder="e.g. Discovery call with Acme Corp"
                    value={meetingTitle}
                    onChange={e => setMeetingTitle(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Link to Deal (optional)</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={meetingDealId}
                    onChange={e => setMeetingDealId(e.target.value)}
                  >
                    <option value="">No deal linked</option>
                    {deals.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={handleStart}
                    disabled={starting}
                  >
                    {starting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    {starting ? "Launching bot..." : "Launch AI Bot"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowStartForm(false)}>Cancel</Button>
                </div>
              </div>
            </div>
          )}

          {/* Active Session Panel */}
          {activeSession && (
            <div className="bg-white border-2 border-violet-200 rounded-xl p-5 mb-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${statusCfg?.pulse ? "animate-pulse" : ""} ${
                    activeSession.status === "in_progress" ? "bg-green-500" :
                    activeSession.status === "joining" ? "bg-yellow-500" :
                    activeSession.status === "post_processing" ? "bg-blue-500" :
                    "bg-gray-400"
                  }`} />
                  <div>
                    <h2 className="font-semibold text-gray-900">{activeSession.title || "Active Session"}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg?.color}`}>
                        {statusCfg?.label}
                      </span>
                      <span className="text-xs text-gray-500">{PLATFORM_LABELS[activeSession.platform] ?? "Meeting"}</span>
                      {activeSession.dealId && (
                        <span className="text-xs text-violet-600 flex items-center gap-0.5">
                          <Link2 className="w-3 h-3" />
                          Deal linked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(activeSession.status === "in_progress" || activeSession.status === "joining") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={handleStop}
                      disabled={stopping}
                    >
                      {stopping ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Square className="w-4 h-4 mr-1" />}
                      End Session
                    </Button>
                  )}
                  <button className="text-gray-400 hover:text-gray-600" onClick={() => setActiveSession(null)}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Live Transcript */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Live Transcript
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3 h-48 overflow-y-auto text-sm space-y-2">
                    {transcripts.length === 0 ? (
                      <p className="text-gray-400 text-center mt-8">
                        {activeSession.status === "joining" ? "Bot is joining the meeting..." :
                         activeSession.status === "pending" ? "Waiting for bot to join..." :
                         "Transcript will appear here once the call starts"}
                      </p>
                    ) : (
                      transcripts.map(t => (
                        <div key={t.id} className="flex gap-2">
                          <span className="text-xs text-gray-400 w-10 flex-shrink-0 pt-0.5">{formatTime(t.startMs)}</span>
                          <div>
                            <span className="font-medium text-gray-700 text-xs">{t.speaker}: </span>
                            <span className="text-gray-600">{t.text}</span>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={transcriptEndRef} />
                  </div>
                </div>

                {/* AI Suggestions */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-violet-500" />
                    AI Suggestions
                    {activeSuggestions.length > 0 && (
                      <span className="ml-1 bg-violet-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {activeSuggestions.length}
                      </span>
                    )}
                  </h3>
                  <div className="space-y-2 h-48 overflow-y-auto">
                    {activeSuggestions.length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-3 h-full flex items-center justify-center">
                        <p className="text-gray-400 text-sm text-center">
                          AI suggestions will appear here as the conversation progresses
                        </p>
                      </div>
                    ) : (
                      activeSuggestions.map(s => {
                        const cfg = SUGGESTION_CONFIG[s.type] ?? SUGGESTION_CONFIG.deal_context;
                        const Icon = cfg.icon;
                        return (
                          <div key={s.id} className={`border rounded-lg p-3 ${cfg.bg} relative`}>
                            <button
                              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                              onClick={() => dismissSuggestion(activeSession.id, s.id)}
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                              <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                              {s.source === "keyword" && (
                                <span className="text-xs text-gray-400 bg-white border border-gray-200 rounded px-1">instant</span>
                              )}
                              {s.confidence && (
                                <span className="text-xs text-gray-400 ml-auto mr-5">
                                  {Math.round(s.confidence * 100)}%
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-gray-800 mb-0.5">{s.title}</p>
                            <p className="text-xs text-gray-600">{s.body}</p>
                            {s.triggerText && (
                              <p className="text-xs text-gray-400 mt-1 italic truncate">"{s.triggerText}"</p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Post-meeting summary */}
              {activeSession.status === "done" && activeSession.summaryMarkdown && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      Meeting Summary
                    </h3>
                    <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3">{activeSession.summaryMarkdown}</p>
                  </div>

                  {activeSession.actionItems && activeSession.actionItems.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Action Items</h4>
                      <ul className="space-y-1">
                        {activeSession.actionItems.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Talk Ratio */}
                  {activeSession.talkRatio && Object.keys(activeSession.talkRatio).length > 0 && (
                    <TalkRatioBar talkRatio={activeSession.talkRatio} />
                  )}

                  {/* Stage recommendation + Apply to Deal */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                    {activeSession.dealStageRecommendation && activeSession.dealStageRecommendation !== "no_change" && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="w-4 h-4 text-violet-500" />
                        <span className="text-gray-600">Recommended stage:</span>
                        <span className="font-semibold text-violet-700 capitalize">
                          {activeSession.dealStageRecommendation.replace(/_/g, " ")}
                        </span>
                      </div>
                    )}
                    {activeSession.dealId && (
                      <div className="flex gap-2 sm:ml-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplyToDeal(activeSession.id, false)}
                          disabled={applyingToDeal}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          Add Notes to Deal
                        </Button>
                        {activeSession.dealStageRecommendation && activeSession.dealStageRecommendation !== "no_change" && (
                          <Button
                            size="sm"
                            className="bg-violet-600 hover:bg-violet-700 text-white"
                            onClick={() => handleApplyToDeal(activeSession.id, true)}
                            disabled={applyingToDeal}
                          >
                            {applyingToDeal ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5 mr-1" />}
                            Apply + Move Stage
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sessions List */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Past Sessions</h2>
              <span className="text-sm text-gray-500">{sessions.length} total</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center mb-3">
                  <Video className="w-6 h-6 text-violet-400" />
                </div>
                <p className="font-medium text-gray-700 mb-1">No meetings yet</p>
                <p className="text-sm text-gray-500 mb-4">
                  Start a session by pasting a Google Meet, Zoom, or Teams URL above.
                </p>
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={() => setShowStartForm(true)}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Start Your First Session
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {sessions.map(session => {
                  const cfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.pending;
                  const isSelected = selectedSession === session.id;
                  return (
                    <div key={session.id}>
                      <button
                        className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSession(null);
                            setSessionDetail(null);
                          } else {
                            loadSessionDetail(session.id);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                              <Video className="w-4 h-4 text-violet-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{session.title || "Untitled Meeting"}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg.color}`}>
                                  {cfg.label}
                                </span>
                                <span className="text-xs text-gray-400">{PLATFORM_LABELS[session.platform] ?? "Meeting"}</span>
                                {session.durationSeconds && (
                                  <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDuration(session.durationSeconds)}
                                  </span>
                                )}
                                {session.dealId && (
                                  <span className="text-xs text-violet-500 flex items-center gap-0.5">
                                    <Link2 className="w-3 h-3" />
                                    Deal
                                  </span>
                                )}
                                <span className="text-xs text-gray-400">
                                  {new Date(session.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {session.status !== "done" && session.status !== "failed" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 text-xs h-7"
                                onClick={e => {
                                  e.stopPropagation();
                                  setActiveSession(session);
                                  setTranscripts([]);
                                  setSuggestions([]);
                                }}
                              >
                                <Activity className="w-3 h-3 mr-1" />
                                Monitor
                              </Button>
                            )}
                            {isSelected ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Session Detail Expansion */}
                      {isSelected && (
                        <div className="px-5 pb-5 bg-gray-50 border-t border-gray-100">
                          {loadingDetail ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                            </div>
                          ) : sessionDetail ? (
                            <div className="pt-4 space-y-4">
                              {/* Linked deal + link deal UI */}
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                {sessionDetail.linkedDeal ? (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Link2 className="w-4 h-4 text-violet-500" />
                                    <span className="text-gray-600">Linked deal:</span>
                                    <span className="font-semibold text-violet-700">{sessionDetail.linkedDeal.name}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    {linkingDeal === session.id ? (
                                      <>
                                        <select
                                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                          value={linkDealId}
                                          onChange={e => setLinkDealId(e.target.value)}
                                        >
                                          <option value="">Select a deal...</option>
                                          {deals.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                          ))}
                                        </select>
                                        <Button
                                          size="sm"
                                          className="bg-violet-600 hover:bg-violet-700 text-white h-7"
                                          onClick={() => handleLinkDeal(session.id, linkDealId)}
                                          disabled={!linkDealId}
                                        >
                                          Link
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7"
                                          onClick={() => { setLinkingDeal(null); setLinkDealId(""); }}
                                        >
                                          Cancel
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs"
                                        onClick={() => setLinkingDeal(session.id)}
                                      >
                                        <Link2 className="w-3 h-3 mr-1" />
                                        Link to Deal
                                      </Button>
                                    )}
                                  </div>
                                )}

                                {/* Apply to deal button */}
                                {sessionDetail.linkedDeal && sessionDetail.session.summaryMarkdown && (
                                  <div className="flex gap-2 sm:ml-auto">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={() => handleApplyToDeal(session.id, false)}
                                      disabled={applyingToDeal}
                                    >
                                      <FileText className="w-3 h-3 mr-1" />
                                      Add Notes to Deal
                                    </Button>
                                    {sessionDetail.session.dealStageRecommendation &&
                                      sessionDetail.session.dealStageRecommendation !== "no_change" && (
                                      <Button
                                        size="sm"
                                        className="bg-violet-600 hover:bg-violet-700 text-white h-7 text-xs"
                                        onClick={() => handleApplyToDeal(session.id, true)}
                                        disabled={applyingToDeal}
                                      >
                                        <TrendingUp className="w-3 h-3 mr-1" />
                                        Apply + Move Stage
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Summary */}
                              {sessionDetail.session.summaryMarkdown && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Summary</h4>
                                  <p className="text-sm text-gray-700">{sessionDetail.session.summaryMarkdown}</p>
                                </div>
                              )}

                              {/* Action Items */}
                              {sessionDetail.session.actionItems && sessionDetail.session.actionItems.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Action Items</h4>
                                  <ul className="space-y-1">
                                    {sessionDetail.session.actionItems.map((item, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                        <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Talk Ratio */}
                              {sessionDetail.session.talkRatio && Object.keys(sessionDetail.session.talkRatio).length > 0 && (
                                <TalkRatioBar talkRatio={sessionDetail.session.talkRatio} />
                              )}

                              {/* Key Topics + Sentiment */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {sessionDetail.session.keyTopics && sessionDetail.session.keyTopics.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Key Topics</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                      {sessionDetail.session.keyTopics.map((topic, i) => (
                                        <span key={i} className="text-xs bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                                          {topic}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {sessionDetail.session.sentimentScore !== null && (
                                  <div>
                                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Call Sentiment</h4>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                          className={`h-2 rounded-full ${
                                            (sessionDetail.session.sentimentScore ?? 0) > 0.6 ? "bg-green-500" :
                                            (sessionDetail.session.sentimentScore ?? 0) > 0.4 ? "bg-yellow-500" : "bg-red-500"
                                          }`}
                                          style={{ width: `${(sessionDetail.session.sentimentScore ?? 0) * 100}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-gray-600">
                                        {Math.round((sessionDetail.session.sentimentScore ?? 0) * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Transcript */}
                              {sessionDetail.transcripts.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                    Transcript ({sessionDetail.transcripts.length} utterances)
                                  </h4>
                                  <div className="bg-white border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1.5">
                                    {sessionDetail.transcripts.slice(0, 20).map(t => (
                                      <div key={t.id} className="flex gap-2 text-xs">
                                        <span className="text-gray-400 w-8 flex-shrink-0">{formatTime(t.startMs)}</span>
                                        <span className="font-medium text-gray-600">{t.speaker}:</span>
                                        <span className="text-gray-700">{t.text}</span>
                                      </div>
                                    ))}
                                    {sessionDetail.transcripts.length > 20 && (
                                      <p className="text-xs text-gray-400 text-center pt-1">
                                        +{sessionDetail.transcripts.length - 20} more utterances
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* AI Suggestions */}
                              {sessionDetail.suggestions.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                    AI Suggestions ({sessionDetail.suggestions.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {sessionDetail.suggestions.map(s => {
                                      const cfg = SUGGESTION_CONFIG[s.type] ?? SUGGESTION_CONFIG.deal_context;
                                      const Icon = cfg.icon;
                                      return (
                                        <div key={s.id} className={`border rounded-lg p-2.5 ${cfg.bg}`}>
                                          <div className="flex items-center gap-1.5 mb-0.5">
                                            <Icon className={`w-3 h-3 ${cfg.color}`} />
                                            <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                                          </div>
                                          <p className="text-xs font-medium text-gray-800">{s.title}</p>
                                          <p className="text-xs text-gray-600 mt-0.5">{s.body}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── PRE-BRIEF TAB ─────────────────────────────────────────────────────── */}
      {activeTab === "prebrief" && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-500" />
                Upcoming Meetings (next 24 hours)
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Select a meeting to generate an AI pre-brief with deal context, talking points, and agenda suggestions.
              </p>
            </div>

            {loadingUpcoming ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : upcomingMeetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                </div>
                <p className="font-medium text-gray-700 mb-1">No upcoming meetings found</p>
                <p className="text-sm text-gray-500">
                  Connect your Google Calendar or Outlook in Settings → Integrations to see upcoming meetings here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {upcomingMeetings.map(event => (
                  <div key={event.id} className="px-5 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{event.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {new Date(event.startTime).toLocaleString()}
                          {event.attendees?.length > 0 && (
                            <>
                              <Users className="w-3 h-3 ml-1" />
                              {event.attendees.length} attendees
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-violet-600 hover:bg-violet-700 text-white flex-shrink-0"
                        onClick={() => generatePreBrief(event.id)}
                        disabled={preBriefLoading}
                      >
                        {preBriefLoading ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 mr-1" />
                        )}
                        Generate Pre-brief
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pre-brief result */}
          {preBrief && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    Pre-brief: {preBrief.calEvent.title}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(preBrief.calEvent.startTime).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => setPreBrief(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <PreBriefPanel brief={preBrief.brief} />
            </div>
          )}
        </div>
      )}

      {/* Setup Banner */}
      <div className="mt-6 bg-violet-50 border border-violet-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Zap className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-violet-900 mb-1">Setup Required: Recall.ai API Key</p>
            <p className="text-sm text-violet-700">
              To enable live bot joining and real-time transcription, add your{" "}
              <code className="bg-violet-100 px-1 rounded text-xs">RECALL_API_KEY</code> to Railway environment variables.
              Without it, sessions are created in demo mode (no bot joins the call).
              Get your key at{" "}
              <a href="https://www.recall.ai" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                recall.ai
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
