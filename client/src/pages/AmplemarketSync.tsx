import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, Clock, Database, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";

export function AmplemarketSync() {
  const [showPreview, setShowPreview] = useState(false);
  
  const { data: syncStatus, isLoading: loadingStatus, refetch: refetchStatus } = trpc.integrations.getAmplemarketSyncStatus.useQuery();
  const { data: syncHistory, isLoading: loadingHistory, refetch: refetchHistory } = trpc.integrations.getAmplemarketSyncHistory.useQuery({ limit: 10 });
  const previewMutation = trpc.integrations.previewAmplemarketSync.useMutation();
  
  const fetchListCounts = trpc.integrations.fetchAmplemarketListCounts.useMutation({
    onSuccess: (data) => {
      toast.success(`List counts fetched: ${data.listsProcessed} lists processed`);
      refetchStatus();
      refetchHistory();
    },
    onError: (error) => {
      toast.error(`Failed to fetch list counts: ${error.message}`);
    },
  });

  const previewSync = trpc.integrations.previewAmplemarketSync.useMutation({
    onSuccess: () => {
      setShowPreview(true);
    },
    onError: (error) => {
      toast.error(`Failed to preview sync: ${error.message}`);
    },
  });

  const handleFetchListCounts = () => {
    fetchListCounts.mutate();
  };

  const handlePreviewSync = () => {
    previewSync.mutate({});
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'running':
        return <Badge className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Amplemarket Sync</h1>
        <p className="text-muted-foreground mt-1">
          Monitor sync status and manage data synchronization from Amplemarket
        </p>
      </div>

      {/* Current Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current Sync Status</CardTitle>
          <CardDescription>Latest synchronization information</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingStatus ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : syncStatus ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <div className="mt-1">{getStatusBadge(syncStatus.status)}</div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Last Sync</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {syncStatus.startedAt ? format(new Date(syncStatus.startedAt), 'PPp') : 'Never'}
                  </p>
                </div>
              </div>

              {syncStatus.status === 'completed' && (
                <div className="space-y-6 pt-4 border-t">
                  {/* Correlation ID */}
                  {syncStatus.correlationId && (
                    <div className="text-xs text-muted-foreground font-mono">
                      Correlation ID: {syncStatus.correlationId}
                    </div>
                  )}
                  
                  {/* Diagnostic Reason */}
                  {syncStatus.reason && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Sync Issue:</strong> {syncStatus.reason.replace(/_/g, ' ')}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Stage 1: ID Collection */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Stage 1: ID Collection</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Lists Scanned</p>
                        <p className="text-2xl font-bold">{syncStatus.listIdsScannedCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Lead IDs Fetched</p>
                        <p className="text-2xl font-bold">{syncStatus.leadIdsFetchedTotal || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">IDs After Dedup</p>
                        <p className="text-2xl font-bold">{syncStatus.leadIdsDedupedTotal || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stage 2: Hydration */}
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-3">Stage 2: Contact Hydration</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Contacts Hydrated</p>
                        <p className="text-2xl font-bold">{syncStatus.contactsHydratedTotal || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stage 3: Owner Filtering */}
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-3">Stage 3: Owner Filtering</h4>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">With Owner Field</p>
                        <p className="text-2xl font-bold">{syncStatus.contactsWithOwnerFieldCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Matched Owner</p>
                        <p className="text-2xl font-bold text-green-600">{syncStatus.keptOwnerMatch || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Wrong Owner</p>
                        <p className="text-2xl font-bold text-gray-400">{syncStatus.discardedOwnerMismatch || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Missing Owner</p>
                        <p className="text-2xl font-bold text-red-400">{(syncStatus.contactsHydratedTotal || 0) - (syncStatus.contactsWithOwnerFieldCount || 0)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stage 4: Upsert */}
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-3">Stage 4: Database Upsert</h4>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Created</p>
                        <p className="text-2xl font-bold text-green-600">{syncStatus.created || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Updated</p>
                        <p className="text-2xl font-bold text-blue-600">{syncStatus.updated || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Skipped</p>
                        <p className="text-2xl font-bold text-orange-400">{syncStatus.skipped || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Synced</p>
                        <p className="text-2xl font-bold text-purple-600">{(syncStatus.created || 0) + (syncStatus.updated || 0)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {syncStatus.errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{syncStatus.errorMessage}</AlertDescription>
                </Alert>
              )}
              
              {syncStatus.diagnosticMessage && (
                <Alert variant="default" className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">{syncStatus.diagnosticMessage}</AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No sync history found. Start your first sync to see status here.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleFetchListCounts}
          disabled={fetchListCounts.isPending}
          size="lg"
        >
          {fetchListCounts.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Fetching Counts...
            </>
          ) : (
            <>
              <Database className="w-4 h-4 mr-2" />
              Fetch List Counts
            </>
          )}
        </Button>

        <Button
          onClick={handlePreviewSync}
          disabled={previewSync.isPending}
          variant="outline"
          size="lg"
        >
          {previewSync.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading Preview...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4 mr-2" />
              Preview Sync
            </>
          )}
        </Button>
      </div>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
          <CardDescription>Recent synchronization activity</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : syncHistory && syncHistory.length > 0 ? (
            <div className="space-y-3">
              {syncHistory.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(log.status)}
                      <span className="text-sm font-medium capitalize">{log.syncType.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(log.startedAt), 'PPp')}
                    </p>
                  </div>
                  {log.status === 'completed' && (
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600">+{log.contactsCreated || 0}</span>
                      <span className="text-blue-600">~{log.contactsUpdated || 0}</span>
                      {log.conflictsDetected > 0 && (
                        <span className="text-orange-600">!{log.conflictsDetected}</span>
                      )}
                    </div>
                  )}
                  {log.errorMessage && (
                    <p className="text-xs text-destructive max-w-xs truncate">{log.errorMessage}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No sync history available</p>
          )}
        </CardContent>
      </Card>

      {/* Sync Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sync Preview</DialogTitle>
            <DialogDescription>
              Review changes before syncing data from Amplemarket
            </DialogDescription>
          </DialogHeader>

          {previewSync.data && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">To Create</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">{previewSync.data.summary.toCreate}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">To Update</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">{previewSync.data.summary.toUpdate}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Conflicts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-orange-600">{previewSync.data.summary.conflicts}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Conflicts */}
              {previewSync.data.conflicts && previewSync.data.conflicts.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Conflicts Detected</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {previewSync.data!.conflicts.map((conflict: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <p className="font-medium text-sm">{conflict.email}</p>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">CRM Data:</p>
                            <p>{conflict.crmData.name}</p>
                            <p className="text-muted-foreground">{conflict.crmData.company}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Amplemarket Data:</p>
                            <p>{conflict.amplemarketData.name}</p>
                            <p className="text-muted-foreground">{conflict.amplemarketData.company}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {previewSync.data!.hasMore.conflicts && (
                    <p className="text-xs text-muted-foreground mt-2">+ more conflicts not shown</p>
                  )}
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This is a preview only. No data will be synced until you confirm.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button disabled>
              Proceed with Sync (Coming Soon)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
