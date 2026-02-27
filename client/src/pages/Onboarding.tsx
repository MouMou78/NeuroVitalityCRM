import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [, setLocation] = useLocation();

  const handleComplete = () => {
    // Mark onboarding as complete in localStorage
    localStorage.setItem("onboarding_completed", "true");
    setLocation("/");
  };

  const steps = [
    {
      title: "Welcome to NeuroVitality CRM",
      content: "Your relationships are the foundation of your business. Let's help you nurture them.",
    },
    {
      title: "Everything in one place",
      content: "Track conversations, manage deals, and stay on top of every relationship that matters.",
    },
    {
      title: "Ready to begin?",
      content: "We've set up your workspace. Start by adding your first contact or exploring the dashboard.",
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="max-w-2xl w-full p-8 md:p-12">
        <div className="space-y-8">
          {/* Progress indicator */}
          <div className="flex gap-2 justify-center">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === step
                    ? "w-8 bg-primary"
                    : index < step
                    ? "w-2 bg-primary/50"
                    : "w-2 bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {currentStep.title}
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              {currentStep.content}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            {step > 0 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="min-w-[120px]"
              >
                Back
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button
                onClick={() => setStep(step + 1)}
                className="min-w-[120px]"
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                className="min-w-[120px]"
              >
                Get Started
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
