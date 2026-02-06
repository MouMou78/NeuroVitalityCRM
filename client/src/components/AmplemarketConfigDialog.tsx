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
  const [syncScope, setSyncScope] = useState(currentConfig?.syncScope || "all_user_contacts");
  const [selectedUserId, setSelectedUserId] = useState(currentConfig?.userId || "");
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | undefined>(undefined);
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

  // Fetch user-scoped lists and sequences
  const { data: userScope, isLoading: loadingScope, error: scopeError } = trpc.integrations.getAmplemarketUserScope.useQuery(
    { userEmail: selectedUserEmail! },
    {
      enabled: open && !!selectedUserEmail,
      retry: false,
    }
  );

  const amplemarketLists = userScope?.lists || [];
  const amplemarketSequences = userScope?.sequences || [];
  const loadingLists = loadingScope;
  const loadingSequences = loadingScope;
  const listsError = scopeError;
  const sequencesError = scopeError;

  // Fetch cached list counts
  const { data: cachedCounts } = trpc.integrations.getAmplemarketListCounts.useQuery(
    selectedUserEmail ? { userEmail: selectedUserEmail } : undefined,
    {
      enabled: open,
      retry: false,
    }
  );

  // Create a map of list IDs to cached counts
  const countMap = new Map();
  if (cachedCounts) {
    for (const cache of cachedCounts) {
      countMap.set(cache.listId, cache.contactCount);
    }
  }

  const handleSave = () => {
    // Find selected user email from amplemarketUsers list
    const selectedUser = amplemarketUsers?.find((u: any) => u.id === selectedUserId);
    
    updateConfig.mutate({
      syncSchedule,
      conflictStrategy,
      syncScope,
      amplemarketUserId: selectedUserId,
      amplemarketUserEmail: selectedUser?.email || '',
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
                    : 'If the error persists, check the browser console for details.'}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Mailbox / Sender Identity Selection */}
          <div className="space-y-2">
            <Label>Amplemarket Mailbox / Sender Identity</Label>
            <Select value={selectedUserId} onValueChange={(value) => {
              setSelectedUserId(value);
              // Clear lists and sequences when user changes
              setSelectedLists([]);
              setSelectedSequences([]);
              // Set user email for filtering
              if (value === "all") {
                setSelectedUserEmail(undefined);
              } else {
                const user = amplemarketUsers?.find((u: any) => u.id === value);
                setSelectedUserEmail(user?.email);
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder={loadingUsers ? "Loading mailboxes..." : "Select mailbox"} />
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
              Choose which mailbox/sender email to filter leads by. Leads are owned by connected mailboxes (e.g., ian@joinkliq.io), not Amplemarket login accounts.
            </p>
          </div>

          {/* Sync Scope */}
          <div className="space-y-2">
            <Label>Sync Scope</Label>
            <Select value={syncScope} onValueChange={setSyncScope}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_user_contacts">All leads for selected user (recommended)</SelectItem>
                <SelectItem value="lists">Specific lists</SelectItem>
                <SelectItem value="sequences">Specific sequences</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Amplemarket does not expose a contact API for all leads. Contacts are synced from lead data in lists.
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
              How to handle leads that exist in both systems with different data
            </p>
          </div>

          {/* List Selection */}
          {syncScope === 'lists' && (
          <div className="space-y-2">
            <Label>Select Lists</Label>
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
                          {list.name}
                          {list.shared && <span className="text-xs text-muted-foreground ml-1">(Shared)</span>}
                          <span className="text-xs text-muted-foreground ml-1">
                            {countMap.has(list.id) ? `(${countMap.get(list.id)} leads)` : '(count unavailable)'}
                          </span>
                        </label>
                      </div>
                    ))}
                  </>
                ) : !selectedUserEmail ? (
                  <Alert>
                    <AlertDescription>
                      Please select an Amplemarket user above to view their lists.
                    </AlertDescription>
                  </Alert>
                ) : amplemarketLists.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      Lists and sequences are workspace-level. Contact sync is scoped by the selected Amplemarket owner.
                    </AlertDescription>
                  </Alert>
                ) : listsError ? (
                  <p className="text-sm text-destructive">Failed to load lists</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No lists found in your Amplemarket account</p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Select at least one list to sync leads from
            </p>
          </div>
          )}

          {/* Sequence Selection */}
          {syncScope === 'sequences' && (
          <div className="space-y-2">
            <Label>Select Sequences</Label>
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
              Select at least one sequence to sync leads from
            </p>
          </div>
          )}
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
