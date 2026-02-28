import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Tag, UserPlus, Mail, X } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { AddPersonDialog } from "@/components/AddPersonDialog";
import { TagManagementDialog } from "@/components/TagManagementDialog";
import { AssignmentDialog } from "@/components/AssignmentDialog";
import { SequenceEnrollmentDialog } from "@/components/SequenceEnrollmentDialog";
import { Button } from "@/components/ui/button";
import { Upload, GitMerge } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ListPageSkeleton } from "@/components/SkeletonLoaders";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function People() {
  const { data: people, isLoading } = trpc.people.list.useQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [fitTierFilter, setFitTierFilter] = useState<string>("all");
  const [intentTierFilter, setIntentTierFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isSequenceDialogOpen, setIsSequenceDialogOpen] = useState(false);

  const filteredPeople = people
    ?.filter((person) =>
      person.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.primaryEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((person) => {
      if (fitTierFilter !== "all" && person.fitTier !== fitTierFilter) return false;
      if (intentTierFilter !== "all" && person.intentTier !== intentTierFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "fitScore") return (b.fitScore || 0) - (a.fitScore || 0);
      if (sortBy === "intentScore") return (b.intentScore || 0) - (a.intentScore || 0);
      if (sortBy === "combinedScore") return (b.combinedScore || 0) - (a.combinedScore || 0);
      if (sortBy === "name") return a.fullName.localeCompare(b.fullName);
      // Default: recent (by createdAt)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const toggleSelection = (personId: string) => {
    setSelectedIds((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPeople?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPeople?.map((p) => p.id) || []);
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleBulkTag = () => {
    setIsTagDialogOpen(true);
  };

  const handleBulkAssign = () => {
    setIsAssignDialogOpen(true);
  };

  const handleBulkEnroll = () => {
    setIsSequenceDialogOpen(true);
  };

  const handleBulkExport = () => {
    if (!filteredPeople) return;
    
    const selectedPeople = filteredPeople.filter(p => selectedIds.includes(p.id));
    const csvContent = [
      ['Name', 'Email', 'Company', 'Title', 'Phone', 'Fit Score', 'Intent Score'].join(','),
      ...selectedPeople.map(p => [
        p.fullName,
        p.primaryEmail,
        p.companyName || '',
        p.roleTitle || '',
        p.phone || '',
        p.fitScore || 0,
        p.intentScore || 0
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${selectedIds.length} contacts`);
    clearSelection();
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">People</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            Manage your contacts and relationships
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/people/merge">
            <Button variant="outline" size="sm">
              <GitMerge className="w-4 h-4 mr-1.5" />
              Merge
            </Button>
          </Link>
          <Link href="/people/import">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-1.5" />
              Import
            </Button>
          </Link>
          <AddPersonDialog />
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm">
                  {selectedIds.length} selected
                </Badge>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={handleBulkTag} className="flex-1 sm:flex-none">
                  <Tag className="w-4 h-4 mr-2" />
                  Add Tags
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkAssign} className="flex-1 sm:flex-none">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkEnroll} className="flex-1 sm:flex-none">
                  <Mail className="w-4 h-4 mr-2" />
                  Enroll in Sequence
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkExport} className="flex-1 sm:flex-none">
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle>All Contacts</CardTitle>
              <CardDescription>
                Search and view all people in your CRM
              </CardDescription>
            </div>
            {filteredPeople && filteredPeople.length > 0 && (
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedIds.length === filteredPeople.length ? "Deselect All" : "Select All"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col md:flex-row gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={fitTierFilter} onValueChange={setFitTierFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Fit Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fit Tiers</SelectItem>
                  <SelectItem value="A">Tier A</SelectItem>
                  <SelectItem value="B">Tier B</SelectItem>
                  <SelectItem value="C">Tier C</SelectItem>
                </SelectContent>
              </Select>
              <Select value={intentTierFilter} onValueChange={setIntentTierFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Intent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Intent</SelectItem>
                  <SelectItem value="Hot">Hot</SelectItem>
                  <SelectItem value="Warm">Warm</SelectItem>
                  <SelectItem value="Cold">Cold</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently Added</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="combinedScore">Combined Score</SelectItem>
                  <SelectItem value="fitScore">Fit Score</SelectItem>
                  <SelectItem value="intentScore">Intent Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <ListPageSkeleton />
          ) : filteredPeople && filteredPeople.length > 0 ? (
            <div className="space-y-2">
              {filteredPeople.map((person) => (
                <div
                  key={person.id}
                  className={`flex items-center gap-3 p-3 md:p-4 border rounded-lg transition-colors ${
                    selectedIds.includes(person.id) ? "bg-primary/5 border-primary" : "hover:bg-accent"
                  }`}
                >
                  <Checkbox
                    checked={selectedIds.includes(person.id)}
                    onCheckedChange={() => toggleSelection(person.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Link href={`/people/${person.id}`} className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-0">
                      <div className="flex-1 w-full md:w-auto">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-primary">
                              {person.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">{person.fullName}</p>
                              {person.fitTier && (
                                <Badge
                                  variant={person.fitTier === "A" ? "default" : person.fitTier === "B" ? "secondary" : "outline"}
                                  className="text-xs"
                                >
                                  Fit: {person.fitTier}
                                </Badge>
                              )}
                              {person.intentTier && (
                                <Badge
                                  variant={person.intentTier === "Hot" ? "destructive" : person.intentTier === "Warm" ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {person.intentTier}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs md:text-sm text-muted-foreground truncate">{person.primaryEmail}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-left md:text-right space-y-1 w-full md:w-auto pl-13 md:pl-0">
                        {person.companyName && (
                          <p className="text-sm font-medium truncate">{person.companyName}</p>
                        )}
                        {person.roleTitle && (
                          <p className="text-sm text-muted-foreground truncate">{person.roleTitle}</p>
                        )}
                        {person.location && (
                          <p className="text-xs text-muted-foreground truncate">{person.location}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? "No people found matching your search" : "No people yet. Add your first contact!"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <TagManagementDialog
        open={isTagDialogOpen}
        onOpenChange={setIsTagDialogOpen}
        selectedIds={selectedIds}
        entityType="people"
        onSuccess={clearSelection}
      />

      <AssignmentDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        selectedIds={selectedIds}
        onSuccess={clearSelection}
      />

      <SequenceEnrollmentDialog
        open={isSequenceDialogOpen}
        onOpenChange={setIsSequenceDialogOpen}
        selectedIds={selectedIds}
        onSuccess={clearSelection}
      />
    </div>
  );
}
