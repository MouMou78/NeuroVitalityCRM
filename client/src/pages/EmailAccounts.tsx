import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Plus, Trash2, CheckCircle2 } from "lucide-react";

export default function EmailAccounts() {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState("gmail");
  const [email, setEmail] = useState("");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [imapHost, setImapHost] = useState("imap.gmail.com");
  const [imapPort, setImapPort] = useState("993");

  const utils = trpc.useUtils();
  const { data: accounts = [], isLoading } = trpc.email.listAccounts.useQuery();

  const addAccountMutation = trpc.email.addAccount.useMutation({
    onSuccess: () => {
      utils.email.listAccounts.invalidate();
      setOpen(false);
      resetForm();
      alert("Email account connected successfully!");
    },
    onError: (error) => {
      alert(`Failed to connect: ${error.message}`);
    },
  });

  const removeAccountMutation = trpc.email.removeAccount.useMutation({
    onSuccess: () => {
      utils.email.listAccounts.invalidate();
      alert("Email account removed");
    },
  });

  const setDefaultMutation = trpc.email.setDefaultAccount.useMutation({
    onSuccess: () => {
      utils.email.listAccounts.invalidate();
    },
  });

  const resetForm = () => {
    setEmail("");
    setSmtpUser("");
    setSmtpPass("");
  };

  const handleProviderChange = (value: string) => {
    setProvider(value);
    if (value === "gmail") {
      setSmtpHost("smtp.gmail.com");
      setSmtpPort("587");
      setImapHost("imap.gmail.com");
      setImapPort("993");
    } else if (value === "outlook") {
      setSmtpHost("smtp-mail.outlook.com");
      setSmtpPort("587");
      setImapHost("outlook.office365.com");
      setImapPort("993");
    } else {
      setSmtpHost("");
      setSmtpPort("587");
      setImapHost("");
      setImapPort("993");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAccountMutation.mutate({
      email,
      provider,
      smtpHost,
      smtpPort: parseInt(smtpPort),
      smtpUser,
      smtpPass,
      imapHost,
      imapPort: parseInt(imapPort),
    });
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <p>Loading email accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Email Accounts</h1>
            <p className="text-muted-foreground mt-1">
              Connect your email accounts to send emails from NeuroVitality CRM
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Connect Email Account</DialogTitle>
                <DialogDescription>
                  Add your email account using SMTP/IMAP settings. For Gmail, use an App Password.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Email Provider</Label>
                    <Select value={provider} onValueChange={handleProviderChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gmail">Gmail</SelectItem>
                        <SelectItem value="outlook">Outlook</SelectItem>
                        <SelectItem value="custom">Custom SMTP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtpHost">SMTP Host</Label>
                      <Input
                        id="smtpHost"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">SMTP Port</Label>
                      <Input
                        id="smtpPort"
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input
                      id="smtpUser"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtpPass">SMTP Password / App Password</Label>
                    <Input
                      id="smtpPass"
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      required
                    />
                    {provider === "gmail" && (
                      <p className="text-xs text-muted-foreground">
                        Generate an App Password at: https://myaccount.google.com/apppasswords
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="imapHost">IMAP Host</Label>
                      <Input
                        id="imapHost"
                        value={imapHost}
                        onChange={(e) => setImapHost(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imapPort">IMAP Port</Label>
                      <Input
                        id="imapPort"
                        type="number"
                        value={imapPort}
                        onChange={(e) => setImapPort(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addAccountMutation.isPending}>
                    {addAccountMutation.isPending ? "Connecting..." : "Connect Account"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No email accounts connected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your email account to send emails from NeuroVitality CRM
              </p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {accounts.map((account) => (
              <Card key={account.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5" />
                      <div>
                        <CardTitle className="text-lg">{account.email}</CardTitle>
                        <CardDescription>
                          {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)} •{" "}
                          {account.smtpHost}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {account.isDefault ? (
                        <div className="flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Default
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDefaultMutation.mutate({ accountId: account.id })}
                        >
                          Set as Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Remove this email account?")) {
                            removeAccountMutation.mutate({ accountId: account.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
