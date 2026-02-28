import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link as LinkIcon, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Integrations() {
  // Live integrations list from the database
  const { data: integrations, isLoading, refetch } = trpc.integrations.list.useQuery();

  // Disconnect mutation — calls POST /api/oauth/google/disconnect
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Handle OAuth callback query params on return from Google
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("google_connected") === "true") {
      toast.success("Google Calendar connected successfully!");
      window.history.replaceState({}, "", "/integrations");
      refetch();
    } else if (params.get("google_error")) {
      const error = params.get("google_error");
      const messages: Record<string, string> = {
        access_denied: "Google Calendar connection was cancelled.",
        no_refresh_token:
          "Could not obtain a refresh token. Please revoke access in your Google Account settings (myaccount.google.com → Security → Third-party apps) and try again.",
        not_configured:
          "Google OAuth credentials are not configured on this server. Please contact your administrator.",
        invalid_state:
          "The OAuth state was invalid or expired. Please try connecting again.",
        server_error: "A server error occurred. Please try again.",
        callback_failed: "Failed to complete Google Calendar connection. Please try again.",
        missing_params: "Invalid callback from Google. Please try connecting again.",
      };
      toast.error(messages[error!] ?? "Failed to connect Google Calendar.");
      window.history.replaceState({}, "", "/integrations");
    }
  }, [refetch]);

  const [apolloKey, setApolloKey] = useState("");

  const connectApollo = {
    mutateAsync: async () => {
      toast.info("Apollo integration is not available yet.");
    },
    isPending: false,
  };

  const handleConnectApollo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apolloKey.trim()) return;
    await connectApollo.mutateAsync();
  };

  const syncApolloContacts = {
    mutate: () => toast.info("Apollo sync is not available yet."),
    isPending: false,
  };

  const syncApolloEngagements = {
    mutate: () => toast.info("Apollo sync is not available yet."),
    isPending: false,
  };

  const googleIntegration = integrations?.find((i: any) => i.provider === "google");
  const whatsappIntegration = integrations?.find((i: any) => i.provider === "whatsapp");
  const apolloIntegration = integrations?.find((i: any) => i.provider === "apollo");

  const handleDisconnectGoogle = async () => {
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/oauth/google/disconnect", { method: "POST" });
      if (res.ok) {
        toast.success("Google Calendar disconnected.");
        refetch();
      } else {
        toast.error("Failed to disconnect Google Calendar.");
      }
    } catch {
      toast.error("Failed to disconnect Google Calendar.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Connect external services to sync data automatically
          </p>
        </div>
        <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
          <a href="/sync-history">View Sync History</a>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* ── Google Workspace ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Google Workspace</CardTitle>
                  <CardDescription>Gmail and Calendar sync</CardDescription>
                </div>
                {googleIntegration?.status === "connected" ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    Disconnected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Automatically sync calendar events from your Google Workspace account into the CRM.
                </p>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Features:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Calendar meeting sync</li>
                    <li>Automatic moment creation from meetings</li>
                    <li>Attendee-to-contact linking</li>
                    <li>Follow-up task generation</li>
                  </ul>
                </div>

                {googleIntegration?.status === "connected" ? (
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => refetch()}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Status
                    </Button>
                    <Button
                      className="w-full"
                      variant="destructive"
                      onClick={handleDisconnectGoogle}
                      disabled={isDisconnecting}
                    >
                      {isDisconnecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Disconnect Google Calendar
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      // Navigates to the server-side OAuth initiation route
                      window.location.href = "/api/oauth/google";
                    }}
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Connect Google Workspace
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Apollo.io ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Apollo.io</CardTitle>
                  <CardDescription>Contact enrichment and sync</CardDescription>
                </div>
                {apolloIntegration?.status === "connected" ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    Disconnected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sync contacts and enrich people data from Apollo.io.
                </p>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Features:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Contact sync from Apollo</li>
                    <li>Data enrichment (title, company, phone)</li>
                    <li>LinkedIn profile matching</li>
                    <li>Engagement tracking</li>
                  </ul>
                </div>

                {apolloIntegration?.status === "connected" ? (
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => syncApolloContacts.mutate()}
                      disabled={syncApolloContacts.isPending}
                    >
                      {syncApolloContacts.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Sync Contacts
                    </Button>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => syncApolloEngagements.mutate()}
                      disabled={syncApolloEngagements.isPending}
                    >
                      {syncApolloEngagements.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Sync Engagements (Calls & Emails)
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleConnectApollo} className="space-y-3">
                    <div>
                      <Label htmlFor="apollo-key">API Key</Label>
                      <Input
                        id="apollo-key"
                        type="password"
                        placeholder="Enter your Apollo.io API key"
                        value={apolloKey}
                        onChange={(e) => setApolloKey(e.target.value)}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={connectApollo.isPending}
                    >
                      {connectApollo.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Connect Apollo.io
                    </Button>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── WhatsApp Business ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>WhatsApp Business</CardTitle>
                  <CardDescription>WhatsApp message sync</CardDescription>
                </div>
                {whatsappIntegration?.status === "connected" ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    Disconnected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sync WhatsApp Business conversations directly into your CRM as moments.
                </p>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Features:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Message sync (incoming/outgoing)</li>
                    <li>Automatic moment creation</li>
                    <li>Send messages from CRM</li>
                    <li>Conversation threading</li>
                  </ul>
                </div>

                <Button className="w-full" variant="outline" disabled>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Connect WhatsApp (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
