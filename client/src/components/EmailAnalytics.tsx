import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Eye, MousePointerClick, TrendingUp } from "lucide-react";

interface EmailAnalyticsProps {
  personId: string;
}

export function EmailAnalytics({ personId }: EmailAnalyticsProps) {
  const { data: stats, isLoading } = trpc.emailTracking.getPersonStats.useQuery({ personId });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Engagement</CardTitle>
          <CardDescription>Loading email statistics...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Engagement</CardTitle>
        <CardDescription>Track email opens, clicks, and engagement rates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center p-4 border rounded-lg">
            <Mail className="w-6 h-6 text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{stats.sent}</div>
            <div className="text-sm text-muted-foreground">Sent</div>
          </div>

          <div className="flex flex-col items-center p-4 border rounded-lg">
            <Eye className="w-6 h-6 text-green-500 mb-2" />
            <div className="text-2xl font-bold">{stats.opened}</div>
            <div className="text-sm text-muted-foreground">Opened</div>
          </div>

          <div className="flex flex-col items-center p-4 border rounded-lg">
            <MousePointerClick className="w-6 h-6 text-purple-500 mb-2" />
            <div className="text-2xl font-bold">{stats.clicked}</div>
            <div className="text-sm text-muted-foreground">Clicked</div>
          </div>

          <div className="flex flex-col items-center p-4 border rounded-lg">
            <TrendingUp className="w-6 h-6 text-orange-500 mb-2" />
            <div className="text-2xl font-bold">{stats.openRate}%</div>
            <div className="text-sm text-muted-foreground">Open Rate</div>
          </div>
        </div>

        {stats.sent > 0 && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Click Rate</span>
              <span className="text-sm font-bold">{stats.clickRate}%</span>
            </div>
            <div className="mt-2 h-2 bg-background rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 transition-all"
                style={{ width: `${stats.clickRate}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
