import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Video, VideoOff, Mic, MicOff, Play, Square, Clock, CheckCircle,
  AlertTriangle, Zap, Users, TrendingUp, MessageSquare, ChevronDown,
  ChevronRight, Loader2, RefreshCw, X, ExternalLink, Brain, Target,
  Shield, ArrowRight, Activity
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
  createdAt: string;
  dismissed?: boolean;
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
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<{ session: MeetingSession; transcripts: TranscriptLine[]; suggestions: CopilotSuggestion[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // ─── Load sessions list ───────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/meetings", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        // Update active session status if it's in the list
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

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 10000);
    return () => clearInterval(interval);
  }, []);

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
          toast.info(`AI Suggestion: ${data.suggestion.title}`, { duration: 4000 });
        }

        if (data.event === "meeting_complete") {
          setActiveSession(prev => prev ? { ...prev, status: "done", summaryMarkdown: data.summary, actionItems: data.actionItems } : null);
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
        body: JSON.stringify({ meetingUrl: meetingUrl.trim(), title: meetingTitle.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start");

      toast.success(data.demo ? "Session created (demo mode — no bot)" : "AI bot is joining the meeting...");
      setShowStartForm(false);
      setMeetingUrl("");
      setMeetingTitle("");
      await loadSessions();

      // Set as active session
      const newSession: MeetingSession = {
        id: data.sessionId,
        title: meetingTitle || "Untitled Meeting",
        meetingUrl: meetingUrl,
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
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setActiveSession(null)}
              >
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
                      <span className="text-xs text-gray-400 w-10 flex-shrink-0 pt-0.5">
                        {formatTime(t.startMs)}
                      </span>
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
                          {s.confidence && (
                            <span className="text-xs text-gray-400 ml-auto mr-5">
                              {Math.round(s.confidence * 100)}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-gray-800 mb-0.5">{s.title}</p>
                        <p className="text-xs text-gray-600">{s.body}</p>
                        {s.triggerText && (
                          <p className="text-xs text-gray-400 mt-1 italic">Triggered by: "{s.triggerText}"</p>
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
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                Meeting Summary
              </h3>
              <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3">{activeSession.summaryMarkdown}</p>
              {activeSession.actionItems && activeSession.actionItems.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-semibold text-gray-600 mb-1.5">Action Items</h4>
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
              {activeSession.dealStageRecommendation && activeSession.dealStageRecommendation !== "no_change" && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-violet-500" />
                  <span className="text-gray-600">Recommended stage move:</span>
                  <span className="font-semibold text-violet-700 capitalize">
                    {activeSession.dealStageRecommendation.replace(/_/g, " ")}
                  </span>
                </div>
              )}
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
              The AI bot will join, transcribe, and provide real-time suggestions.
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
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            <span className="text-xs text-gray-400">
                              {PLATFORM_LABELS[session.platform] ?? "Meeting"}
                            </span>
                            {session.durationSeconds && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDuration(session.durationSeconds)}
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

                          {/* Transcript snippet */}
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

                          {/* Suggestions */}
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

      {/* Setup Banner */}
      <div className="mt-4 bg-violet-50 border border-violet-200 rounded-xl p-4">
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
