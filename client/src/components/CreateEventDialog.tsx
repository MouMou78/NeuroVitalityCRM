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
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    startsAt: "",
    endsAt: "",
    defaultIntent: "",
  });

  const utils = trpc.useUtils();
  const createEvent = trpc.events.create.useMutation({
    onSuccess: () => {
      toast.success("Event created successfully");
      utils.events.list.invalidate();
      setOpen(false);
      setFormData({
        name: "",
        slug: "",
        startsAt: "",
        endsAt: "",
        defaultIntent: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create event");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.startsAt) {
      toast.error("Event name and start date are required");
      return;
    }
    
    // Generate slug from name
    const slug = formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    
    createEvent.mutate({
      name: formData.name,
      slug,
      startsAt: new Date(formData.startsAt),
      endsAt: formData.endsAt ? new Date(formData.endsAt) : undefined,
      defaultIntent: formData.defaultIntent || undefined,
      defaultTags: ["event-lead"],
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Create a new event with a lead capture form. You'll get a QR code to share.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Event Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Tech Conference 2026"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Event Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                placeholder="tech-conference-2026"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to auto-generate from event name
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="startsAt">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startsAt"
                type="date"
                value={formData.startsAt}
                onChange={(e) =>
                  setFormData({ ...formData, startsAt: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endsAt">End Date</Label>
              <Input
                id="endsAt"
                type="date"
                value={formData.endsAt}
                onChange={(e) =>
                  setFormData({ ...formData, endsAt: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="defaultIntent">Default Intent</Label>
              <Input
                id="defaultIntent"
                value={formData.defaultIntent}
                onChange={(e) =>
                  setFormData({ ...formData, defaultIntent: e.target.value })
                }
                placeholder="Follow up in 3 days"
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
            <Button type="submit" disabled={createEvent.isPending}>
              {createEvent.isPending ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
