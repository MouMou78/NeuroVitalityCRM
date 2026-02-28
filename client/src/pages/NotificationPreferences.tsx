import { useState, useEffect } from "react";
import { Bell, Mail, Zap, Clock, Save, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Prefs {
  dealAlertEmailEnabled: boolean;
  dealAlertEmailSeverity: string;
  dealAlertInAppEnabled: boolean;
  dealAlertFrequency: string;
}

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Prefs>({
    dealAlertEmailEnabled: false,
    dealAlertEmailSeverity: "high",
    dealAlertInAppEnabled: true,
    dealAlertFrequency: "immediate",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/notifications/preferences", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        setPrefs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function savePrefs() {
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        toast({ title: "Preferences saved", description: "Your notification settings have been updated." });
      } else {
        throw new Error("Failed to save");
      }
    } catch {
      toast({ title: "Save failed", description: "Could not save preferences. Please try again.", variant: "destructive" });
    }
    setSaving(false);
  }

  async function triggerAnalysis() {
    setTriggering(true);
    try {
      const res = await fetch("/api/notifications/trigger-analysis", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Analysis complete",
          description: `${data.alertsCreated} new alert(s) generated, ${data.notificationsCreated} notification(s) created.`,
        });
      } else {
        throw new Error("Failed");
      }
    } catch {
      toast({ title: "Analysis failed", description: "Could not run deal intelligence analysis.", variant: "destructive" });
    }
    setTriggering(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notification Preferences</h1>
        <p className="text-gray-500 mt-1">Control how and when the AI alerts you about deal activity.</p>
      </div>

      {/* In-app notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-base">In-App Notifications</CardTitle>
          </div>
          <CardDescription>
            Alerts appear in the notification bell in the header. No configuration required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="inapp-enabled" className="font-medium">Enable in-app alerts</Label>
              <p className="text-sm text-gray-500 mt-0.5">Show deal intelligence alerts in the notification bell</p>
            </div>
            <Switch
              id="inapp-enabled"
              checked={prefs.dealAlertInAppEnabled}
              onCheckedChange={val => setPrefs(p => ({ ...p, dealAlertInAppEnabled: val }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-base">Email Alerts</CardTitle>
            <Badge variant="outline" className="text-xs">Requires SMTP setup</Badge>
          </div>
          <CardDescription>
            Receive deal intelligence alerts by email. Requires SMTP credentials to be configured in Railway environment variables (<code className="text-xs bg-gray-100 px-1 rounded">SMTP_USER</code>, <code className="text-xs bg-gray-100 px-1 rounded">SMTP_PASS</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-enabled" className="font-medium">Enable email alerts</Label>
              <p className="text-sm text-gray-500 mt-0.5">Send deal alerts to your account email address</p>
            </div>
            <Switch
              id="email-enabled"
              checked={prefs.dealAlertEmailEnabled}
              onCheckedChange={val => setPrefs(p => ({ ...p, dealAlertEmailEnabled: val }))}
            />
          </div>

          {prefs.dealAlertEmailEnabled && (
            <div className="space-y-3 pt-2 border-t">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Minimum severity for email</Label>
                <p className="text-xs text-gray-500">Only send emails for alerts at or above this severity level</p>
                <Select
                  value={prefs.dealAlertEmailSeverity}
                  onValueChange={val => setPrefs(p => ({ ...p, dealAlertEmailSeverity: val }))}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low and above</SelectItem>
                    <SelectItem value="medium">Medium and above</SelectItem>
                    <SelectItem value="high">High and above</SelectItem>
                    <SelectItem value="critical">Critical only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis frequency */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-base">Analysis Schedule</CardTitle>
          </div>
          <CardDescription>
            Deal intelligence runs automatically every 6 hours. You can also trigger it manually at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">Automatic analysis active</p>
              <p className="text-xs text-green-700 mt-0.5">Runs every 6 hours — next run within the next 6 hours from server startup</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="gap-2 w-full sm:w-auto"
              onClick={triggerAnalysis}
              disabled={triggering}
            >
              <Zap className={`h-4 w-4 ${triggering ? "animate-pulse" : ""}`} />
              {triggering ? "Analysing..." : "Run analysis now"}
            </Button>
            <p className="text-xs text-gray-500 self-center">
              Scans all open deals and generates alerts for drift, momentum, and at-risk patterns
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alert types reference */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-base">Alert Types</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { type: "Drift", severity: "medium", desc: "Deal going cold — no activity for 7+ days" },
              { type: "At Risk", severity: "high", desc: "Patterns matching previously lost deals" },
              { type: "Likely Won", severity: "low", desc: "Strong positive signals detected" },
              { type: "Likely Lost", severity: "high", desc: "Strong negative signals detected" },
              { type: "Stale", severity: "medium", desc: "No stage movement in 14+ days" },
              { type: "Follow-up Overdue", severity: "high", desc: "Expected close date passed" },
              { type: "Momentum", severity: "low", desc: "Deal accelerating — rapid stage progression" },
              { type: "Pattern Match", severity: "medium", desc: "Matches a known won/lost pattern" },
            ].map(item => (
              <div key={item.type} className="flex items-start gap-2 p-2.5 rounded-lg border bg-gray-50">
                <span className={`mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0 ${
                  item.severity === "high" ? "bg-orange-100 border-orange-300 text-orange-800" :
                  item.severity === "medium" ? "bg-yellow-100 border-yellow-300 text-yellow-800" :
                  "bg-blue-100 border-blue-300 text-blue-800"
                }`}>
                  {item.severity}
                </span>
                <div>
                  <p className="text-xs font-semibold text-gray-800">{item.type}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={savePrefs} disabled={saving} className="gap-2 w-full sm:w-auto">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}
