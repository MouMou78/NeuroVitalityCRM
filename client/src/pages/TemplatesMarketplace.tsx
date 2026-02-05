import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Store, Search, Download, Check, Play, Zap, Filter } from "lucide-react";
import { toast } from "sonner";

export default function TemplatesMarketplace() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [customization, setCustomization] = useState<{
    name: string;
    priority: number;
  }>({ name: "", priority: 5 });

  const { data: templates, isLoading } = trpc.automation.getTemplates.useQuery();
  const { data: installedRules } = trpc.automation.getRules.useQuery();
  const installMutation = trpc.automation.installTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template installed successfully");
      setIsPreviewOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to install template: ${error.message}`);
    },
  });

  const categories = [
    { value: "all", label: "All Templates" },
    { value: "lead_nurturing", label: "Lead Nurturing" },
    { value: "deal_management", label: "Deal Management" },
    { value: "task_automation", label: "Task Automation" },
    { value: "notifications", label: "Notifications" },
  ];

  const filteredTemplates = templates?.filter((template: any) => {
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const isTemplateInstalled = (templateId: string) => {
    return installedRules?.some((rule: any) => 
      rule.name.includes(templates?.find((t: any) => t.id === templateId)?.name)
    );
  };

  const handlePreview = (template: any) => {
    setSelectedTemplate(template);
    setCustomization({ name: template.name, priority: template.priority });
    setIsPreviewOpen(true);
  };

  const handleInstall = () => {
    if (!selectedTemplate) return;
    installMutation.mutate({
      templateId: selectedTemplate.id,
      name: customization.name,
      priority: customization.priority,
    });
  };

  const getCategoryLabel = (category: string) => {
    return categories.find(c => c.value === category)?.label || category;
  };

  const getTriggerLabel = (triggerType: string) => {
    const labels: Record<string, string> = {
      email_opened: "Email Opened",
      email_replied: "Email Replied",
      no_reply_after_days: "No Reply After Days",
      meeting_held: "Meeting Held",
      stage_entered: "Stage Changed",
      deal_value_threshold: "Deal Value Threshold",
      scheduled: "Scheduled (Time-based)",
    };
    return labels[triggerType] || triggerType;
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      move_stage: "Move to Stage",
      send_notification: "Send Notification",
      create_task: "Create Task",
      enroll_sequence: "Enroll in Sequence",
      update_field: "Update Field",
    };
    return labels[actionType] || actionType;
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Store className="h-8 w-8" />
            Automation Templates
          </h1>
          <p className="text-muted-foreground mt-2">
            Browse and install pre-configured automation workflows for common CRM scenarios
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates?.map((template: any) => {
          const installed = isTemplateInstalled(template.id);
          return (
            <Card key={template.id} className={installed ? "border-primary/50 bg-primary/5" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {installed && (
                        <Badge variant="secondary" className="gap-1">
                          <Check className="h-3 w-3" />
                          Installed
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="mb-2">
                      {getCategoryLabel(template.category)}
                    </Badge>
                    <CardDescription className="mt-2">{template.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Play className="h-4 w-4 text-primary" />
                    <span className="font-medium">When:</span>
                    <span className="text-muted-foreground">{getTriggerLabel(template.triggerType)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="font-medium">Then:</span>
                    <span className="text-muted-foreground">{getActionLabel(template.actionType)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-2">
                    {template.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handlePreview(template)}
                    >
                      Preview
                    </Button>
                    {!installed && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handlePreview(template)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Install
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTemplates?.length === 0 && (
        <Card className="p-12 text-center">
          <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No templates found</p>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-sm text-muted-foreground mb-4">{selectedTemplate.description}</p>
                <div className="flex gap-2 mb-4">
                  <Badge variant="outline">{getCategoryLabel(selectedTemplate.category)}</Badge>
                  {selectedTemplate.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <h3 className="font-medium">Automation Flow</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <Play className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Trigger</p>
                      <p className="text-sm text-muted-foreground">{getTriggerLabel(selectedTemplate.triggerType)}</p>
                      {selectedTemplate.triggerConfig && Object.keys(selectedTemplate.triggerConfig).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Config: {JSON.stringify(selectedTemplate.triggerConfig)}
                        </p>
                      )}
                    </div>
                  </div>
                  {selectedTemplate.conditions && selectedTemplate.conditions.rules.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Filter className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Conditions ({selectedTemplate.conditions.logic})</p>
                        <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                          {selectedTemplate.conditions.rules.map((rule: any, idx: number) => (
                            <li key={idx}>
                              {rule.field} {rule.operator} {rule.value}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Action</p>
                      <p className="text-sm text-muted-foreground">{getActionLabel(selectedTemplate.actionType)}</p>
                      {selectedTemplate.actionConfig && Object.keys(selectedTemplate.actionConfig).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Config: {JSON.stringify(selectedTemplate.actionConfig)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="template-name">Rule Name</Label>
                  <Input
                    id="template-name"
                    value={customization.name}
                    onChange={(e) => setCustomization({ ...customization, name: e.target.value })}
                    placeholder="Customize rule name"
                  />
                </div>
                <div>
                  <Label htmlFor="template-priority">Priority</Label>
                  <Input
                    id="template-priority"
                    type="number"
                    value={customization.priority}
                    onChange={(e) => setCustomization({ ...customization, priority: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Higher priority rules execute first</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInstall} disabled={installMutation.isPending}>
              <Download className="h-4 w-4 mr-2" />
              {installMutation.isPending ? "Installing..." : "Install Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
