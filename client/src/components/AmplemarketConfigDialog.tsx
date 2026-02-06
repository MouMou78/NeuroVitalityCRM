import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AmplemarketConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConfig?: any;
  onSave: () => void;
}

export function AmplemarketConfigDialog({ open, onOpenChange, currentConfig, onSave }: AmplemarketConfigDialogProps) {
  const [syncSchedule, setSyncSchedule] = useState(currentConfig?.syncSchedule || "manual");
  const [conflictStrategy, setConflictStrategy] = useState(currentConfig?.conflictStrategy || "keep_crm");
  const [selectedUserId, setSelectedUserId] = useState(currentConfig?.userId || "");
  const [selectedLists, setSelectedLists] = useState<string[]>(currentConfig?.selectedLists || []);
  const [selectedSequences, setSelectedSequences] = useState<string[]>(currentConfig?.selectedSequences || []);

  const updateConfig = trpc.integrations.updateAmplemarketConfig.useMutation({
    onSuccess: () => {
      toast.success("Amplemarket configuration updated");
      onSave();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to update configuration: ${error.message}`);
    },
  });

  const { data: amplemarketUsers, isLoading: loadingUsers, error: usersError } = trpc.integrations.getAmplemarketUsers.useQuery(undefined, {
    enabled: open,
    retry: false,
  });

  const { data: amplemarketLists, isLoading: loadingLists, error: listsError } = trpc.integrations.getAmplemarketLists.useQuery(undefined, {
    enabled: open,
    retry: false,
  });

  const { data: amplemarketSequences, isLoading: loadingSequences, error: sequencesError } = trpc.integrations.getAmplemarketSequences.useQuery(undefined, {
    enabled: open,
    retry: false,
  });

  const handleSave = () => {
    updateConfig.mutate({
      syncSchedule,
      conflictStrategy,
      userId: selectedUserId,
      selectedLists,
      selectedSequences,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Amplemarket Sync Configuration</DialogTitle>
          <DialogDescription>
            Configure how data syncs from Amplemarket to your CRM
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Error Alert */}
          {(usersError || listsError || sequencesError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {(usersError?.message || listsError?.message || sequencesError?.message)?.includes('401') 
                  ? 'Amplemarket rejected the API key (401). Please regenerate your API key in Amplemarket and reconnect.'
                  : (usersError?.message || listsError?.message || sequencesError?.message)}
                <br />
                <span className="text-xs mt-1 block">
                  {(usersError?.message || listsError?.message || sequencesError?.message)?.includes('401')
                    ? 'Go to Amplemarket Dashboard → Settings → API Keys to generate a new key.'
                    : 'Please check your Amplemarket API key and try reconnecting.'}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* User Account Selection */}
          <div className="space-y-2">
            <Label>Amplemarket User Account</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select user account"} />
              </SelectTrigger>
              <SelectContent>
                {loadingUsers ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : usersError ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    Failed to load users
                  </div>
                ) : amplemarketUsers && amplemarketUsers.length > 0 ? (
                  <>
                    <SelectItem value="all">All Users</SelectItem>
                    {amplemarketUsers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </>
                ) : (
                  <div className="p-4 text-sm text-muted-foreground">
                    No users found in your Amplemarket account
                  </div>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose which Amplemarket user's data to sync
            </p>
          </div>

          {/* Sync Schedule */}
          <div className="space-y-2">
            <Label>Sync Schedule</Label>
            <Select value={syncSchedule} onValueChange={setSyncSchedule}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Only</SelectItem>
                <SelectItem value="hourly">Every Hour</SelectItem>
                <SelectItem value="daily">Once Daily (3 AM)</SelectItem>
                <SelectItem value="weekly">Weekly (Monday 3 AM)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How often to automatically sync data from Amplemarket
            </p>
          </div>

          {/* Conflict Resolution */}
          <div className="space-y-2">
            <Label>Conflict Resolution</Label>
            <Select value={conflictStrategy} onValueChange={setConflictStrategy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keep_crm">Keep CRM Data</SelectItem>
                <SelectItem value="keep_amplemarket">Keep Amplemarket Data</SelectItem>
                <SelectItem value="merge_latest">Merge (Use Latest)</SelectItem>
                <SelectItem value="manual">Manual Review Required</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How to handle contacts that exist in both systems with different data
            </p>
          </div>

          {/* List Selection */}
          <div className="space-y-2">
            <Label>Sync Specific Lists (Optional)</Label>
            {loadingLists ? (
              <div className="flex items-center justify-center p-4 border rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading lists...</span>
              </div>
            ) : (
              <div className="border rounded-lg p-4 space-y-2 max-h-40 overflow-y-auto">
                {amplemarketLists && amplemarketLists.length > 0 ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="all-lists"
                        checked={selectedLists.length === 0}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedLists([]);
                        }}
                      />
                      <label htmlFor="all-lists" className="text-sm font-medium">
                        All Lists
                      </label>
                    </div>
                    {amplemarketLists.map((list: any) => (
                      <div key={list.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`list-${list.id}`}
                          checked={selectedLists.includes(list.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedLists([...selectedLists, list.id]);
                            } else {
                              setSelectedLists(selectedLists.filter(id => id !== list.id));
                            }
                          }}
                        />
                        <label htmlFor={`list-${list.id}`} className="text-sm">
                          {list.name} ({list.contactCount} contacts)
                        </label>
                      </div>
                    ))}
                  </>
                ) : listsError ? (
                  <p className="text-sm text-destructive">Failed to load lists</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No lists found in your Amplemarket account</p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Leave empty to sync all lists, or select specific lists
            </p>
          </div>

          {/* Sequence Selection */}
          <div className="space-y-2">
            <Label>Sync Specific Sequences (Optional)</Label>
            {loadingSequences ? (
              <div className="flex items-center justify-center p-4 border rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading sequences...</span>
              </div>
            ) : (
              <div className="border rounded-lg p-4 space-y-2 max-h-40 overflow-y-auto">
                {amplemarketSequences && amplemarketSequences.length > 0 ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="all-sequences"
                        checked={selectedSequences.length === 0}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedSequences([]);
                        }}
                      />
                      <label htmlFor="all-sequences" className="text-sm font-medium">
                        All Sequences
                      </label>
                    </div>
                    {amplemarketSequences.map((seq: any) => (
                      <div key={seq.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`seq-${seq.id}`}
                          checked={selectedSequences.includes(seq.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSequences([...selectedSequences, seq.id]);
                            } else {
                              setSelectedSequences(selectedSequences.filter(id => id !== seq.id));
                            }
                          }}
                        />
                        <label htmlFor={`seq-${seq.id}`} className="text-sm">
                          {seq.name}
                        </label>
                      </div>
                    ))}
                  </>
                ) : sequencesError ? (
                  <p className="text-sm text-destructive">Failed to load sequences</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No sequences found in your Amplemarket account</p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Leave empty to sync all sequences, or select specific ones
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
