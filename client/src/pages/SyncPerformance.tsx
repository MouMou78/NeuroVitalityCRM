import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Activity, Clock, Database, TrendingUp, Zap } from "lucide-react";

export default function SyncPerformance() {
  // Integrations feature removed with Amplemarket integration
  // const { data: metrics, isLoading, refetch } = trpc.integrations.getSyncMetrics.useQuery();
  const metrics: any = null;
  const isLoading = false;
  const refetch = () => {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading performance metrics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sync Performance</h1>
          <p className="text-muted-foreground mt-2">
            Monitor integration sync speed, API usage, and data transfer volumes
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Sync Duration</p>
              <p className="text-2xl font-bold">{metrics?.avgDuration || "0"}s</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Zap className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Records/Second</p>
              <p className="text-2xl font-bold">{metrics?.recordsPerSecond || "0"}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Database className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Records Synced</p>
              <p className="text-2xl font-bold">{metrics?.totalRecords || "0"}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <Activity className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">API Calls/Hour</p>
              <p className="text-2xl font-bold">{metrics?.apiCallsPerHour || "0"}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* API Rate Limits */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          API Rate Limit Usage
        </h2>
        <div className="space-y-4">
          {metrics?.rateLimits?.map((limit: any) => (
            <div key={limit.provider} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize">{limit.provider}</span>
                <span className="text-sm text-muted-foreground">
                  {limit.used} / {limit.limit} calls
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    limit.percentage > 80
                      ? "bg-red-500"
                      : limit.percentage > 60
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${limit.percentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {limit.remaining} calls remaining • Resets in {limit.resetIn}
              </p>
            </div>
          )) || (
            <p className="text-muted-foreground text-center py-4">
              No rate limit data available
            </p>
          )}
        </div>
      </Card>

      {/* Sync Duration Chart */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Sync Duration Over Time</h2>
        <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
          <div className="text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Chart visualization coming soon</p>
            <p className="text-sm mt-1">Will show sync duration trends over the past 30 days</p>
          </div>
        </div>
      </Card>

      {/* Records Per Second Chart */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Sync Throughput</h2>
        <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
          <div className="text-center text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Chart visualization coming soon</p>
            <p className="text-sm mt-1">Will show records processed per second over time</p>
          </div>
        </div>
      </Card>

      {/* Data Transfer Volume */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Data Transfer Volume</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Today</p>
            <p className="text-2xl font-bold">{metrics?.dataTransfer?.today || "0 MB"}</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">This Week</p>
            <p className="text-2xl font-bold">{metrics?.dataTransfer?.week || "0 MB"}</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">This Month</p>
            <p className="text-2xl font-bold">{metrics?.dataTransfer?.month || "0 MB"}</p>
          </div>
        </div>
      </Card>

      {/* Recent Sync Operations */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Sync Operations</h2>
        <div className="space-y-2">
          {metrics?.recentSyncs?.map((sync: any, idx: number) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-secondary rounded-lg"
            >
              <div>
                <p className="font-medium capitalize">{sync.provider}</p>
                <p className="text-sm text-muted-foreground">
                  {sync.recordsProcessed} records in {sync.duration}s
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{sync.timestamp}</p>
                <p className={`text-sm font-medium ${
                  sync.status === "success" ? "text-green-500" : "text-red-500"
                }`}>
                  {sync.status}
                </p>
              </div>
            </div>
          )) || (
            <p className="text-muted-foreground text-center py-8">
              No recent sync operations
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
