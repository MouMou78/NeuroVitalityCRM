import { useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Login() {
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState("");
  const [token, setToken] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [, setLocation] = useLocation();

  const loginMutation = trpc.customAuth.login.useMutation({
    onSuccess: (data) => {
      if ('requires2FA' in data && data.requires2FA) {
        setUserId(data.userId);
        setStep("2fa");
      } else if ('authenticated' in data && data.authenticated) {
        // Login successful, redirect to dashboard
        window.location.href = "/";
      }
    },
    onError: (error) => {
      alert(`Login failed: ${error.message}`);
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    // Re-submit login with 2FA code
    loginMutation.mutate({
      email,
      password,
      twoFactorCode: token,
    });
  };

  if (step === "2fa") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>
              Enter the code from your authenticator app or use a backup code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={useBackupCode ? "backup" : "app"} onValueChange={(v) => setUseBackupCode(v === "backup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="app">Authenticator App</TabsTrigger>
                <TabsTrigger value="backup">Backup Code</TabsTrigger>
              </TabsList>

              <TabsContent value="app" className="space-y-4">
                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="token">6-digit code</Label>
                    <Input
                      id="token"
                      type="text"
                      placeholder="000000"
                      value={token}
                      onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      required
                      autoFocus
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending || token.length !== 6}
                  >
                    {loginMutation.isPending ? "Verifying..." : "Verify"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="backup" className="space-y-4">
                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="backupCode">Backup code</Label>
                    <Input
                      id="backupCode"
                      type="text"
                      placeholder="XXXXXXXX"
                      value={token}
                      onChange={(e) => setToken(e.target.value.toUpperCase())}
                      required
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      Each backup code can only be used once
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending || token.length === 0}
                  >
                    {loginMutation.isPending ? "Verifying..." : "Verify with Backup Code"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setStep("credentials");
                setToken("");
              }}
            >
              Back to login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Log in to your NeuroVitality CRM account</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-primary hover:underline text-sm">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Logging in..." : "Continue"}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
