import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, DollarSign, Calendar, User, Building2, Mail,
  Video, Play, Clock, CheckCircle2, AlertCircle, ExternalLink,
  TrendingUp, ListChecks, Plus,
} from "lucide-react";
import Notes from "@/components/Notes";
import { AIEmailAssistant } from "@/components/AIEmailAssistant";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState, useEffect } from "react";

// ─── Meeting URL detector ─────────────────────────────────────────────────────
function detectMeetingUrl(text: string): string | null {
  const patterns = [
    /https:\/\/meet\.google\.com\/[a-z0-9\-]+/i,
    /https:\/\/[a-z0-9]+\.zoom\.us\/j\/[0-9]+/i,
    /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s"]+/i,
    /https:\/\/[a-z0-9]+\.webex\.com\/[^\s"]+/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

// ─── Health score badge ───────────────────────────────────────────────────────
function HealthBadge({ score, grade, label }: { score: number; grade: string; label: string }) {
  const colorMap: Record<string, string> = {
    A: "bg-green-100 text-green-800 border-green-200",
    B: "bg-blue-100 text-blue-800 border-blue-200",
    C: "bg-yellow-100 text-yellow-800 border-yellow-200",
    D: "bg-orange-100 text-orange-800 border-orange-200",
    F: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${colorMap[grade] ?? "bg-gray-100 text-gray-700"}`}>
      {grade} · {score}/100 · {label}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending:         { label: "Pending",         cls: "bg-gray-100 text-gray-700",   icon: <Clock className="h-3 w-3" /> },
    joining:         { label: "Joining",         cls: "bg-blue-100 text-blue-700",   icon: <Play className="h-3 w-3" /> },
    in_call:         { label: "Live",            cls: "bg-green-100 text-green-700", icon: <Video className="h-3 w-3" /> },
    post_processing: { label: "Processing",      cls: "bg-yellow-100 text-yellow-700", icon: <Clock className="h-3 w-3" /> },
    completed:       { label: "Completed",       cls: "bg-purple-100 text-purple-700", icon: <CheckCircle2 className="h-3 w-3" /> },
    failed:          { label: "Failed",          cls: "bg-red-100 text-red-700",     icon: <AlertCircle className="h-3 w-3" /> },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-700", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
}

export default function DealDetail() {
  const params = useParams();
  const dealId = params.id as string;
  const [, setLocation] = useLocation();
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [startingSession, setStartingSession] = useState(false);
  const [meetingSessions, setMeetingSessions] = useState<any[]>([]);
  const [healthScores, setHealthScores] = useState<Record<string, any>>({});
  const [selectedActionItems, setSelectedActionItems] = useState<Record<string, string[]>>({});
  const [creatingTasks, setCreatingTasks] = useState<Record<string, boolean>>({});

  const { data: deal, isLoading } = trpc.deals.get.useQuery({ dealId });
  const { data: dealContacts } = trpc.people.getByDeal.useQuery({ dealId });
  const sendEmailMutation = trpc.email.send.useMutation();

  // Load meeting sessions for this deal
  useEffect(() => {
    fetch(`/api/meetings/deal/${dealId}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMeetingSessions(data);
          // Load health scores for completed sessions
          data.filter((s: any) => s.status === "completed").forEach((s: any) => {
            fetch(`/api/meetings/${s.id}/health-score`, { credentials: "include" })
              .then(r => r.json())
              .then(hs => setHealthScores(prev => ({ ...prev, [s.id]: hs })))
              .catch(() => {});
          });
        }
      })
      .catch(() => {});
  }, [dealId]);

  // Detect meeting URL in deal notes
  const detectedUrl = deal?.notes ? detectMeetingUrl(deal.notes) : null;

  async function startMeetingSession(url: string) {
    if (!url) { toast.error("Please enter a meeting URL"); return; }
    setStartingSession(true);
    try {
      const res = await fetch("/api/meetings/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ meetingUrl: url, dealId, title: `Meeting: ${deal?.name}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start session");
      toast.success(data.demo ? "Session created (demo mode — add RECALL_API_KEY to activate bot)" : "Bot is joining the meeting!");
      setLocation(`/meetings?session=${data.sessionId}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setStartingSession(false);
    }
  }

  async function createTasksFromActionItems(sessionId: string, items: string[]) {
    if (!items.length) { toast.error("Select at least one action item"); return; }
    setCreatingTasks(prev => ({ ...prev, [sessionId]: true }));
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3); // default: due in 3 days
      const res = await fetch(`/api/meetings/${sessionId}/create-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ actionItems: items, dueDate: dueDate.toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create tasks");
      toast.success(`${data.createdCount} task${data.createdCount !== 1 ? "s" : ""} created and linked to this deal`);
      setSelectedActionItems(prev => ({ ...prev, [sessionId]: [] }));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreatingTasks(prev => ({ ...prev, [sessionId]: false }));
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Deal Not Found</h2>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/deals")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pipeline
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-6 sm:py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/deals")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pipeline
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{deal.name}</h1>
        <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
          <Badge variant="outline">Stage ID: {deal.stageId}</Badge>
          <span className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            {deal.value ? `$${Number(deal.value).toLocaleString()}` : "No value"}
          </span>
          {deal.expectedCloseDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(deal.expectedCloseDate), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>

      {/* Meeting URL detected in notes — offer to start session */}
      {detectedUrl && (
        <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50 flex flex-col sm:flex-row sm:items-center gap-3">
          <Video className="h-5 w-5 text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900">Meeting link detected in deal notes</p>
            <p className="text-xs text-blue-700 truncate">{detectedUrl}</p>
          </div>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
            onClick={() => startMeetingSession(detectedUrl)}
            disabled={startingSession}
          >
            {startingSession ? "Starting…" : "Start Co-pilot Session"}
          </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Deal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Deal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deal.accountId && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Company</label>
                <div className="flex items-center gap-2 mt-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>Account ID: {deal.accountId}</span>
                </div>
              </div>
            )}
            {deal.contactId && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Primary Contact</label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Contact ID: {deal.contactId}</span>
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Stage</label>
              <p className="mt-1">Stage ID: {deal.stageId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Value</label>
              <p className="mt-1 text-lg font-semibold">
                {deal.value ? `$${Number(deal.value).toLocaleString()}` : "Not set"}
              </p>
            </div>
            {deal.expectedCloseDate && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Expected Close Date</label>
                <p className="mt-1">{format(new Date(deal.expectedCloseDate), "MMMM d, yyyy")}</p>
              </div>
            )}
            {deal.probability !== undefined && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Probability</label>
                <p className="mt-1">{deal.probability}%</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="mt-1">{format(new Date(deal.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>
            {deal.updatedAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="mt-1">{format(new Date(deal.updatedAt), "MMM d, yyyy 'at' h:mm a")}</p>
              </div>
            )}
            {deal.ownerUserId && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Owner</label>
                <p className="mt-1">User ID: {deal.ownerUserId}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Meeting Co-pilot Panel ─────────────────────────────────────────── */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Meeting Co-pilot
                </CardTitle>
                <CardDescription>Start an AI-assisted session or review past meetings for this deal</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation("/meetings")}
                className="w-full sm:w-auto"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Co-pilot
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Start new session */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Paste Google Meet / Zoom / Teams URL…"
                value={meetingUrl}
                onChange={e => setMeetingUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => startMeetingSession(meetingUrl)}
                disabled={startingSession || !meetingUrl}
                className="w-full sm:w-auto"
              >
                {startingSession ? (
                  <span className="flex items-center gap-2"><div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Starting…</span>
                ) : (
                  <span className="flex items-center gap-2"><Play className="h-4 w-4" />Start Session</span>
                )}
              </Button>
            </div>

            {/* Past sessions */}
            {meetingSessions.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">{meetingSessions.length} past session{meetingSessions.length !== 1 ? "s" : ""}</p>
                {meetingSessions.map((session: any) => {
                  const hs = healthScores[session.id];
                  const actionItems: string[] = session.actionItems ?? [];
                  const selected = selectedActionItems[session.id] ?? [];

                  return (
                    <div key={session.id} className="rounded-lg border p-4 space-y-3">
                      {/* Session header */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-sm">{session.title ?? "Untitled Session"}</span>
                            <StatusBadge status={session.status} />
                            {hs && <HealthBadge score={hs.score} grade={hs.grade} label={hs.label} />}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(session.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            {session.durationSeconds ? ` · ${Math.round(session.durationSeconds / 60)} min` : ""}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setLocation(`/meetings?session=${session.id}`)}
                          className="w-full sm:w-auto text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>

                      {/* Summary */}
                      {session.summaryMarkdown && (
                        <p className="text-sm text-muted-foreground line-clamp-3">{session.summaryMarkdown}</p>
                      )}

                      {/* Key topics */}
                      {session.keyTopics && (session.keyTopics as string[]).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(session.keyTopics as string[]).map((t: string) => (
                            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                          ))}
                        </div>
                      )}

                      {/* Health score breakdown */}
                      {hs && (
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded bg-muted p-2">
                            <p className="font-semibold">{hs.breakdown.sentiment.score}/40</p>
                            <p className="text-muted-foreground">Sentiment</p>
                          </div>
                          <div className="rounded bg-muted p-2">
                            <p className="font-semibold">{hs.breakdown.talkRatio.score}/30</p>
                            <p className="text-muted-foreground">Talk Balance</p>
                          </div>
                          <div className="rounded bg-muted p-2">
                            <p className="font-semibold">{hs.breakdown.actionItems.score}/30</p>
                            <p className="text-muted-foreground">Action Items</p>
                          </div>
                        </div>
                      )}

                      {/* Action items → tasks */}
                      {actionItems.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium flex items-center gap-1">
                              <ListChecks className="h-3 w-3" />
                              Action Items — create as tasks
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs px-2"
                              disabled={!selected.length || creatingTasks[session.id]}
                              onClick={() => createTasksFromActionItems(session.id, selected)}
                            >
                              {creatingTasks[session.id] ? "Creating…" : (
                                <><Plus className="h-3 w-3 mr-1" />Create {selected.length > 0 ? selected.length : ""} Task{selected.length !== 1 ? "s" : ""}</>
                              )}
                            </Button>
                          </div>
                          <div className="space-y-1">
                            {actionItems.map((item: string, idx: number) => (
                              <label key={idx} className="flex items-start gap-2 cursor-pointer group">
                                <Checkbox
                                  checked={selected.includes(item)}
                                  onCheckedChange={(checked) => {
                                    setSelectedActionItems(prev => ({
                                      ...prev,
                                      [session.id]: checked
                                        ? [...(prev[session.id] ?? []), item]
                                        : (prev[session.id] ?? []).filter(i => i !== item),
                                    }));
                                  }}
                                  className="mt-0.5"
                                />
                                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{item}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Video className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No meeting sessions yet for this deal</p>
                <p className="text-xs mt-1">Paste a meeting URL above to start an AI-assisted session</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Composition Section */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Send Email</CardTitle>
            <CardDescription>Compose an email related to this deal</CardDescription>
          </CardHeader>
          <CardContent>
            {dealContacts && dealContacts.length > 0 && (
              <div className="mb-6 p-4 border rounded-lg bg-muted/50">
                <Label className="text-sm font-semibold mb-3 block">Select Recipients</Label>
                <div className="space-y-2">
                  {dealContacts.map((contact: any) => (
                    <div key={contact.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`contact-${contact.id}`}
                        checked={selectedContacts.includes(contact.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedContacts([...selectedContacts, contact.id]);
                          } else {
                            setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={`contact-${contact.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                      >
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {contact.fullName || contact.firstName + " " + contact.lastName} ({contact.primaryEmail})
                      </label>
                    </div>
                  ))}
                  {dealContacts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (selectedContacts.length === dealContacts.length) {
                          setSelectedContacts([]);
                        } else {
                          setSelectedContacts(dealContacts.map((c: any) => c.id));
                        }
                      }}
                      className="mt-2"
                    >
                      {selectedContacts.length === dealContacts.length ? "Deselect All" : "Select All"}
                    </Button>
                  )}
                </div>
              </div>
            )}
            <AIEmailAssistant
              dealId={dealId}
              onApply={(subject: string, body: string) => {
                if (!dealContacts || dealContacts.length === 0) {
                  toast.error("No contacts associated with this deal");
                  return;
                }
                if (selectedContacts.length === 0) {
                  toast.error("Please select at least one recipient");
                  return;
                }
                const selectedEmails = dealContacts
                  .filter((c: any) => selectedContacts.includes(c.id))
                  .map((c: any) => c.primaryEmail);
                selectedEmails.forEach((email: string) => {
                  sendEmailMutation.mutate(
                    { to: email, subject, body, dealId },
                    {
                      onSuccess: () => toast.success(`Email sent to ${email}`),
                      onError: (error) => toast.error(`Failed to send email to ${email}: ${error.message}`),
                    }
                  );
                });
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Contextual Notes */}
      <div className="mt-6">
        <Notes entityType="deal" entityId={dealId} />
      </div>
    </div>
  );
}
