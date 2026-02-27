import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Search, Shield, ShieldOff, RotateCcw, UserPlus, Trash2, Copy, CheckCircle2 } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  user: "Member",
};

const ROLE_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  owner: "default",
  admin: "default",
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

  const isOwnerOrAdmin = currentUser?.role === "owner" || currentUser?.role === "admin";

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
    <div className="container py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Team Management</h1>
            <p className="text-muted-foreground mt-1">
              Invite team members and manage their access levels
            </p>
          </div>
          {isOwnerOrAdmin && (
            <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) closeInviteDialog(); else setInviteOpen(true); }}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
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
                    <DialogFooter>
                      <Button onClick={closeInviteDialog}>Done</Button>
                      <Button variant="outline" onClick={() => { setInviteResult(null); setCopied(false); }}>
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
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={closeInviteDialog}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={inviteMutation.isPending}>
                        {inviteMutation.isPending ? "Creating..." : "Create & Get Link"}
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {users.filter((u: any) => !u.disabled).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Admins & Owners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u: any) => u.role === "admin" || u.role === "owner").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>{users.length} total</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>2FA</TableHead>
                  <TableHead>Status</TableHead>
                  {isOwnerOrAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isOwnerOrAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">
                      No team members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                            {(user.name || user.email)[0].toUpperCase()}
                          </div>
                          {user.name || "—"}
                          {user.id === currentUser?.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        {isOwnerOrAdmin && user.id !== currentUser?.id ? (
                          <Select
                            value={user.role}
                            onValueChange={(role) =>
                              updateRoleMutation.mutate({ userId: user.id, role })
                            }
                          >
                            <SelectTrigger className="w-28">
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
                        ) : (
                          <Badge variant={ROLE_COLORS[user.role] || "secondary"}>
                            {ROLE_LABELS[user.role] || user.role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.twoFactorEnabled ? (
                          <Badge variant="default" className="bg-green-600">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Not set up</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.disabled ? (
                          <Badge variant="destructive">Suspended</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600">Active</Badge>
                        )}
                      </TableCell>
                      {isOwnerOrAdmin && (
                        <TableCell>
                          {user.id !== currentUser?.id && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleUserMutation.mutate({ userId: user.id })}
                                title={user.disabled ? "Activate user" : "Suspend user"}
                              >
                                {user.disabled ? (
                                  <Shield className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ShieldOff className="h-4 w-4 text-amber-500" />
                                )}
                              </Button>
                              {user.twoFactorEnabled && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`Reset 2FA for ${user.email}?`)) {
                                      reset2FAMutation.mutate({ userId: user.id });
                                    }
                                  }}
                                  title="Reset 2FA"
                                >
                                  <RotateCcw className="h-4 w-4 text-blue-500" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Remove ${user.email} from the team? This cannot be undone.`)) {
                                    deleteMutation.mutate({ userId: user.id });
                                  }
                                }}
                                title="Remove user"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Role descriptions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Access Level Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <div className="font-semibold flex items-center gap-2">
                  <Badge variant="default">Owner</Badge>
                </div>
                <p className="text-muted-foreground">Full access to everything, including billing, team management, and all data. Can promote other owners.</p>
              </div>
              <div className="space-y-1">
                <div className="font-semibold flex items-center gap-2">
                  <Badge variant="default">Admin</Badge>
                </div>
                <p className="text-muted-foreground">Can manage users, configure settings, and access all CRM data. Cannot manage billing or owners.</p>
              </div>
              <div className="space-y-1">
                <div className="font-semibold flex items-center gap-2">
                  <Badge variant="secondary">Member</Badge>
                </div>
                <p className="text-muted-foreground">Standard access to contacts, accounts, deals, and their own activities. Cannot manage users or settings.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
