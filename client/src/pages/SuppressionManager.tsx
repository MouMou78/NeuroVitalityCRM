import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  ShieldOff,
  Upload,
  RefreshCw,
  AlertTriangle,
  Ban,
  UserX,
  MailX,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SuppressionEntry {
  id: string;
  email: string;
  reason: "hard_bounce" | "spam_complaint" | "unsubscribed" | "manual" | "frequency_cap" | "domain_block";
  expires_at?: string;
  created_at: string;
}

const REASON_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  hard_bounce: { label: "Hard Bounce", color: "destructive", icon: MailX },
  spam_complaint: { label: "Spam Complaint", color: "destructive", icon: AlertTriangle },
  unsubscribed: { label: "Unsubscribed", color: "secondary", icon: UserX },
  manual: { label: "Manual", color: "outline", icon: Ban },
  frequency_cap: { label: "Frequency Cap", color: "secondary", icon: ShieldOff },
  domain_block: { label: "Domain Block", color: "destructive", icon: Ban },
};

async function fetchSuppressions(reason: string, search: string): Promise<SuppressionEntry[]> {
  const params = new URLSearchParams();
  if (reason !== "all") params.set("reason", reason);
  if (search) params.set("q", search);
  const res = await fetch(`/api/engine/suppression?${params}`);
  if (!res.ok) throw new Error("Failed to load suppression list");
  return res.json();
}

export default function SuppressionManager() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SuppressionEntry | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newReason, setNewReason] = useState<string>("manual");
  const [newExpiry, setNewExpiry] = useState("");
  const [bulkText, setBulkText] = useState("");
  const qc = useQueryClient();

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ["engine-suppression", reasonFilter, search],
    queryFn: () => fetchSuppressions(reasonFilter, search),
  });

  const addMutation = useMutation({
    mutationFn: async (data: { email: string; reason: string; expires_at?: string }) => {
      const res = await fetch("/api/engine/suppression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add suppression");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engine-suppression"] });
      toast.success("Email suppressed");
      setAddOpen(false);
      setNewEmail("");
      setNewReason("manual");
      setNewExpiry("");
    },
    onError: () => toast.error("Failed to add suppression"),
  });

  const bulkMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      const res = await fetch("/api/engine/suppression/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, reason: "manual" }),
      });
      if (!res.ok) throw new Error("Failed to bulk suppress");
      return res.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["engine-suppression"] });
      toast.success(`${data.added || 0} emails suppressed`);
      setBulkOpen(false);
      setBulkText("");
    },
    onError: () => toast.error("Failed to bulk suppress"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/engine/suppression/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove suppression");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engine-suppression"] });
      toast.success("Suppression removed");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to remove suppression"),
  });

  const stats = {
    total: entries.length,
    hard_bounce: entries.filter((e) => e.reason === "hard_bounce").length,
    spam_complaint: entries.filter((e) => e.reason === "spam_complaint").length,
    unsubscribed: entries.filter((e) => e.reason === "unsubscribed").length,
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/engine/workflows")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppression List</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage global email suppression for compliance and deliverability.
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1" /> Bulk Import
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Email
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Suppressed", value: stats.total, icon: ShieldOff, color: "text-primary" },
          { label: "Hard Bounces", value: stats.hard_bounce, icon: MailX, color: "text-red-500" },
          { label: "Spam Complaints", value: stats.spam_complaint, icon: AlertTriangle, color: "text-orange-500" },
          { label: "Unsubscribed", value: stats.unsubscribed, icon: UserX, color: "text-gray-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4">
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
            placeholder="Search by email or domain..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={reasonFilter} onValueChange={setReasonFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Reason" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All reasons</SelectItem>
            <SelectItem value="hard_bounce">Hard Bounce</SelectItem>
            <SelectItem value="spam_complaint">Spam Complaint</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="frequency_cap">Frequency Cap</SelectItem>
            <SelectItem value="domain_block">Domain Block</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Added</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Loading suppression list...
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  <ShieldOff className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No suppressed emails
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const rc = REASON_CONFIG[entry.reason] || REASON_CONFIG.manual;
                const Icon = rc.icon;
                const isExpired = entry.expires_at && new Date(entry.expires_at) < new Date();
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-sm">{entry.email}</TableCell>
                    <TableCell>
                      <Badge variant={rc.color as any} className="flex items-center gap-1 w-fit text-xs">
                        <Icon className="h-3 w-3" />
                        {rc.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      {entry.expires_at ? (
                        <span className={isExpired ? "text-muted-foreground line-through" : "text-amber-600"}>
                          {new Date(entry.expires_at).toLocaleDateString()}
                          {isExpired && " (expired)"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Permanent</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(entry)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Suppress Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email address</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={newReason} onValueChange={setNewReason}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="hard_bounce">Hard Bounce</SelectItem>
                  <SelectItem value="spam_complaint">Spam Complaint</SelectItem>
                  <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                  <SelectItem value="domain_block">Domain Block</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expiry date (optional)</Label>
              <Input
                type="date"
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                addMutation.mutate({
                  email: newEmail,
                  reason: newReason,
                  expires_at: newExpiry || undefined,
                })
              }
              disabled={!newEmail || addMutation.isPending}
            >
              Suppress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk import dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Import Suppressions</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Paste one email address per line. All will be added as manual suppressions.
            </p>
            <Textarea
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"user1@example.com\nuser2@example.com\n..."}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {bulkText.split("\n").filter((l) => l.trim()).length} emails detected
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const emails = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
                if (emails.length === 0) { toast.error("No emails found"); return; }
                bulkMutation.mutate(emails);
              }}
              disabled={bulkMutation.isPending}
            >
              Import {bulkText.split("\n").filter((l) => l.trim()).length} Emails
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove suppression?</AlertDialogTitle>
            <AlertDialogDescription>
              This will allow <strong>{deleteTarget?.email}</strong> to receive emails again.
              Only remove if you are certain this is correct.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
