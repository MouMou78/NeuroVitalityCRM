import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Mail, Phone, Calendar, MessageSquare, UserPlus, CheckCircle2, ArrowLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useLocation, Link } from "wouter";

interface ThreadDetailProps {
  threadId: string;
}

const momentIcons: Record<string, any> = {
  email_sent: Mail,
  email_received: Mail,
  reply_received: Mail,
  call_completed: Phone,
  meeting_held: Calendar,
  note_added: MessageSquare,
  signal_detected: UserPlus,
  lead_captured: UserPlus,
};

export default function ThreadDetail({ threadId }: ThreadDetailProps) {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.threads.get.useQuery({ id: threadId });
  
  // Keyboard shortcut: Escape to go back
  useEffect(() => {
    if (!data) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLocation(`/people/${data.thread.personId}`);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setLocation, data]);
  const [note, setNote] = useState("");
  
  const createMoment = trpc.moments.create.useMutation();
  const completeAction = trpc.actions.complete.useMutation();

  const handleAddNote = async () => {
    if (!note.trim() || !data) return;
    
    await createMoment.mutateAsync({
      threadId: data.thread.id,
      personId: data.thread.personId,
      type: "note_added",
      content: note,
    });
    
    setNote("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12">Thread not found</div>;
  }

  const { thread, moments, nextAction } = data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/people")} className="h-8 px-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          People
        </Button>
        <ChevronRight className="h-4 w-4" />
        <Button variant="ghost" size="sm" onClick={() => setLocation(`/people/${thread.personId}`)} className="h-8 px-2 hover:bg-transparent">
          Contact
        </Button>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{thread.title || "Thread"}</span>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {thread.title || "Thread"}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant={thread.status === "active" ? "default" : "secondary"}>
              {thread.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Intent: {thread.intent}
            </span>
            <span className="text-sm text-muted-foreground">
              Source: {thread.source}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>All interactions in this thread</CardDescription>
            </CardHeader>
            <CardContent>
              {moments && moments.length > 0 ? (
                <div className="space-y-4">
                  {moments.map((moment) => {
                    const Icon = momentIcons[moment.type] || MessageSquare;
                    return (
                      <div key={moment.id} className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium">{moment.type.replace(/_/g, " ")}</p>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(moment.timestamp), "MMM d, yyyy h:mm a")}
                            </span>
                          </div>
                          {moment.metadata && typeof moment.metadata === "object" && "content" in moment.metadata && (
                            <p className="text-sm text-muted-foreground">{String(moment.metadata.content)}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">Source: {moment.source}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No moments yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Note</CardTitle>
              <CardDescription>Record a manual note for this thread</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="Type your note here..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                />
                <Button onClick={handleAddNote} disabled={!note.trim() || createMoment.isPending}>
                  {createMoment.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Add Note
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Next Action</CardTitle>
              <CardDescription>Upcoming task for this thread</CardDescription>
            </CardHeader>
            <CardContent>
              {nextAction ? (
                <div className="space-y-4">
                  <div>
                    <p className="font-medium">{nextAction.actionType}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Trigger: {nextAction.triggerValue}
                    </p>
                    <Badge variant="outline" className="mt-2">
                      {nextAction.status}
                    </Badge>
                  </div>
                  {nextAction.status === "open" && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => completeAction.mutate({ id: nextAction.id })}
                      disabled={completeAction.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Complete Action
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No pending actions</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
