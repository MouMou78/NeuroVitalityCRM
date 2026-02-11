import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SyncHistory() {
  // Integrations feature removed with Amplemarket integration
  // const { data: history, isLoading, refetch } = trpc.integrations.getSyncHistory.useQuery();
  const history: any[] = [];
  const isLoading = false;
  const refetch = () => {};

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "partial":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case "partial":
        return <Badge variant="default" className="bg-yellow-500">Partial</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sync History</h1>
          <p className="text-muted-foreground mt-2">
            View all integration synchronization operations and their results
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/sync-performance">Performance</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/conflict-review">Review Conflicts</a>
          </Button>
          <Button onClick={() => refetch()} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !history || history.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No sync history yet</p>
              <p className="text-sm mt-2">Synchronization operations will appear here</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((sync: any) => (
            <Card key={sync.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(sync.status)}
                    <div>
                      <CardTitle className="text-lg capitalize">{sync.provider} Sync</CardTitle>
                      <CardDescription className="capitalize">{sync.syncType}</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(sync.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Records Synced</p>
                    <p className="text-2xl font-bold">{sync.recordsSynced}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Conflicts Resolved</p>
                    <p className="text-2xl font-bold">{sync.conflictsResolved}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Started</p>
                    <p className="text-sm font-medium">
                      {new Date(sync.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-sm font-medium">
                      {sync.completedAt
                        ? new Date(sync.completedAt).toLocaleString()
                        : "In progress..."}
                    </p>
                  </div>
                </div>

                {sync.errors && sync.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                      Errors ({sync.errors.length})
                    </p>
                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                      {sync.errors.slice(0, 3).map((error: any, idx: number) => (
                        <li key={idx}>• {error.message || JSON.stringify(error)}</li>
                      ))}
                      {sync.errors.length > 3 && (
                        <li className="text-xs">... and {sync.errors.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}

                {sync.config && Object.keys(sync.config).length > 0 && (
                  <details className="mt-4">
                    <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                      View Configuration
                    </summary>
                    <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto">
                      {JSON.stringify(sync.config, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
