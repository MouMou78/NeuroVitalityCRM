import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Plus, Send, Calendar, Users, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AIEmailAssistant } from "@/components/AIEmailAssistant";

export default function Campaigns() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientType, setRecipientType] = useState("all");
  const [scheduledFor, setScheduledFor] = useState("");

  const utils = trpc.useUtils();
  const { data: campaigns = [], isLoading } = trpc.campaigns.list.useQuery();

  const createCampaignMutation = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      utils.campaigns.list.invalidate();
      setOpen(false);
      resetForm();
      alert("Campaign created successfully!");
    },
    onError: (error) => {
      alert(`Failed to create campaign: ${error.message}`);
    },
  });

  const resetForm = () => {
    setSubject("");
    setBody("");
    setRecipientType("all");
    setScheduledFor("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCampaignMutation.mutate({
      name: subject, // Use subject as campaign name
      subject,
      body,
      recipientType,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      draft: "secondary",
      scheduled: "outline",
      sending: "default",
      sent: "default",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="max-w-6xl mx-auto">
          <p>Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 px-4 sm:px-6 sm:py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Marketing Campaigns</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Create and manage email marketing campaigns
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Campaign</DialogTitle>
                <DialogDescription>
                  Design your email campaign and choose recipients
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject Line</Label>
                    <Input
                      id="subject"
                      placeholder="Your compelling subject line"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="body">Email Body</Label>
                      <AIEmailAssistant
                        currentSubject={subject}
                        currentBody={body}
                        onApply={(newSubject: string, newBody: string) => {
                          setSubject(newSubject);
                          setBody(newBody);
                        }}
                      />
                    </div>
                    <Textarea
                      id="body"
                      placeholder="Write your email content here..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={8}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {'{firstName}'} and {'{lastName}'} for personalization
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recipients">Recipients</Label>
                    <Select value={recipientType} onValueChange={setRecipientType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Contacts</SelectItem>
                        <SelectItem value="active">Active Contacts Only</SelectItem>
                        <SelectItem value="high_score">High Score Contacts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduled">Schedule (Optional)</Label>
                    <Input
                      id="scheduled"
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to save as draft
                    </p>
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
                  <Button type="submit" disabled={createCampaignMutation.isPending}>
                    {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first email marketing campaign
              </p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign: any) => (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{campaign.subject}</CardTitle>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <CardDescription>
                        {campaign.recipientType === "all" && "All Contacts"}
                        {campaign.recipientType === "active" && "Active Contacts"}
                        {campaign.recipientType === "high_score" && "High Score Contacts"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {campaign.scheduledFor && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(campaign.scheduledFor).toLocaleDateString()}
                        </div>
                      )}
                      {campaign.status === "sent" && (
                        <>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {campaign.recipientCount || 0} sent
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            {campaign.openRate || 0}% opened
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {campaign.body}
                  </p>
                  {campaign.status === "draft" && (
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                      <Button size="sm">
                        <Send className="h-4 w-4 mr-1" />
                        Send Now
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
