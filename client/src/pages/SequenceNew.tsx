import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, ArrowLeft, Check, Mail, Clock } from "lucide-react";
import { toast } from "sonner";

interface SequenceStep {
  stepNumber: number;
  type: "email" | "wait" | "condition";
  subject: string;
  body: string;
  delayDays: number;
}

export default function SequenceNew() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<SequenceStep[]>([
    { stepNumber: 1, type: "email", subject: "", body: "", delayDays: 0 }
  ]);

  const createSequence = trpc.sequences.create.useMutation({
    onSuccess: () => {
      toast.success("Sequence created successfully");
      setLocation("/sequences");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create sequence");
    },
  });

  const addStep = () => {
    const newStepNumber = steps.length + 1;
    setSteps([...steps, { stepNumber: newStepNumber, type: "email", subject: "", body: "", delayDays: 1 }]);
  };

  const removeStep = (stepNumber: number) => {
    if (steps.length === 1) {
      toast.error("Sequence must have at least one step");
      return;
    }
    const newSteps = steps
      .filter(s => s.stepNumber !== stepNumber)
      .map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setSteps(newSteps);
  };

  const updateStep = (stepNumber: number, field: keyof SequenceStep, value: string | number) => {
    setSteps(steps.map(s => 
      s.stepNumber === stepNumber ? { ...s, [field]: value } : s
    ));
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Please enter a sequence name");
      return;
    }
    
    const invalidSteps = steps.filter(s => !s.subject.trim() || !s.body.trim());
    if (invalidSteps.length > 0) {
      toast.error("All steps must have a subject and body");
      return;
    }

    createSequence.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      steps: steps.map(s => ({
        type: "email",
        subject: s.subject.trim(),
        body: s.body.trim(),
        waitDays: s.delayDays,
      })),
    });
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep === step
                ? "bg-primary text-primary-foreground"
                : currentStep > step
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {currentStep > step ? <Check className="w-4 h-4" /> : step}
          </div>
          {step < 3 && (
            <div
              className={`w-12 h-0.5 ${
                currentStep > step ? "bg-primary/20" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Sequence Details</CardTitle>
        <CardDescription>Give your sequence a name and description</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Sequence Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Outbound Sales Sequence"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe the purpose of this sequence..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Email Steps</h3>
          <p className="text-sm text-muted-foreground">Add and configure email steps for your sequence</p>
        </div>
        <Button onClick={addStep} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Step
        </Button>
      </div>

      {steps.map((step, idx) => (
        <Card key={step.stepNumber}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                  {step.stepNumber}
                </div>
                <div>
                  <CardTitle className="text-base">Step {step.stepNumber}</CardTitle>
                  {step.delayDays > 0 && (
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      Wait {step.delayDays} day{step.delayDays !== 1 ? 's' : ''} after previous step
                    </CardDescription>
                  )}
                </div>
              </div>
              {steps.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStep(step.stepNumber)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {idx > 0 && (
              <div className="space-y-2">
                <Label>Delay (days)</Label>
                <Input
                  type="number"
                  min="0"
                  value={step.delayDays}
                  onChange={(e) => updateStep(step.stepNumber, 'delayDays', parseInt(e.target.value) || 0)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Subject Line *</Label>
              <Input
                placeholder="Enter email subject..."
                value={step.subject}
                onChange={(e) => updateStep(step.stepNumber, 'subject', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email Body *</Label>
              <Textarea
                placeholder="Enter email content..."
                value={step.body}
                onChange={(e) => updateStep(step.stepNumber, 'body', e.target.value)}
                rows={6}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Review & Create</CardTitle>
        <CardDescription>Review your sequence before creating it</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-2">Sequence Details</h4>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {name}</p>
            {description && <p><span className="text-muted-foreground">Description:</span> {description}</p>}
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Steps ({steps.length})</h4>
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.stepNumber} className="border rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <Badge variant="outline">{step.stepNumber}</Badge>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium">{step.subject}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{step.body}</p>
                    {step.delayDays > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {step.delayDays} day{step.delayDays !== 1 ? 's' : ''} delay
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-4 md:p-0 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/sequences")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Create Email Sequence</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Build a multi-step email campaign
          </p>
        </div>
      </div>

      {renderStepIndicator()}

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        {currentStep < 3 ? (
          <Button onClick={() => setCurrentStep(currentStep + 1)}>
            Next
          </Button>
        ) : (
          <Button
            onClick={handleCreate}
            disabled={createSequence.isPending}
          >
            {createSequence.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Create Sequence
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
