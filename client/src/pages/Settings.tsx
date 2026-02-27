import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun, Monitor, Shield, ShieldCheck, ShieldOff, Copy, Download, CheckCircle2, KeyRound, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { data: currentUser } = trpc.auth.me.useQuery();

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your preferences, profile, and security settings
          </p>
        </div>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize how the application looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label>Theme</Label>
              <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-4">
                <div>
                  <RadioGroupItem value="light" id="light" className="peer sr-only" />
                  <Label
                    htmlFor="light"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Sun className="mb-3 h-6 w-6" />
                    Light
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                  <Label
                    htmlFor="dark"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Moon className="mb-3 h-6 w-6" />
                    Dark
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="system" id="system" className="peer sr-only" />
                  <Label
                    htmlFor="system"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Monitor className="mb-3 h-6 w-6" />
                    System
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-muted-foreground">
                System will follow your device's theme preference automatically.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security / 2FA */}
        {currentUser && <TwoFactorSection userId={currentUser.userId} />}
      </div>
    </div>
  );
}

function TwoFactorSection({ userId }: { userId: string }) {
  const [step, setStep] = useState<"idle" | "setup" | "verify" | "done">("idle");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  // Check if 2FA is already enabled by looking at the me endpoint
  const { data: currentUser, refetch } = trpc.auth.me.useQuery();
  const twoFactorEnabled = (currentUser as any)?.twoFactorEnabled;

  const setup2FAMutation = trpc.customAuth.setup2FA.useMutation({
    onSuccess: (data) => {
      setQrCodeUrl(data.qrCodeUrl);
      setBackupCodes(data.backupCodes);
      setStep("verify");
    },
    onError: (err) => alert(`Failed to start 2FA setup: ${err.message}`),
  });

  const verify2FAMutation = trpc.customAuth.verify2FASetup.useMutation({
    onSuccess: () => {
      setStep("done");
      refetch();
    },
    onError: (err) => alert(`Invalid code: ${err.message}`),
  });

  const handleStartSetup = () => {
    setStep("setup");
    setup2FAMutation.mutate({ userId });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    verify2FAMutation.mutate({ userId, code });
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBackupCodes = () => {
    const blob = new Blob(
      [`NeuroVitality CRM - 2FA Backup Codes\n\nGenerated: ${new Date().toLocaleDateString()}\n\n${backupCodes.join("\n")}\n\nKeep these codes in a safe place. Each code can only be used once.`],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "neurovitality-crm-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Two-Factor Authentication (2FA)
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account using an authenticator app
            </CardDescription>
          </div>
          {twoFactorEnabled ? (
            <Badge className="bg-green-600 gap-1">
              <ShieldCheck className="h-3 w-3" />
              Enabled
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <ShieldOff className="h-3 w-3" />
              Not enabled
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Already enabled */}
        {twoFactorEnabled && step !== "done" && (
          <div className="space-y-3">
            <Alert>
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Two-factor authentication is active on your account. You'll be asked for a code from your authenticator app when logging in.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              To disable or reset 2FA, contact another admin or owner on your team.
            </p>
          </div>
        )}

        {/* Not enabled — idle state */}
        {!twoFactorEnabled && step === "idle" && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription>
                Your account does not have 2FA enabled. We recommend enabling it to protect your account.
              </AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>You'll need an authenticator app such as:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Google Authenticator</strong> (iOS / Android)</li>
                <li><strong>Microsoft Authenticator</strong> (iOS / Android)</li>
                <li><strong>Authy</strong> (iOS / Android / Desktop)</li>
                <li><strong>1Password</strong> (if you use a password manager)</li>
              </ul>
            </div>
            <Button onClick={handleStartSetup} disabled={setup2FAMutation.isPending}>
              <Shield className="h-4 w-4 mr-2" />
              {setup2FAMutation.isPending ? "Setting up..." : "Enable Two-Factor Authentication"}
            </Button>
          </div>
        )}

        {/* Loading QR code */}
        {step === "setup" && setup2FAMutation.isPending && (
          <p className="text-muted-foreground">Generating your QR code...</p>
        )}

        {/* Verify step — show QR code */}
        {step === "verify" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold">Step 1 — Scan this QR code</h3>
              <p className="text-sm text-muted-foreground">
                Open your authenticator app and scan the QR code below. If you can't scan it, you can enter the setup key manually.
              </p>
              {qrCodeUrl && (
                <div className="flex justify-center py-4">
                  <img
                    src={qrCodeUrl}
                    alt="2FA QR Code"
                    className="border rounded-lg p-2 bg-white"
                    width={200}
                    height={200}
                  />
                </div>
              )}
            </div>

            {backupCodes.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Step 2 — Save your backup codes</h3>
                <p className="text-sm text-muted-foreground">
                  Store these codes somewhere safe. If you lose your phone, you can use one of these to access your account. Each code can only be used once.
                </p>
                <Alert>
                  <AlertDescription>
                    <div className="bg-muted rounded-md p-3 font-mono text-sm grid grid-cols-2 gap-1 mb-3">
                      {backupCodes.map((c, i) => (
                        <div key={i} className="text-center">{c}</div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={copyBackupCodes} className="flex-1">
                        {copied ? <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                        {copied ? "Copied!" : "Copy codes"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={downloadBackupCodes} className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-3">
              <h3 className="font-semibold">Step 3 — Enter the 6-digit code</h3>
              <p className="text-sm text-muted-foreground">
                Enter the code shown in your authenticator app to confirm setup.
              </p>
              <div className="flex gap-3 items-end">
                <div className="space-y-1 flex-1 max-w-xs">
                  <Label htmlFor="2fa-code">Verification code</Label>
                  <Input
                    id="2fa-code"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    autoFocus
                    className="font-mono text-lg tracking-widest text-center"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={verify2FAMutation.isPending || code.length !== 6}
                >
                  {verify2FAMutation.isPending ? "Verifying..." : "Verify & Enable"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Success */}
        {step === "done" && (
          <Alert>
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <strong>Two-factor authentication is now enabled!</strong> From your next login, you'll be asked for a code from your authenticator app.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
