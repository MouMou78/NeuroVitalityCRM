import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Building2, Users, Mail, Phone, X, Tag, UserPlus, Upload, GitMerge } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Accounts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: "",
    domain: "",
    industry: "",
    headquarters: "",
  });

  const { data: accounts, isLoading } = trpc.accounts.list.useQuery();
  const createMutation = trpc.accounts.create.useMutation({
    onSuccess: () => {
      setIsCreateOpen(false);
      setNewAccount({ name: "", domain: "", industry: "", headquarters: "" });
      trpc.useUtils().accounts.list.invalidate();
    },
  });

  const filteredAccounts = accounts?.filter((account: any) =>
    account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (accountId: string) => {
    setSelectedIds((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAccounts?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAccounts?.map((a: any) => a.id) || []);
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleBulkTag = () => {
    toast.success(`Added tags to ${selectedIds.length} accounts`);
    clearSelection();
  };

  const handleBulkAssign = () => {
    toast.success(`Assigned ${selectedIds.length} accounts`);
    clearSelection();
  };

  const handleBulkExport = () => {
    if (!filteredAccounts) return;
    
    const selectedAccounts = filteredAccounts.filter((a: any) => selectedIds.includes(a.id));
    const csvContent = [
      ['Name', 'Domain', 'Industry', 'Headquarters', 'Employees', 'Fit Score', 'Intent Score'].join(','),
      ...selectedAccounts.map((a: any) => [
        a.name,
        a.domain || '',
        a.industry || '',
        a.headquarters || '',
        a.employees || '',
        a.fitScore || 0,
        a.intentScore || 0
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `accounts-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${selectedIds.length} accounts`);
    clearSelection();
  };

  const handleCreate = () => {
    if (!newAccount.name.trim()) return;
    createMutation.mutate(newAccount);
  };

  return (
    <div className="container py-6 px-4 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Accounts</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your company accounts and organizations
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/accounts/merge">
            <Button variant="outline" size="sm">
              <GitMerge className="w-4 h-4 mr-1.5" />
              Merge
            </Button>
          </Link>
          <Link href="/accounts/import">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-1.5" />
              Import
            </Button>
          </Link>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                New Account
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  placeholder="Acme Corporation"
                />
              </div>
              <div>
                <Label htmlFor="domain">Website Domain</Label>
                <Input
                  id="domain"
                  value={newAccount.domain}
                  onChange={(e) => setNewAccount({ ...newAccount, domain: e.target.value })}
                  placeholder="example.com"
                />
              </div>
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={newAccount.industry}
                  onChange={(e) => setNewAccount({ ...newAccount, industry: e.target.value })}
                  placeholder="Technology"
                />
              </div>
              <div>
                <Label htmlFor="headquarters">Headquarters</Label>
                <Input
                  id="headquarters"
                  value={newAccount.headquarters}
                  onChange={(e) => setNewAccount({ ...newAccount, headquarters: e.target.value })}
                  placeholder="San Francisco, CA"
                />
              </div>
              <Button 
                onClick={handleCreate} 
                disabled={!newAccount.name.trim() || createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts by name or industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <Card className="border-primary bg-primary/5 mb-6">
          <div className="p-4">
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
                <Button variant="outline" size="sm" onClick={handleBulkExport} className="flex-1 sm:flex-none">
                  Export
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading accounts...</div>
      ) : filteredAccounts && filteredAccounts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.map((account) => (
            <div key={account.id} className="relative">
              <div 
                className="absolute top-4 left-4 z-10" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleSelection(account.id);
                }}
              >
                <Checkbox 
                  checked={selectedIds.includes(account.id)}
                  onCheckedChange={() => toggleSelection(account.id)}
                />
              </div>
              <Link href={`/accounts/${account.id}`}>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-start gap-4 ml-8">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{account.name}</h3>
                    {account.industry && (
                      <p className="text-sm text-muted-foreground mt-1">{account.industry}</p>
                    )}
                    <div className="flex flex-col gap-2 mt-4">
                      {(account as any).domain && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{(account as any).domain}</span>
                        </div>
                      )}
                      {(account as any).headquarters && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{(account as any).headquarters}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No accounts found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "Try adjusting your search" : "Get started by creating your first account"}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Account
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
