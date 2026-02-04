import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AddPersonDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    primaryEmail: "",
    companyName: "",
    title: "",
    linkedinUrl: "",
    notes: "",
    accountId: "",
  });
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  const { data: accounts, error: accountsError } = trpc.accounts.list.useQuery(undefined, {
    retry: false,
  });

  // Auto-link account when company name matches
  useEffect(() => {
    if (formData.companyName && accounts) {
      const matchingAccount = accounts.find(
        (acc: any) => acc.name.toLowerCase() === formData.companyName.toLowerCase()
      );
      if (matchingAccount) {
        setSelectedAccount(matchingAccount);
        setFormData(prev => ({ ...prev, accountId: matchingAccount.id }));
        toast.info(`Auto-linked to account: ${matchingAccount.name}`);
      }
    }
  }, [formData.companyName, accounts]);

  const utils = trpc.useUtils();
  const createPerson = trpc.people.create.useMutation({
    onSuccess: () => {
      toast.success("Contact added successfully");
      utils.people.list.invalidate();
      setOpen(false);
      setFormData({
        fullName: "",
        primaryEmail: "",
        companyName: "",
        title: "",
        linkedinUrl: "",
        notes: "",
        accountId: "",
      });
      setSelectedAccount(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add contact");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.primaryEmail) {
      toast.error("Name and email are required");
      return;
    }
    createPerson.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Person
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Add a new person to your CRM. Fill in their details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                placeholder="John Doe"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="primaryEmail">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="primaryEmail"
                type="email"
                value={formData.primaryEmail}
                onChange={(e) =>
                  setFormData({ ...formData, primaryEmail: e.target.value })
                }
                placeholder="john@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="companyName">Company</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                placeholder="Acme Corp"
              />
              {selectedAccount && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Linked to account: {selectedAccount.name}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accountId">Link to Account (Optional)</Label>
              <Select
                value={formData.accountId}
                onValueChange={(value) => {
                  setFormData({ ...formData, accountId: value });
                  const account = accounts?.find((a: any) => a.id === value);
                  setSelectedAccount(account || null);
                  if (account && !formData.companyName) {
                    setFormData(prev => ({ ...prev, companyName: account.name }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No account</SelectItem>
                  {accounts?.map((account: any) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="CEO"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input
                id="linkedinUrl"
                type="url"
                value={formData.linkedinUrl}
                onChange={(e) =>
                  setFormData({ ...formData, linkedinUrl: e.target.value })
                }
                placeholder="https://linkedin.com/in/johndoe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional notes about this contact..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createPerson.isPending}>
              {createPerson.isPending ? "Adding..." : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
