import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Search, Shield, ShieldOff, RotateCcw, UserPlus, Trash2, Copy, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  engineering: "Engineering",
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  user: "Member",
};

const ROLE_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  engineering: "default",
  owner: "default",
  admin: "default",
  manager: "secondary",
  member: "secondary",
  user: "secondary",
};

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "admin" | "member">("member");
  const [inviteResult, setInviteResult] = useState<{ resetUrl: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const { data: users = [], isLoading } = trpc.admin.listUsers.useQuery();
  const { data: currentUser } = trpc.customAuth.me.useQuery();
  const utils = trpc.useUtils();

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate(),
  });

  const toggleUserMutation = trpc.admin.toggleUserStatus.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate(),
  });

  const reset2FAMutation = trpc.admin.resetUser2FA.useMutation({
    onSuccess: () => alert("2FA reset. User will set up 2FA again on next login."),
  });

  const inviteMutation = trpc.admin.inviteUser.useMutation({
    onSuccess: (data) => {
      setInviteResult({ resetUrl: data.resetUrl, email: data.email });
      utils.admin.listUsers.invalidate();
      setInviteEmail("");
      setInviteName("");
      setInviteRole("member");
    },
    onError: (err) => alert(`Failed to invite user: ${err.message}`),
  });

  const deleteMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate(),
    onError: (err) => alert(`Failed to remove user: ${err.message}`),
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate({ email: inviteEmail, name: inviteName || undefined, role: inviteRole });
  };

  const copyLink = () => {
    if (inviteResult?.resetUrl) {
      navigator.clipboard.writeText(inviteResult.resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeInviteDialog = () => {
    setInviteOpen(false);
    setInviteResult(null);
    setCopied(false);
  };

  const filteredUsers = users.filter((user: any) =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isOwnerOrAdmin = currentUser?.role === "owner" || currentUser?.role === "admin" || currentUser?.role === "engineering";

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-muted-foreground">Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 px-4 sm:px-6 sm:py-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header — stacks on mobile, row on desktop */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Team Management</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Invite team members and manage their access levels
            </p>
          </div>
          {isOwnerOrAdmin && (
            <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) closeInviteDialog(); else setInviteOpen(true); }}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md mx-4 sm:mx-auto">
                <DialogHeader>
                  <DialogTitle>Invite a Team Member</DialogTitle>
                  <DialogDescription>
                    Create an account for a new team member. They'll receive a link to set their password.
                  </DialogDescription>
                </DialogHeader>

                {inviteResult ? (
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{inviteResult.email}</strong> has been added to your team.
                        Share the link below so they can set their password.
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label>Password Setup Link (valid for 7 days)</Label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={inviteResult.resetUrl}
                          className="text-xs font-mono"
                        />
                        <Button variant="outline" size="icon" onClick={copyLink}>
                          {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Copy this link and send it to the new team member. It expires in 7 days.
                      </p>
                    </div>
                    <DialogFooter className="flex-col gap-2 sm:flex-row">
                      <Button onClick={closeInviteDialog} className="w-full sm:w-auto">Done</Button>
                      <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setInviteResult(null); setCopied(false); }}>
                        Invite Another
                      </Button>
                    </DialogFooter>
                  </div>
                ) : (
                  <form onSubmit={handleInvite} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email address *</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="colleague@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-name">Full name (optional)</Label>
                      <Input
                        id="invite-name"
                        type="text"
                        placeholder="Jane Smith"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Access level *</Label>
                      <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                        <SelectTrigger id="invite-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currentUser?.role === "owner" && (
                            <SelectItem value="owner">
                              <div>
                                <div className="font-medium">Owner</div>
                                <div className="text-xs text-muted-foreground">Full access, can manage billing and owners</div>
                              </div>
                            </SelectItem>
                          )}
                          <SelectItem value="admin">
                            <div>
                              <div className="font-medium">Admin</div>
                              <div className="text-xs text-muted-foreground">Can manage users, settings, and all data</div>
                            </div>
                          </SelectItem>
                          <SelectItem value="member">
                            <div>
                              <div className="font-medium">Member</div>
                              <div className="text-xs text-muted-foreground">Can view and edit contacts, accounts, and deals</div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter className="flex-col gap-2 sm:flex-row">
                      <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={closeInviteDialog}>
                        Cancel
                      </Button>
                      <Button type="submit" className="w-full sm:w-auto" disabled={inviteMutation.isPending}>
                        {inviteMutation.isPending ? "Creating..." : "Create & Get Link"}
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats — 3 col on all sizes but compact on mobile */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-1 pt-3 px-3 sm:px-6 sm:pb-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">Total Members</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-3 sm:px-6 sm:pb-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">Active</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {users.filter((u: any) => !u.disabled).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-3 sm:px-6 sm:pb-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">Admins &amp; Owners</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold">
                {users.filter((u: any) => u.role === "admin" || u.role === "owner").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users list */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>{users.length} total</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredUsers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 px-4">No team members found</div>
            ) : (
              <div className="divide-y">
                {filteredUsers.map((user: any) => {
                  const isExpanded = expandedUser === user.id;
                  return (
                    <div key={user.id} className="px-4 sm:px-6 py-3">
                      {/* Mobile card layout */}
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                          {(user.name || user.email)[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{user.name || "—"}</span>
                            {user.id === currentUser?.id && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                            <Badge variant={ROLE_COLORS[user.role] || "secondary"} className="text-xs">
                              {ROLE_LABELS[user.role] || user.role}
                            </Badge>
                            {user.disabled && (
                              <Badge variant="destructive" className="text-xs">Suspended</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                        </div>
                        {/* Expand/collapse on mobile for actions */}
                        {isOwnerOrAdmin && user.id !== currentUser?.id && (
                          <button
                            onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                            className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        )}
                      </div>

                      {/* Expanded actions panel */}
                      {isExpanded && isOwnerOrAdmin && user.id !== currentUser?.id && (
                        <div className="mt-3 pt-3 border-t space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Change Role</Label>
                            <Select
                              value={user.role}
                              onValueChange={(role) =>
                                updateRoleMutation.mutate({ userId: user.id, role })
                              }
                            >
                              <SelectTrigger className="w-full h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {currentUser?.role === "owner" && (
                                  <SelectItem value="owner">Owner</SelectItem>
                                )}
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span>2FA:</span>
                              {user.twoFactorEnabled ? (
                                <Badge variant="default" className="bg-green-600 text-xs">Enabled</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Not set up</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-none"
                              onClick={() => toggleUserMutation.mutate({ userId: user.id })}
                            >
                              {user.disabled ? (
                                <><Shield className="h-4 w-4 mr-1 text-green-600" />Activate</>
                              ) : (
                                <><ShieldOff className="h-4 w-4 mr-1 text-amber-500" />Suspend</>
                              )}
                            </Button>
                            {user.twoFactorEnabled && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 sm:flex-none"
                                onClick={() => {
                                  if (confirm(`Reset 2FA for ${user.email}?`)) {
                                    reset2FAMutation.mutate({ userId: user.id });
                                  }
                                }}
                              >
                                <RotateCcw className="h-4 w-4 mr-1 text-blue-500" />
                                Reset 2FA
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-none text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                if (confirm(`Remove ${user.email} from the team? This cannot be undone.`)) {
                                  deleteMutation.mutate({ userId: user.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role descriptions — stacks on mobile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Access Level Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1.5 p-3 rounded-lg bg-muted/30">
                <Badge variant="default">Owner</Badge>
                <p className="text-muted-foreground text-xs leading-relaxed">Full access to everything, including billing, team management, and all data. Can promote other owners.</p>
              </div>
              <div className="space-y-1.5 p-3 rounded-lg bg-muted/30">
                <Badge variant="default">Admin</Badge>
                <p className="text-muted-foreground text-xs leading-relaxed">Can manage users, configure settings, and access all CRM data. Cannot manage billing or owners.</p>
              </div>
              <div className="space-y-1.5 p-3 rounded-lg bg-muted/30">
                <Badge variant="secondary">Member</Badge>
                <p className="text-muted-foreground text-xs leading-relaxed">Standard access to contacts, accounts, deals, and their own activities. Cannot manage users or settings.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
