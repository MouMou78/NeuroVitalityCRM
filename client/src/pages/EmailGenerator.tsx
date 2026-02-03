import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Sparkles, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function EmailGenerator() {
  const { data: examples, isLoading: loadingExamples } = trpc.emailGenerator.listExamples.useQuery();
  const { data: stylePrefs } = trpc.emailGenerator.getStylePreferences.useQuery();
  const createExampleMutation = trpc.emailGenerator.createExample.useMutation();
  const deleteExampleMutation = trpc.emailGenerator.deleteExample.useMutation();
  const updateStyleMutation = trpc.emailGenerator.updateStylePreferences.useMutation();
  const generateEmailMutation = trpc.emailGenerator.generate.useMutation();

  const [newExampleSubject, setNewExampleSubject] = useState("");
  const [newExampleBody, setNewExampleBody] = useState("");
  const [newExampleContext, setNewExampleContext] = useState("");
  const [showAddExample, setShowAddExample] = useState(false);

  const [generateContext, setGenerateContext] = useState("");
  const [generateContactInfo, setGenerateContactInfo] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);

  const handleAddExample = async () => {
    if (!newExampleSubject || !newExampleBody) {
      toast.error("Subject and body are required");
      return;
    }

    try {
      await createExampleMutation.mutateAsync({
        subject: newExampleSubject,
        body: newExampleBody,
        context: newExampleContext,
      });
      toast.success("Example added successfully");
      setNewExampleSubject("");
      setNewExampleBody("");
      setNewExampleContext("");
      setShowAddExample(false);
    } catch (error) {
      toast.error("Failed to add example");
    }
  };

  const handleDeleteExample = async (id: string) => {
    try {
      await deleteExampleMutation.mutateAsync({ id });
      toast.success("Example deleted");
    } catch (error) {
      toast.error("Failed to delete example");
    }
  };

  const handleGenerateEmail = async () => {
    if (!generateContext) {
      toast.error("Please provide context for the email");
      return;
    }

    try {
      const result = await generateEmailMutation.mutateAsync({
        context: generateContext,
        contactInfo: generateContactInfo,
      });
      setGeneratedEmail(result);
      toast.success("Email generated successfully");
    } catch (error) {
      toast.error("Failed to generate email");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="container py-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Training Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Training Examples</CardTitle>
              <CardDescription>
                Teach the AI your writing style by providing example emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingExamples ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {examples && examples.length > 0 ? (
                    examples.map((example: any) => (
                      <div key={example.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{example.subject}</p>
                            {example.context && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {example.context}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExample(example.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {example.body}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No examples yet. Add your first example to train the AI.
                    </p>
                  )}

                  {showAddExample ? (
                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="space-y-2">
                        <Label>Context (optional)</Label>
                        <Input
                          placeholder="e.g., Cold outreach, Follow-up, Introduction"
                          value={newExampleContext}
                          onChange={(e) => setNewExampleContext(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Input
                          placeholder="Email subject line"
                          value={newExampleSubject}
                          onChange={(e) => setNewExampleSubject(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Body</Label>
                        <Textarea
                          placeholder="Email body content"
                          value={newExampleBody}
                          onChange={(e) => setNewExampleBody(e.target.value)}
                          rows={6}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleAddExample} disabled={createExampleMutation.isPending}>
                          {createExampleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Add Example
                        </Button>
                        <Button variant="outline" onClick={() => setShowAddExample(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button onClick={() => setShowAddExample(true)} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Training Example
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Generation Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Email</CardTitle>
              <CardDescription>
                Create personalized emails based on your training examples
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Context</Label>
                  <Textarea
                    placeholder="Describe the purpose of this email (e.g., 'Follow up after demo meeting', 'Cold outreach to VP of Sales')"
                    value={generateContext}
                    onChange={(e) => setGenerateContext(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Information (optional)</Label>
                  <Textarea
                    placeholder="Name, company, role, or any relevant details about the recipient"
                    value={generateContactInfo}
                    onChange={(e) => setGenerateContactInfo(e.target.value)}
                    rows={2}
                  />
                </div>
                <Button
                  onClick={handleGenerateEmail}
                  disabled={generateEmailMutation.isPending}
                  className="w-full"
                >
                  {generateEmailMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Email
                    </>
                  )}
                </Button>

                {generatedEmail && (
                  <div className="border rounded-lg p-4 space-y-4 mt-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Subject</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generatedEmail.subject)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <Input value={generatedEmail.subject} readOnly />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Body</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generatedEmail.body)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <Textarea value={generatedEmail.body} readOnly rows={12} />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
