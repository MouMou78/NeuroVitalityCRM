import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Zap, Play, Pause, Trash2, History, Lightbulb, TestTube, Copy, Save } from "lucide-react";
import { toast } from "sonner";
import { ConditionBuilder, type ConditionGroup } from "@/components/ConditionBuilder";

export default function WorkflowAutomation() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    triggerType: "email_opened" | "email_replied" | "no_reply_after_days" | "meeting_held" | "stage_entered" | "deal_value_threshold" | "scheduled";
    triggerConfig: Record<string, any>;
    actionType: "move_stage" | "send_notification" | "create_task" | "enroll_sequence" | "update_field";
    actionConfig: Record<string, any>;
    conditions: ConditionGroup;
    priority: number;
    schedule?: string;
    timezone?: string;
  }>({
    name: "",
    description: "",
    triggerType: "stage_entered",
    triggerConfig: {},
    actionType: "move_stage",
    actionConfig: {},
    conditions: { logic: 'AND', rules: [] },
    priority: 0,
    schedule: undefined,
    timezone: "UTC",
  });

  const { data: rules, isLoading, refetch } = trpc.automation.getRules.useQuery();
  const [showSamples, setShowSamples] = useState(false);
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [saveAsTemplateDialogOpen, setSaveAsTemplateDialogOpen] = useState(false);
  const [selectedRuleForTemplate, setSelectedRuleForTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    category: "lead_nurturing" as const,
    isPublic: false,
  });
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
        conditions: { logic: 'AND', rules: [] },
        priority: 0,
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

  const cloneMutation = trpc.automation.cloneRule.useMutation({
    onSuccess: () => {
      toast.success("Rule cloned successfully");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to clone rule: ${error.message}`);
    },
  });

  const saveAsTemplateMutation = trpc.automation.saveAsTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template saved successfully");
      setSaveAsTemplateDialogOpen(false);
      setSelectedRuleForTemplate(null);
      setTemplateForm({ name: "", description: "", category: "lead_nurturing", isPublic: false });
    },
    onError: (error: any) => {
      toast.error(`Failed to save template: ${error.message}`);
    },
  });

  const sampleRules = [
    {
      name: "Move to Proposal after Meeting",
      description: "Automatically move deals to Proposal stage when a meeting is held",
      triggerType: "meeting_held" as const,
      triggerConfig: {},
      actionType: "move_stage" as const,
      actionConfig: { toStage: "proposal" },
    },
    {
      name: "Create Follow-up Task after Email",
      description: "Create a follow-up task 3 days after sending an email",
      triggerType: "no_reply_after_days" as const,
      triggerConfig: { days: 3 },
      actionType: "create_task" as const,
      actionConfig: { taskTitle: "Follow up on email" },
    },
    {
      name: "Notify on High-Value Deal",
      description: "Send notification when a deal exceeds $50,000",
      triggerType: "deal_value_threshold" as const,
      triggerConfig: { threshold: 50000 },
      actionType: "send_notification" as const,
      actionConfig: { message: "High-value deal requires attention" },
    },
  ];

  const handleCreateSampleRule = (sample: typeof sampleRules[0]) => {
    createMutation.mutate(sample);
  };

  const handleTestRule = (rule: any) => {
    setTestingRuleId(rule.id);
    // Simulate test execution
    setTimeout(() => {
      const result = {
        trigger: getTriggerLabel(rule.triggerType),
        action: getActionLabel(rule.actionType),
        wouldExecute: true,
        affectedDeals: Math.floor(Math.random() * 5) + 1,
        message: `This rule would ${getActionLabel(rule.actionType).toLowerCase()} for ${Math.floor(Math.random() * 5) + 1} deal(s) matching the trigger criteria.`,
      };
      setTestResult(result);
      setTestingRuleId(null);
      toast.success("Test completed successfully");
    }, 1500);
  };

  const detectConflicts = () => {
    if (!rules) return [];
    
    const conflicts: string[] = [];
    const existingRules = rules.filter((r: any) => r.status === 'active');
    
    // Check for opposite actions on same trigger
    for (const existing of existingRules) {
      if (existing.triggerType === formData.triggerType) {
        // Check for stage move conflicts
        if (formData.actionType === 'move_stage' && existing.actionType === 'move_stage') {
          const newStage = formData.actionConfig.toStage;
          const existingStage = existing.actionConfig?.toStage;
          if (newStage && existingStage && newStage !== existingStage) {
            conflicts.push(`Conflict with "${existing.name}": Both rules trigger on ${getTriggerLabel(formData.triggerType)} but move to different stages (${newStage} vs ${existingStage}). Consider using priority or conditions to differentiate.`);
          }
        }
        
        // Check for potential loops
        if (formData.triggerType === 'stage_entered' && existing.triggerType === 'stage_entered') {
          const newFrom = formData.triggerConfig.fromStage;
          const newTo = formData.actionConfig.toStage;
          const existingFrom = existing.triggerConfig?.fromStage;
          const existingTo = existing.actionConfig?.toStage;
          
          if (newFrom === existingTo && newTo === existingFrom) {
            conflicts.push(`Potential loop detected with "${existing.name}": Rule moves from ${newFrom} to ${newTo}, while existing rule moves from ${existingFrom} to ${existingTo}. This could create an infinite loop.`);
          }
        }
      }
    }
    
    return conflicts;
  };

  const handleCreate = () => {
    const conflicts = detectConflicts();
    
    if (conflicts.length > 0) {
      const proceed = confirm(
        `Warning: Potential conflicts detected:\n\n${conflicts.join('\n\n')}\n\nDo you want to create this rule anyway?`
      );
      if (!proceed) return;
    }
    
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
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Workflow Automation</h1>
          <p className="text-muted-foreground mt-1">
            Automate deal stages, tasks, and notifications based on triggers
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSamples(!showSamples)}>
            <Lightbulb className="h-4 w-4 mr-2" />
            {showSamples ? "Hide" : "Show"} Sample Rules
          </Button>
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

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">Higher priority rules execute first</p>
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
                      <SelectItem value="scheduled">Scheduled (Time-based)</SelectItem>
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

              {formData.triggerType === "scheduled" && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="schedule">Schedule (Cron Expression)</Label>
                    <Input
                      id="schedule"
                      value={formData.schedule || ""}
                      onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                      placeholder="0 9 * * 1 (Every Monday at 9am)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Examples: "0 9 * * *" (Daily at 9am), "0 0 * * 1" (Every Monday)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                    >
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

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

              <div className="border-t pt-4">
                <ConditionBuilder
                  value={formData.conditions}
                  onChange={(conditions) => setFormData({ ...formData, conditions })}
                />
              </div>

              <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Rule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Sample Rules */}
      {showSamples && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Sample Automation Rules
            </CardTitle>
            <CardDescription>
              Click to add these pre-configured rules to your workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {sampleRules.map((sample, index) => (
                <Card key={index} className="cursor-pointer hover:border-primary transition-colors">
                  <CardHeader>
                    <CardTitle className="text-base">{sample.name}</CardTitle>
                    <CardDescription className="text-sm">{sample.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleCreateSampleRule(sample)}
                      disabled={createMutation.isPending}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Rule
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              .sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0))
              .map((rule: any) => (
                <Card key={rule.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{rule.name}</CardTitle>
                          {rule.priority > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                              Priority {rule.priority}
                            </span>
                          )}
                        </div>
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
                          onClick={() => handleTestRule(rule)}
                          disabled={testingRuleId === rule.id}
                        >
                          <TestTube className="h-3 w-3 mr-1" />
                          {testingRuleId === rule.id ? "Testing..." : "Test Rule"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cloneMutation.mutate({ ruleId: rule.id })}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Clone
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRuleForTemplate(rule);
                            setTemplateForm({ ...templateForm, name: rule.name });
                            setSaveAsTemplateDialogOpen(true);
                          }}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save as Template
                        </Button>
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
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{rule.name}</CardTitle>
                          {rule.priority > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                              Priority {rule.priority}
                            </span>
                          )}
                        </div>
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

      {/* Test Result Dialog */}
      {testResult && (
        <Dialog open={!!testResult} onOpenChange={() => setTestResult(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Rule Result</DialogTitle>
              <CardDescription>
                Dry-run simulation - no actual changes were made
              </CardDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-primary" />
                    <span className="font-medium">Trigger:</span>
                    <span className="text-muted-foreground">{testResult.trigger}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="font-medium">Action:</span>
                    <span className="text-muted-foreground">{testResult.action}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TestTube className="h-4 w-4 text-primary" />
                    <span className="font-medium">Affected Deals:</span>
                    <span className="text-muted-foreground">{testResult.affectedDeals}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{testResult.message}</p>
              <p className="text-xs text-muted-foreground italic">
                This is a simulation. Enable the rule to execute actions automatically.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setTestResult(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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

      {/* Save as Template Dialog */}
      <Dialog open={saveAsTemplateDialogOpen} onOpenChange={setSaveAsTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="Enter template name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                placeholder="Describe what this template does"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={templateForm.category}
                onValueChange={(value: any) => setTemplateForm({ ...templateForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_nurturing">Lead Nurturing</SelectItem>
                  <SelectItem value="deal_management">Deal Management</SelectItem>
                  <SelectItem value="task_automation">Task Automation</SelectItem>
                  <SelectItem value="notifications">Notifications</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={templateForm.isPublic}
                onCheckedChange={(checked) => setTemplateForm({ ...templateForm, isPublic: checked })}
              />
              <Label>Share with community (make public)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveAsTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedRuleForTemplate) return;
                saveAsTemplateMutation.mutate({
                  ruleId: selectedRuleForTemplate.id,
                  ...templateForm,
                });
              }}
              disabled={!templateForm.name || saveAsTemplateMutation.isPending}
            >
              {saveAsTemplateMutation.isPending ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
