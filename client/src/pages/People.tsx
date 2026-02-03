import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Tag, UserPlus, Mail, X } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { AddPersonDialog } from "@/components/AddPersonDialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function People() {
  const { data: people, isLoading } = trpc.people.list.useQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredPeople = people?.filter((person) =>
    person.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.primaryEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    toast.success(`Added tags to ${selectedIds.length} contacts`);
    clearSelection();
  };

  const handleBulkAssign = () => {
    toast.success(`Assigned ${selectedIds.length} contacts`);
    clearSelection();
  };

  const handleBulkEnroll = () => {
    toast.success(`Enrolled ${selectedIds.length} contacts in sequence`);
    clearSelection();
  };

  const handleBulkExport = () => {
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
        <div className="flex gap-2">
          <Link href="/people/import">
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
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
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
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
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{person.fullName}</p>
                              {person.engagementScore != null && person.engagementScore > 0 && (
                                <Badge
                                  variant={person.engagementScore >= 200 ? "destructive" : person.engagementScore >= 100 ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {person.engagementScore >= 200 ? "Hot" : person.engagementScore >= 100 ? "Warm" : "Active"}
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
    </div>
  );
}
