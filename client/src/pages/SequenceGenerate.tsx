import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, ArrowLeft, Upload, FileText } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function SequenceGenerate() {
  const [, navigate] = useLocation();
  const [sequenceName, setSequenceName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [numberOfSteps, setNumberOfSteps] = useState("5");
  const [tone, setTone] = useState("professional");
  const [additionalContext, setAdditionalContext] = useState("");
  
  // Sequences feature removed with Amplemarket integration
  // const generateMutation = trpc.sequences.generateWithAI.useMutation({
  //   onSuccess: (data: { success: boolean; sequenceId: string }) => {
  //     toast.success("Sequence generated successfully!");
  //     navigate(`/sequences/${data.sequenceId}`);
  //   },
  //   onError: (error: any) => {
  //     toast.error(error.message || "Failed to generate sequence");
  //   },
  // });
  const generateMutation = {
    mutateAsync: async () => {
      toast.info("Sequences feature is not available");
    },
    isPending: false,
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sequenceName.trim() || !productDescription.trim() || !targetAudience.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    await generateMutation.mutateAsync({
      sequenceName,
      productDescription,
      targetAudience,
      valueProposition,
      numberOfSteps: parseInt(numberOfSteps),
      tone,
      additionalContext,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-0">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/sequences")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sequences
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Generate Sequence with AI</h1>
            <p className="text-muted-foreground mt-1">
              Create a personalized email sequence using AI based on your product and audience
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sequence Details</CardTitle>
            <CardDescription>
              Provide information about your sequence and target audience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sequenceName">
                Sequence Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sequenceName"
                placeholder="e.g., SaaS Product Launch Outreach"
                value={sequenceName}
                onChange={(e) => setSequenceName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productDescription">
                Product/Service Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="productDescription"
                placeholder="Describe your product or service in detail. What problem does it solve? What are its key features?"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                Be specific about what you're selling and how it helps customers
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience">
                Target Audience <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="targetAudience"
                placeholder="Who are you targeting? (e.g., B2B SaaS founders, marketing directors at mid-size companies, etc.)"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valueProposition">
                Unique Value Proposition
              </Label>
              <Textarea
                id="valueProposition"
                placeholder="What makes your offering unique? Why should they choose you over competitors?"
                value={valueProposition}
                onChange={(e) => setValueProposition(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sequence Configuration</CardTitle>
            <CardDescription>
              Customize how the AI generates your sequence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numberOfSteps">Number of Emails</Label>
                <Input
                  id="numberOfSteps"
                  type="number"
                  min="3"
                  max="10"
                  value={numberOfSteps}
                  onChange={(e) => setNumberOfSteps(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: 5-7 emails
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <select
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual & Friendly</option>
                  <option value="formal">Formal</option>
                  <option value="enthusiastic">Enthusiastic</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalContext">
                Additional Context (Optional)
              </Label>
              <Textarea
                id="additionalContext"
                placeholder="Any additional information that should be included? (e.g., case studies, specific pain points, industry insights, call-to-action preferences)"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/sequences")}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={generateMutation.isPending}
            className="flex-1"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Sequence
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
