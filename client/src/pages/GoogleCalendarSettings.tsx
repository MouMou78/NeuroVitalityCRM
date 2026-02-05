import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ExternalLink, Calendar } from "lucide-react";

export default function GoogleCalendarSettings() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const { data: config, refetch } = trpc.calendar.getConfig.useQuery();
  const saveConfigMutation = trpc.calendar.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Google Calendar configuration saved");
      refetch();
      setClientId("");
      setClientSecret("");
    },
    onError: (error: any) => {
      toast.error(`Failed to save configuration: ${error.message}`);
    },
  });

  const connectMutation = trpc.calendar.connect.useMutation({
    onSuccess: (data: { authUrl?: string }) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to connect: ${error.message}`);
    },
  });

  const disconnectMutation = trpc.calendar.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Google Calendar disconnected");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to disconnect: ${error.message}`);
    },
  });

  const handleSaveConfig = () => {
    if (!clientId || !clientSecret) {
      toast.error("Please provide both Client ID and Client Secret");
      return;
    }
    saveConfigMutation.mutate({ clientId, clientSecret });
  };

  const handleConnect = () => {
    connectMutation.mutate();
  };

  const handleDisconnect = () => {
    if (confirm("Are you sure you want to disconnect Google Calendar?")) {
      disconnectMutation.mutate();
    }
  };

  const isConfigured = config?.clientId && config?.clientSecret;
  const isConnected = config?.connected;

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Google Calendar Integration</h1>
        <p className="text-muted-foreground">
          Sync your Google Calendar events to automatically track meetings and generate follow-up tasks
        </p>
      </div>

      {/* Connection Status */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Connection Status</h2>
              <p className="text-sm text-muted-foreground">
                {isConnected ? `Connected as ${config.email}` : "Not connected"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-green-600 font-medium">Connected</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-gray-400" />
                <span className="text-gray-400 font-medium">Disconnected</span>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* OAuth Configuration */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">OAuth Configuration</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="clientId">Google Client ID</Label>
            <Input
              id="clientId"
              type="text"
              placeholder="Enter your Google OAuth Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={!!isConfigured}
            />
            {isConfigured && (
              <p className="text-xs text-muted-foreground mt-1">
                Client ID is configured (ends with: ...{config.clientId?.slice(-12)})
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="clientSecret">Google Client Secret</Label>
            <Input
              id="clientSecret"
              type={showSecret ? "text" : "password"}
              placeholder="Enter your Google OAuth Client Secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              disabled={!!isConfigured}
            />
            {isConfigured && (
              <p className="text-xs text-muted-foreground mt-1">
                Client Secret is configured (hidden for security)
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {!isConfigured ? (
              <Button
                onClick={handleSaveConfig}
                disabled={saveConfigMutation.isPending}
              >
                {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setClientId("");
                  setClientSecret("");
                  saveConfigMutation.mutate({ clientId: "", clientSecret: "" });
                }}
              >
                Reset Configuration
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => setShowSecret(!showSecret)}
            >
              {showSecret ? "Hide" : "Show"} Secret
            </Button>
          </div>
        </div>
      </Card>

      {/* Connection Actions */}
      {isConfigured && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Calendar Connection</h2>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isConnected
                ? "Your Google Calendar is connected and syncing events automatically."
                : "Connect your Google Calendar to start syncing events and tracking meetings."}
            </p>
            <div className="flex gap-2">
              {!isConnected ? (
                <Button
                  onClick={handleConnect}
                  disabled={connectMutation.isPending}
                >
                  {connectMutation.isPending ? "Connecting..." : "Connect Google Calendar"}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Setup Guide */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Setup Guide</h2>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            To enable Google Calendar integration, you need to create OAuth credentials in Google Cloud Console:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Create a project in Google Cloud Console</li>
            <li>Enable the Google Calendar API</li>
            <li>Configure the OAuth consent screen</li>
            <li>Create OAuth 2.0 credentials (Web application)</li>
            <li>Add your redirect URI: <code className="bg-muted px-1 py-0.5 rounded text-xs">{window.location.origin}/api/calendar/oauth/callback</code></li>
            <li>Copy the Client ID and Client Secret to this page</li>
          </ol>
          <Button variant="link" className="p-0 h-auto" asChild>
            <a
              href="/GOOGLE_OAUTH_SETUP.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              View detailed setup guide
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </Card>
    </div>
  );
}
