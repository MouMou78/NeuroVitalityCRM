import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Phone, Building, Briefcase, Plus, MapPin, ExternalLink, TrendingUp, CheckCircle2, Target, Flame, Sparkles, ArrowLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Streamdown } from "streamdown";
import { Link, useLocation } from "wouter";
import { EmailActivityTimeline } from "@/components/EmailActivityTimeline";
import { EmailAnalytics } from "@/components/EmailAnalytics";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import Notes from "@/components/Notes";
import { AIEmailAssistant } from "@/components/AIEmailAssistant";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PersonDetailProps {
  personId: string;
}

export default function PersonDetail({ personId }: PersonDetailProps) {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.people.get.useQuery({ id: personId });

  // Keyboard shortcut: Escape to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLocation("/people");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setLocation]);
  const [insights, setInsights] = useState<{ insights: string; generatedAt: string } | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false);
  const [threadTitle, setThreadTitle] = useState("");
  const [threadNotes, setThreadNotes] = useState("");
  const generateInsightsMutation = trpc.assistant.generateContactInsights.useMutation();
  const sendEmailMutation = trpc.email.send.useMutation();
  const createThreadMutation = trpc.threads.create.useMutation();
  const utils = trpc.useUtils();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12">Person not found</div>;
  }

  const { person, threads } = data;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/people")} className="h-8 px-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          People
        </Button>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{person.fullName}</span>
      </div>
      {/* Mobile-optimized header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xl md:text-2xl font-medium text-primary">
              {person.fullName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">{person.fullName}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-sm md:text-base text-muted-foreground">
              {person.companyName && (
                <div className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                  <span className="truncate">{person.companyName}</span>
                </div>
              )}
              {person.roleTitle && (
                <div className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                  <span className="truncate">{person.roleTitle}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={async () => {
              if (!insights) {
                const result = await generateInsightsMutation.mutateAsync({ contactId: personId });
                setInsights(result);
              }
              setShowInsights(!showInsights);
            }}
            disabled={generateInsightsMutation.isPending}
            className="flex-1 md:flex-none"
          >
            {generateInsightsMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            <span className="hidden sm:inline">{insights ? (showInsights ? 'Hide' : 'Show') + ' AI Insights' : 'Generate AI Insights'}</span>
            <span className="sm:hidden">Insights</span>
          </Button>
          <Dialog open={isNewThreadOpen} onOpenChange={setIsNewThreadOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 md:flex-none">
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">New Thread</span>
                <span className="sm:hidden">Thread</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Thread</DialogTitle>
                <DialogDescription>
                  Start a new conversation thread with {person.fullName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="thread-title">Thread Title</Label>
                  <Input
                    id="thread-title"
                    placeholder="e.g., Q1 2026 Partnership Discussion"
                    value={threadTitle}
                    onChange={(e) => setThreadTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thread-notes">Initial Notes (Optional)</Label>
                  <Textarea
                    id="thread-notes"
                    placeholder="Add any initial context or notes..."
                    value={threadNotes}
                    onChange={(e) => setThreadNotes(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsNewThreadOpen(false);
                    setThreadTitle("");
                    setThreadNotes("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!threadTitle.trim()) {
                      toast.error("Please enter a thread title");
                      return;
                    }
                    try {
                      const result = await createThreadMutation.mutateAsync({
                        personId: personId,
                        source: "manual",
                        intent: "outbound",
                        title: threadTitle,
                      });
                      toast.success("Thread created successfully");
                      setIsNewThreadOpen(false);
                      setThreadTitle("");
                      setThreadNotes("");
                      utils.people.get.invalidate({ id: personId });
                    } catch (error) {
                      toast.error("Failed to create thread");
                    }
                  }}
                  disabled={createThreadMutation.isPending}
                >
                  {createThreadMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Create Thread
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* AI Insights */}
      {showInsights && insights && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI-Powered Insights
            </CardTitle>
            <CardDescription>
              Generated {new Date(insights.generatedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <Streamdown>{insights.insights}</Streamdown>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={async () => {
                const result = await generateInsightsMutation.mutateAsync({ contactId: personId });
                setInsights(result);
              }}
              disabled={generateInsightsMutation.isPending}
            >
              {generateInsightsMutation.isPending ? (
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 mr-2" />
              )}
              Refresh Insights
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Email Analytics */}
      <EmailAnalytics personId={personId} />

      {/* Activity Timeline */}
      <ActivityTimeline personId={personId} limit={50} />

      {/* Email Activity Timeline */}
      <EmailActivityTimeline 
        activities={threads.flatMap(thread => 
          thread.moments?.filter(m => 
            m.type === 'email_sent' || m.type === 'email_received' || m.type === 'reply_received'
          ).map(m => ({
            id: m.id,
            type: m.type as 'email_sent' | 'email_received' | 'reply_received',
            timestamp: new Date(m.timestamp),
            metadata: m.metadata as any
          })) || []
        )}
      />

      {/* Lead Score Breakdown */}
      {(person.fitScore !== null || person.intentScore !== null) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Lead Score
            </CardTitle>
            <CardDescription>Fit and intent scoring breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Fit Score */}
              {person.fitScore !== null && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Fit Score</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{person.fitScore}</span>
                      {person.fitTier && (
                        <Badge
                          variant={person.fitTier === "A" ? "default" : person.fitTier === "B" ? "secondary" : "outline"}
                        >
                          Tier {person.fitTier}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {person.scoreReasons && Array.isArray(person.scoreReasons) && person.scoreReasons.filter((r: any) => r.category === 'fit').length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Contributing Factors:</p>
                      {person.scoreReasons.filter((r: any) => r.category === 'fit').map((reason: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{reason.reason}</span>
                          <span className="font-medium">+{reason.points}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Intent Score */}
              {person.intentScore !== null && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Intent Score</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{person.intentScore}</span>
                      {person.intentTier && (
                        <Badge
                          variant={person.intentTier === "Hot" ? "destructive" : person.intentTier === "Warm" ? "default" : "secondary"}
                        >
                          {person.intentTier}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {person.scoreReasons && Array.isArray(person.scoreReasons) && person.scoreReasons.filter((r: any) => r.category === 'intent').length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Recent Activity:</p>
                      {person.scoreReasons.filter((r: any) => r.category === 'intent').map((reason: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{reason.reason}</span>
                          <span className="font-medium">+{reason.points}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No recent intent signals</p>
                  )}
                </div>
              )}
            </div>

            {/* Combined Score */}
            {person.combinedScore !== null && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Combined Score</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">{person.combinedScore}</span>
                    <span className="text-xs text-muted-foreground">(60% fit, 40% intent)</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <Mail className="w-4 h-4" />
                Email
              </div>
              <p className="text-sm text-muted-foreground">{person.primaryEmail}</p>
            </div>
            
            {(person.phone || person.mobileNumber || person.workNumber || person.sourcedNumber) && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Phone className="w-4 h-4" />
                  Phone Numbers
                </div>
                <div className="space-y-1">
                  {person.phone && (
                    <p className="text-sm text-muted-foreground">Primary: {person.phone}</p>
                  )}
                  {person.mobileNumber && (
                    <p className="text-sm text-muted-foreground">Mobile: {person.mobileNumber}</p>
                  )}
                  {person.workNumber && (
                    <p className="text-sm text-muted-foreground">Work: {person.workNumber}</p>
                  )}
                  {person.sourcedNumber && (
                    <p className="text-sm text-muted-foreground">Sourced: {person.sourcedNumber}</p>
                  )}
                </div>
              </div>
            )}

            {person.location && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <MapPin className="w-4 h-4" />
                  Location
                </div>
                <p className="text-sm text-muted-foreground">{person.location}</p>
              </div>
            )}

            {person.linkedinUrl && (
              <div>
                <a
                  href={person.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  LinkedIn Profile
                </a>
              </div>
            )}

            {person.enrichmentSource === "amplemarket" && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-sm font-medium mb-3">
                  <TrendingUp className="w-4 h-4" />
                  Engagement Metrics
                </div>
                <div className="space-y-2">
                  {person.status && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="outline">{person.status}</Badge>
                    </div>
                  )}
                  {person.numberOfOpens !== null && person.numberOfOpens !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Email Opens</span>
                      <span className="font-medium">{person.numberOfOpens}</span>
                    </div>
                  )}
                  {person.replied && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Replied</span>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                  )}
                  {person.meetingBooked && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Meeting Booked</span>
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  {person.sequenceName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sequence</span>
                      <span className="font-medium text-xs">{person.sequenceName}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {person.tags && person.tags.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {person.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Threads</CardTitle>
            <CardDescription>Conversation history with this person</CardDescription>
          </CardHeader>
          <CardContent>
            {threads && threads.length > 0 ? (
              <div className="space-y-3">
                {threads.map((thread) => (
                  <Link key={thread.id} href={`/threads/${thread.id}`}>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                      <div>
                        <p className="font-medium">{thread.title || `Thread from ${thread.source}`}</p>
                        <p className="text-sm text-muted-foreground">
                          Intent: {thread.intent} • Status: {thread.status}
                        </p>
                      </div>
                      <Badge variant={thread.status === "active" ? "default" : "secondary"}>
                        {thread.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No threads yet</p>
            )}
          </CardContent>
        </Card>

        {/* Email Composition Section */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Send Email</CardTitle>
            <CardDescription>Compose an email to {person.firstName}</CardDescription>
          </CardHeader>
          <CardContent>
            <AIEmailAssistant
              contactId={personId}
              onApply={(subject: string, body: string) => {
                if (!person?.primaryEmail) {
                  toast.error("This contact doesn't have an email address.");
                  return;
                }
                
                sendEmailMutation.mutate(
                  {
                    to: person.primaryEmail,
                    subject,
                    body,
                    contactId: personId,
                  },
                  {
                    onSuccess: () => {
                      toast.success(`Email sent successfully to ${person.primaryEmail}`);
                    },
                    onError: (error) => {
                      toast.error(`Failed to send email: ${error.message}`);
                    },
                  }
                );
              }}
            />
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Notes entityType="contact" entityId={personId} />
      </div>
    </div>
  );
}
