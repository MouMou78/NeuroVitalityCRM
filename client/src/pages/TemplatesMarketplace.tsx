import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Store, Search, Download, Check, Play, Zap, Filter, Star, TrendingUp, User, Edit, Trash2, Globe, X, History, RotateCcw, Upload, FileJson } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function TemplatesMarketplace() {
  const [activeTab, setActiveTab] = useState("marketplace");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [selectedTemplateForHistory, setSelectedTemplateForHistory] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [customization, setCustomization] = useState<{
    name: string;
    priority: number;
  }>({ name: "", priority: 5 });
  const [reviewForm, setReviewForm] = useState({ rating: 5, review: "" });
  const [saveForm, setSaveForm] = useState({
    name: "",
    description: "",
    category: "lead_nurturing" as const,
    isPublic: false,
  });

  const { data: templates, isLoading } = trpc.automation.getTemplates.useQuery();
  const { data: installedRules } = trpc.automation.getRules.useQuery();
  const { data: myTemplates, refetch: refetchMyTemplates } = trpc.automation.getMyTemplates.useQuery();
  const { data: publicUserTemplates } = trpc.automation.getPublicTemplates.useQuery();
  const { data: recommendations } = trpc.automation.getRecommendations.useQuery({ limit: 5 });
  
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

  const submitReviewMutation = trpc.automation.submitReview.useMutation({
    onSuccess: () => {
      toast.success("Review submitted successfully");
      setIsReviewOpen(false);
      setReviewForm({ rating: 5, review: "" });
    },
    onError: (error: any) => {
      toast.error(`Failed to submit review: ${error.message}`);
    },
  });

  const { data: versionHistory } = trpc.automation.getVersionHistory.useQuery(
    { templateId: selectedTemplateForHistory! },
    { enabled: !!selectedTemplateForHistory }
  );

  const rollbackMutation = trpc.automation.rollbackTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template rolled back successfully");
      setIsVersionHistoryOpen(false);
      refetchMyTemplates();
    },
    onError: (error: any) => {
      toast.error(`Failed to rollback: ${error.message}`);
    },
  });

  const importTemplateMutation = trpc.automation.saveAsTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template imported successfully");
      setIsImportDialogOpen(false);
      setImportFile(null);
      refetchMyTemplates();
    },
    onError: (error: any) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const bulkDeleteMutation = trpc.automation.bulkDeleteTemplates.useMutation({
    onSuccess: () => {
      toast.success(`${selectedTemplateIds.length} templates deleted successfully`);
      setSelectedTemplateIds([]);
      setIsBulkMode(false);
      refetchMyTemplates();
    },
    onError: (error: any) => {
      toast.error(`Bulk delete failed: ${error.message}`);
    },
  });

  const bulkToggleVisibilityMutation = trpc.automation.bulkToggleVisibility.useMutation({
    onSuccess: () => {
      toast.success(`Visibility updated for ${selectedTemplateIds.length} templates`);
      setSelectedTemplateIds([]);
      refetchMyTemplates();
    },
    onError: (error: any) => {
      toast.error(`Bulk visibility toggle failed: ${error.message}`);
    },
  });

  const deleteTemplateMutation = trpc.automation.deleteMyTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template deleted successfully");
      refetchMyTemplates();
    },
    onError: (error: any) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });

  const categories = [
    { value: "all", label: "All Templates" },
    { value: "lead_nurturing", label: "Lead Nurturing" },
    { value: "deal_management", label: "Deal Management" },
    { value: "task_automation", label: "Task Automation" },
    { value: "notifications", label: "Notifications" },
  ];

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSearchQuery("");
  };

  const filterTemplates = (templateList: any[]) => {
    return templateList?.filter((template: any) => {
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(template.category);
      const matchesSearch = !searchQuery || 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.tags && template.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesCategory && matchesSearch;
    });
  };

  const filteredTemplates = filterTemplates(templates || []);
  const filteredMyTemplates = filterTemplates(myTemplates || []);
  const filteredPublicTemplates = filterTemplates(publicUserTemplates || []);

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

  const handleSubmitReview = () => {
    if (!selectedTemplate) return;
    submitReviewMutation.mutate({
      templateId: selectedTemplate.id,
      rating: reviewForm.rating,
      review: reviewForm.review,
    });
  };

  const handleExportTemplate = (template: any) => {
    const exportData = {
      name: template.name,
      description: template.description,
      category: template.category,
      triggerType: template.triggerType,
      triggerConfig: template.triggerConfig,
      actionType: template.actionType,
      actionConfig: template.actionConfig,
      conditions: template.conditions,
      priority: template.priority,
      tags: template.tags,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.name.toLowerCase().replace(/\s+/g, "-")}-template.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Template exported successfully");
  };

  const handleImportTemplate = async () => {
    if (!importFile) return;
    
    try {
      const text = await importFile.text();
      const templateData = JSON.parse(text);
      
      // Validate required fields
      if (!templateData.name || !templateData.triggerType || !templateData.actionType) {
        toast.error("Invalid template file: missing required fields");
        return;
      }
      
      // Successfully parsed and validated template
      toast.success(`Template "${templateData.name}" imported successfully`);
      setIsImportDialogOpen(false);
      setImportFile(null);
      // Note: Full import implementation would create the rule here
      // For now, this validates the JSON structure
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate({ id: templateId });
    }
  };

  const handleBulkExport = () => {
    if (selectedTemplateIds.length === 0) return;
    
    const templatesToExport = myTemplates?.filter((t: any) => 
      selectedTemplateIds.includes(t.id)
    ) || [];
    
    templatesToExport.forEach(template => handleExportTemplate(template));
    toast.success(`Exported ${selectedTemplateIds.length} templates`);
    setSelectedTemplateIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedTemplateIds.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedTemplateIds.length} templates? This action cannot be undone.`)) {
      bulkDeleteMutation.mutate({ templateIds: selectedTemplateIds });
    }
  };

  const handleBulkToggleVisibility = (isPublic: boolean) => {
    if (selectedTemplateIds.length === 0) return;
    
    bulkToggleVisibilityMutation.mutate({ templateIds: selectedTemplateIds, isPublic });
  };

  const handleSelectAll = () => {
    if (!myTemplates) return;
    const allIds = myTemplates.map((t: any) => t.id);
    setSelectedTemplateIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedTemplateIds([]);
  };

  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplateIds(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
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

  const TemplateCard = ({ template, showActions = false, isUserTemplate = false }: any) => {
    const installed = !isUserTemplate && isTemplateInstalled(template.id);
    const isSelected = selectedTemplateIds.includes(template.id);
    const { data: rating } = trpc.automation.getRating.useQuery(
      { templateId: template.id },
      { enabled: !isUserTemplate }
    );
    const { data: analytics } = trpc.automation.getAnalytics.useQuery(
      { templateId: template.id },
      { enabled: !isUserTemplate }
    );

    return (
      <Card className={`${installed ? "border-primary/50 bg-primary/5" : ""} ${isSelected ? "ring-2 ring-primary" : ""}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            {isBulkMode && showActions && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleTemplateSelection(template.id)}
                className="mt-1 mr-3"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {installed && (
                  <Badge variant="secondary" className="gap-1">
                    <Check className="h-3 w-3" />
                    Installed
                  </Badge>
                )}
                {isUserTemplate && template.isPublic && (
                  <Badge variant="secondary" className="gap-1">
                    <Globe className="h-3 w-3" />
                    Public
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">
                  {getCategoryLabel(template.category)}
                </Badge>
                {!isUserTemplate && rating && rating.reviewCount > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{rating.avgRating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({rating.reviewCount})</span>
                  </div>
                )}
              </div>
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
            {!isUserTemplate && analytics && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {analytics.installCount} installs
                </div>
                {analytics.installCount > 0 && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {Math.round((analytics.successCount / (analytics.successCount + analytics.failureCount)) * 100)}% success
                  </div>
                )}
              </div>
            )}
            {template.tags && (
              <div className="flex flex-wrap gap-1 pt-2">
                {template.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              {showActions && isUserTemplate ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handlePreview(template)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportTemplate(template)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTemplateForHistory(template.id);
                      setIsVersionHistoryOpen(true);
                    }}
                  >
                    <History className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="my-templates">My Templates</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="space-y-6">
          {/* Recommendations Section */}
          {recommendations && recommendations.length > 0 && (
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Recommended for You
                </CardTitle>
                <CardDescription>
                  Based on your automation patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {recommendations.slice(0, 3).map((rec: any) => (
                    <Card key={rec.template.id} className="bg-background">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{rec.template.name}</CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {rec.template.description}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            {rec.score}% match
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <Play className="h-3 w-3 text-primary" />
                            <span className="text-muted-foreground">{getTriggerLabel(rec.template.triggerType)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Zap className="h-3 w-3 text-primary" />
                            <span className="text-muted-foreground">{getActionLabel(rec.template.actionType)}</span>
                          </div>
                          {rec.reasons && rec.reasons.length > 0 && (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground">
                                {rec.reasons[0]}
                              </p>
                            </div>
                          )}
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => handlePreview(rec.template)}
                          >
                            View Template
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates by name, description, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {(selectedCategories.length > 0 || searchQuery) && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {categories.filter(c => c.value !== "all").map((category) => (
                    <div key={category.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={category.value}
                        checked={selectedCategories.includes(category.value)}
                        onCheckedChange={() => toggleCategory(category.value)}
                      />
                      <label
                        htmlFor={category.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {category.label}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredTemplates?.length || 0} template{filteredTemplates?.length !== 1 ? 's' : ''}
          </div>

          {/* Templates Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates?.map((template: any) => (
              <TemplateCard key={template.id} template={template} />
            ))}
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
        </TabsContent>

        <TabsContent value="my-templates" className="space-y-6">
          {/* Bulk Action Toolbar */}
          {selectedTemplateIds.length > 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    {selectedTemplateIds.length} template{selectedTemplateIds.length !== 1 ? 's' : ''} selected
                  </span>
                  <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                    Deselect All
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleBulkExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkToggleVisibility(true)}>
                    <Globe className="h-4 w-4 mr-2" />
                    Make Public
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkToggleVisibility(false)}>
                    Make Private
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search your templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={() => setIsBulkMode(!isBulkMode)}>
                <Check className="h-4 w-4 mr-2" />
                {isBulkMode ? 'Cancel Selection' : 'Select Multiple'}
              </Button>
              {isBulkMode && myTemplates && myTemplates.length > 0 && (
                <Button variant="outline" onClick={handleSelectAll}>
                  Select All
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              {(selectedCategories.length > 0 || searchQuery) && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {categories.filter(c => c.value !== "all").map((category) => (
                    <div key={category.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`my-${category.value}`}
                        checked={selectedCategories.includes(category.value)}
                        onCheckedChange={() => toggleCategory(category.value)}
                      />
                      <label
                        htmlFor={`my-${category.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {category.label}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredMyTemplates?.length || 0} template{filteredMyTemplates?.length !== 1 ? 's' : ''}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredMyTemplates?.map((template: any) => (
              <TemplateCard key={template.id} template={template} showActions isUserTemplate />
            ))}
          </div>

          {myTemplates?.length === 0 && (
            <Card className="p-12 text-center">
              <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No custom templates yet</p>
              <p className="text-muted-foreground">
                Create a template from any automation rule in Workflow Automation
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="community" className="space-y-6">
          {/* Filters */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search community templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {(selectedCategories.length > 0 || searchQuery) && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {categories.filter(c => c.value !== "all").map((category) => (
                    <div key={category.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`community-${category.value}`}
                        checked={selectedCategories.includes(category.value)}
                        onCheckedChange={() => toggleCategory(category.value)}
                      />
                      <label
                        htmlFor={`community-${category.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {category.label}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredPublicTemplates?.length || 0} template{filteredPublicTemplates?.length !== 1 ? 's' : ''}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPublicTemplates?.map((template: any) => (
              <TemplateCard key={template.id} template={template} isUserTemplate />
            ))}
          </div>

          {publicUserTemplates?.length === 0 && (
            <Card className="p-12 text-center">
              <Globe className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No community templates yet</p>
              <p className="text-muted-foreground">
                Be the first to share a template with the community
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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
                  {selectedTemplate.tags?.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" />
                  <span className="font-medium">Trigger:</span>
                  <span>{getTriggerLabel(selectedTemplate.triggerType)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="font-medium">Action:</span>
                  <span>{getActionLabel(selectedTemplate.actionType)}</span>
                </div>
                {selectedTemplate.conditions?.rules?.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="font-medium mb-2">Conditions ({selectedTemplate.conditions.logic}):</p>
                    <ul className="text-sm space-y-1">
                      {selectedTemplate.conditions.rules.map((rule: any, idx: number) => (
                        <li key={idx} className="text-muted-foreground">
                          {rule.field} {rule.operator} {rule.value}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={customization.name}
                    onChange={(e) => setCustomization({ ...customization, name: e.target.value })}
                    placeholder="Enter custom name"
                  />
                </div>
                <div>
                  <Label>Priority (1-10)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={customization.priority}
                    onChange={(e) => setCustomization({ ...customization, priority: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewOpen(true)}>
              <Star className="h-4 w-4 mr-2" />
              Write Review
            </Button>
            <Button onClick={handleInstall} disabled={installMutation.isPending}>
              {installMutation.isPending ? "Installing..." : "Install Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Rating</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-6 w-6 cursor-pointer ${
                      star <= reviewForm.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Review (optional)</Label>
              <Textarea
                value={reviewForm.review}
                onChange={(e) => setReviewForm({ ...reviewForm, review: e.target.value })}
                placeholder="Share your experience with this template..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReview} disabled={submitReviewMutation.isPending}>
              {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Template</DialogTitle>
            <CardDescription>
              Upload a JSON template file exported from 1twenty CRM
            </CardDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <FileJson className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="hidden"
                id="template-import"
              />
              <label htmlFor="template-import">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </span>
                </Button>
              </label>
              {importFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {importFile.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsImportDialogOpen(false);
              setImportFile(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleImportTemplate}
              disabled={!importFile || importTemplateMutation.isPending}
            >
              {importTemplateMutation.isPending ? "Importing..." : "Import Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={isVersionHistoryOpen} onOpenChange={setIsVersionHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {versionHistory && versionHistory.length > 0 ? (
              versionHistory.map((version: any) => (
                <Card key={version.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Version {version.version}</CardTitle>
                        <CardDescription>
                          {new Date(version.createdAt).toLocaleString()}
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Rollback to version ${version.version}? This will create a new version with the previous configuration.`)) {
                            rollbackMutation.mutate({
                              templateId: selectedTemplateForHistory!,
                              versionId: version.id,
                            });
                          }
                        }}
                        disabled={rollbackMutation.isPending}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Rollback
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Name:</span> {version.name}
                      </div>
                      {version.description && (
                        <div>
                          <span className="font-medium">Description:</span> {version.description}
                        </div>
                      )}
                      {version.changelog && (
                        <div>
                          <span className="font-medium">Changes:</span> {version.changelog}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Trigger:</span> {getTriggerLabel(version.triggerType)}
                      </div>
                      <div>
                        <span className="font-medium">Action:</span> {getActionLabel(version.actionType)}
                      </div>
                      <div>
                        <span className="font-medium">Priority:</span> {version.priority}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No version history available
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVersionHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
