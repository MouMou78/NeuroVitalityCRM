import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Mail,
  Globe,
  Database,
  Calendar,
  Tag,
  ChevronRight,
  Activity,
  Filter,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface CrmEvent {
  event_id: string;
  tenant_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  source: string;
  occurred_at: string;
  received_at: string;
  payload?: Record<string, any>;
  processed: boolean;
}

const EVENT_CATEGORIES: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  email_sent: { label: "Email Sent", color: "bg-blue-100 text-blue-700", icon: Mail },
  email_delivered: { label: "Delivered", color: "bg-blue-100 text-blue-700", icon: Mail },
  email_opened: { label: "Opened", color: "bg-emerald-100 text-emerald-700", icon: Mail },
  email_clicked: { label: "Clicked", color: "bg-emerald-100 text-emerald-700", icon: Mail },
  email_replied: { label: "Replied", color: "bg-green-100 text-green-700", icon: Mail },
  email_bounced: { label: "Bounced", color: "bg-red-100 text-red-700", icon: Mail },
  email_unsubscribed: { label: "Unsubscribed", color: "bg-orange-100 text-orange-700", icon: Mail },
  page_visit: { label: "Page Visit", color: "bg-purple-100 text-purple-700", icon: Globe },
  time_on_page: { label: "Time on Page", color: "bg-purple-100 text-purple-700", icon: Globe },
  form_started: { label: "Form Started", color: "bg-indigo-100 text-indigo-700", icon: Globe },
  form_submitted: { label: "Form Submitted", color: "bg-indigo-100 text-indigo-700", icon: Globe },
  field_update: { label: "Field Update", color: "bg-gray-100 text-gray-700", icon: Database },
  tag_added: { label: "Tag Added", color: "bg-yellow-100 text-yellow-700", icon: Tag },
  owner_changed: { label: "Owner Changed", color: "bg-gray-100 text-gray-700", icon: Database },
  meeting_booked: { label: "Meeting Booked", color: "bg-teal-100 text-teal-700", icon: Calendar },
  score_adjustment: { label: "Score Adj.", color: "bg-pink-100 text-pink-700", icon: Activity },
  manual_tag: { label: "Manual Tag", color: "bg-yellow-100 text-yellow-700", icon: Tag },
};

const EVENT_GROUPS = [
  { label: "All", value: "all" },
  { label: "Email", value: "email" },
  { label: "Web", value: "web" },
  { label: "CRM", value: "crm" },
  { label: "Meeting", value: "meeting" },
];

const EVENT_GROUP_MAP: Record<string, string[]> = {
  email: ["email_sent","email_delivered","email_opened","email_clicked","email_replied","email_bounced","email_unsubscribed"],
  web: ["page_visit","time_on_page","form_started","form_submitted"],
  crm: ["field_update","tag_added","owner_changed","score_adjustment","manual_tag"],
  meeting: ["meeting_booked"],
};

async function fetchEvents(params: URLSearchParams): Promise<{ events: CrmEvent[]; total: number }> {
  const res = await fetch(`/api/engine/events?${params}`);
  if (!res.ok) throw new Error("Failed to load events");
  return res.json();
}

export default function EngineEventLog() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [processedFilter, setProcessedFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<CrmEvent | null>(null);
  const PAGE_SIZE = 50;
  const qc = useQueryClient();

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("q", search);
  if (groupFilter !== "all") {
    const types = EVENT_GROUP_MAP[groupFilter] || [];
    types.forEach((t) => queryParams.append("event_type", t));
  }
  if (sourceFilter !== "all") queryParams.set("source", sourceFilter);
  if (processedFilter !== "all") queryParams.set("processed", processedFilter);
  queryParams.set("limit", String(PAGE_SIZE));
  queryParams.set("offset", String(page * PAGE_SIZE));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["engine-events", search, groupFilter, sourceFilter, processedFilter, page],
    queryFn: () => fetchEvents(queryParams),
    staleTime: 15000,
  });

  const events = data?.events || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleString("en-GB", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  };

  const formatRelative = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
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
          <h1 className="text-2xl font-bold tracking-tight">Event Log</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Canonical event stream — every interaction ingested by the sequencing engine.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{total.toLocaleString()} events</span>
          <Button variant="outline" size="sm" onClick={() => { refetch(); setPage(0); }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Group tabs */}
      <div className="flex gap-1 flex-wrap">
        {EVENT_GROUPS.map((g) => (
          <Button
            key={g.value}
            variant={groupFilter === g.value ? "default" : "outline"}
            size="sm"
            onClick={() => { setGroupFilter(g.value); setPage(0); }}
          >
            {g.label}
          </Button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by entity ID or event type..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(0); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="sendgrid">SendGrid</SelectItem>
            <SelectItem value="amplemarket">Amplemarket</SelectItem>
            <SelectItem value="webhook">Webhook</SelectItem>
            <SelectItem value="crm">CRM</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={processedFilter} onValueChange={(v) => { setProcessedFilter(v); setPage(0); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Processed" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Processed</SelectItem>
            <SelectItem value="false">Unprocessed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Occurred</TableHead>
              <TableHead>Processed</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Loading events...
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No events found
                </TableCell>
              </TableRow>
            ) : (
              events.map((ev) => {
                const ec = EVENT_CATEGORIES[ev.event_type] || {
                  label: ev.event_type,
                  color: "bg-gray-100 text-gray-700",
                  icon: Activity,
                };
                const Icon = ec.icon;
                return (
                  <TableRow
                    key={ev.event_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedEvent(ev)}
                  >
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ec.color}`}>
                        <Icon className="h-3 w-3" />
                        {ec.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-mono">{ev.entity_id.slice(0, 8)}…</p>
                        <p className="text-xs text-muted-foreground capitalize">{ev.entity_type}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{ev.source}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs">{formatTime(ev.occurred_at)}</p>
                        <p className="text-xs text-muted-foreground">{formatRelative(ev.occurred_at)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`h-2 w-2 rounded-full inline-block ${ev.processed ? "bg-emerald-500" : "bg-amber-400"}`} />
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Event detail dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && (() => {
                const ec = EVENT_CATEGORIES[selectedEvent.event_type] || { label: selectedEvent.event_type, color: "bg-gray-100 text-gray-700", icon: Activity };
                const Icon = ec.icon;
                return (
                  <>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ec.color}`}>
                      <Icon className="h-3 w-3" />
                      {ec.label}
                    </span>
                    Event Detail
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Event ID", selectedEvent.event_id],
                  ["Entity ID", selectedEvent.entity_id],
                  ["Entity Type", selectedEvent.entity_type],
                  ["Source", selectedEvent.source],
                  ["Occurred", new Date(selectedEvent.occurred_at).toLocaleString()],
                  ["Received", new Date(selectedEvent.received_at).toLocaleString()],
                  ["Processed", selectedEvent.processed ? "Yes" : "No"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="font-mono text-xs break-all">{v}</p>
                  </div>
                ))}
              </div>
              {selectedEvent.payload && Object.keys(selectedEvent.payload).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Payload</p>
                  <pre className="bg-muted rounded p-3 text-xs overflow-auto max-h-48">
                    {JSON.stringify(selectedEvent.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
