import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Zap, Play, Pause, Trash2, History } from "lucide-react";
import { toast } from "sonner";

export default function WorkflowAutomation() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    triggerType: "email_opened" | "email_replied" | "no_reply_after_days" | "meeting_held" | "stage_entered" | "deal_value_threshold";
    triggerConfig: Record<string, any>;
    actionType: "move_stage" | "send_notification" | "create_task" | "enroll_sequence" | "update_field";
    actionConfig: Record<string, any>;
  }>({
    name: "",
    description: "",
    triggerType: "stage_entered",
    triggerConfig: {},
    actionType: "move_stage",
    actionConfig: {},
  });

  const { data: rules, isLoading, refetch } = trpc.automation.getRules.useQuery();
  const { data: executions } = trpc.automation.getExecutions.useQuery({ ruleId: undefined });

  const createMutation = trpc.automation.createRule.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreateOpen(false);
      setFormData({
        name: "",
        description: "",
        triggerType: "stage_entered",
        triggerConfig: {},
        actionType: "move_stage",
        actionConfig: {},
      });
      toast.success("Automation rule created");
    },
    onError: (error) => {
      toast.error(`Failed to create rule: ${error.message}`);
    },
  });

  const toggleMutation = trpc.automation.updateRule.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Rule status updated");
    },
    onError: (error: any) => {
      toast.error(`Failed to update rule: ${error.message}`);
    },
  });

  const deleteMutation = trpc.automation.deleteRule.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Rule deleted");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete rule: ${error.message}`);
    },
  });

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const getTriggerLabel = (type: string) => {
    const labels: Record<string, string> = {
      email_opened: "Email Opened",
      email_replied: "Email Replied",
      no_reply_after_days: "No Reply After Days",
      meeting_held: "Meeting Held",
      stage_entered: "Deal Stage Changed",
      deal_value_threshold: "Deal Value Threshold",
    };
    return labels[type] || type;
  };

  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      move_stage: "Move to Stage",
      send_notification: "Send Notification",
      create_task: "Create Task",
      enroll_sequence: "Enroll in Sequence",
      update_field: "Update Field",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Workflow Automation</h1>
          <p className="text-muted-foreground mt-1">
            Automate deal stages, tasks, and notifications based on triggers
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Automation Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Rule Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Auto-move to Proposal after meeting"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of what this rule does"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trigger">When (Trigger)</Label>
                  <Select
                    value={formData.triggerType}
                    onValueChange={(value: any) => setFormData({ ...formData, triggerType: value })}
                  >
                    <SelectTrigger id="trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stage_entered">Deal Stage Changed</SelectItem>
                      <SelectItem value="email_opened">Email Opened</SelectItem>
                      <SelectItem value="email_replied">Email Replied</SelectItem>
                      <SelectItem value="no_reply_after_days">No Reply After Days</SelectItem>
                      <SelectItem value="meeting_held">Meeting Held</SelectItem>
                      <SelectItem value="deal_value_threshold">Deal Value Threshold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="action">Then (Action)</Label>
                  <Select
                    value={formData.actionType}
                    onValueChange={(value: any) => setFormData({ ...formData, actionType: value })}
                  >
                    <SelectTrigger id="action">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="move_stage">Move to Stage</SelectItem>
                      <SelectItem value="create_task">Create Task</SelectItem>
                      <SelectItem value="send_notification">Send Notification</SelectItem>
                      <SelectItem value="enroll_sequence">Enroll in Sequence</SelectItem>
                      <SelectItem value="update_field">Update Field</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.triggerType === "stage_entered" && (
                <div>
                  <Label htmlFor="fromStage">From Stage</Label>
                  <Input
                    id="fromStage"
                    value={formData.triggerConfig.fromStage || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        triggerConfig: { ...formData.triggerConfig, fromStage: e.target.value },
                      })
                    }
                    placeholder="e.g., meeting"
                  />
                </div>
              )}

              {formData.triggerType === "no_reply_after_days" && (
                <div>
                  <Label htmlFor="days">Days Without Reply</Label>
                  <Input
                    id="days"
                    type="number"
                    value={formData.triggerConfig.days || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        triggerConfig: { ...formData.triggerConfig, days: parseInt(e.target.value) },
                      })
                    }
                    placeholder="7"
                  />
                </div>
              )}

              {formData.triggerType === "deal_value_threshold" && (
                <div>
                  <Label htmlFor="threshold">Minimum Deal Value</Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={formData.actionConfig.threshold || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        triggerConfig: { ...formData.triggerConfig, threshold: parseInt(e.target.value) },
                      })
                    }
                    placeholder="10000"
                  />
                </div>
              )}

              {formData.actionType === "move_stage" && (
                <div>
                  <Label htmlFor="toStage">Move to Stage</Label>
                  <Input
                    id="toStage"
                    value={formData.actionConfig.toStage || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        actionConfig: { ...formData.actionConfig, toStage: e.target.value },
                      })
                    }
                    placeholder="e.g., proposal"
                  />
                </div>
              )}

              {formData.actionType === "create_task" && (
                <div>
                  <Label htmlFor="taskTitle">Task Title</Label>
                  <Input
                    id="taskTitle"
                    value={formData.actionConfig.taskTitle || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        actionConfig: { ...formData.actionConfig, taskTitle: e.target.value },
                      })
                    }
                    placeholder="e.g., Follow up with prospect"
                  />
                </div>
              )}

              {formData.actionType === "send_notification" && (
                <div>
                  <Label htmlFor="message">Notification Message</Label>
                  <Input
                    id="message"
                    value={formData.actionConfig.message || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        actionConfig: { ...formData.actionConfig, message: e.target.value },
                      })
                    }
                    placeholder="e.g., New high-value deal requires attention"
                  />
                </div>
              )}

              <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Rule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Rules */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Rules</h2>
          {rules?.filter((r: any) => r.status === "active").length === 0 ? (
            <Card className="p-8 text-center">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active automation rules</p>
            </Card>
          ) : (
            rules
              ?.filter((r: any) => r.status === "active")
              .map((rule: any) => (
                <Card key={rule.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{rule.name}</CardTitle>
                        {rule.description && (
                          <CardDescription className="mt-1">{rule.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.status === "active"}
                          onCheckedChange={() => toggleMutation.mutate({ ruleId: rule.id, status: rule.status === "active" ? "paused" : "active" })}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Play className="h-4 w-4 text-primary" />
                        <span className="font-medium">When:</span>
                        <span className="text-muted-foreground">{getTriggerLabel(rule.triggerType)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="font-medium">Then:</span>
                        <span className="text-muted-foreground">{getActionLabel(rule.actionType)}</span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this rule?")) {
                              deleteMutation.mutate({ ruleId: rule.id });
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>

        {/* Paused Rules */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Paused Rules</h2>
          {rules?.filter((r: any) => r.status === "paused").length === 0 ? (
            <Card className="p-8 text-center">
              <Pause className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No paused rules</p>
            </Card>
          ) : (
            rules
              ?.filter((r: any) => r.status === "paused")
              .map((rule: any) => (
                <Card key={rule.id} className="opacity-60">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{rule.name}</CardTitle>
                        {rule.description && (
                          <CardDescription className="mt-1">{rule.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.status === "active"}
                          onCheckedChange={() => toggleMutation.mutate({ ruleId: rule.id, status: rule.status === "active" ? "paused" : "active" })}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Play className="h-4 w-4" />
                        <span className="font-medium">When:</span>
                        <span className="text-muted-foreground">{getTriggerLabel(rule.triggerType)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4" />
                        <span className="font-medium">Then:</span>
                        <span className="text-muted-foreground">{getActionLabel(rule.actionType)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      </div>

      {/* Execution History */}
      {executions && executions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Executions
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {executions.slice(0, 10).map((execution: any) => (
                  <div key={execution.id} className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {rules?.find((r: any) => r.id === execution.ruleId)?.name || "Unknown Rule"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(execution.executedAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        execution.status === "success"
                          ? "bg-green-100 text-green-700"
                          : execution.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {execution.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
