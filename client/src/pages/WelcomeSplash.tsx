import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function WelcomeSplash() {
  const [, setLocation] = useLocation();
  const [currentScreen, setCurrentScreen] = useState(1);

  const screens = [
    {
      title: "Welcome to NeuroVitality CRM",
      description: "Your journey to better customer relationships starts here. Let's take a moment to understand what matters to you.",
      action: "Continue",
    },
    {
      title: "Built for Your Success",
      description: "This CRM adapts to your workflow, not the other way around. Every feature is designed to help you focus on what truly matters—your customers.",
      action: "Next",
    },
    {
      title: "Ready When You Are",
      description: "Take your time exploring. Your data is secure, and we're here to support you every step of the way.",
      action: "Get Started",
    },
  ];

  const handleNext = () => {
    if (currentScreen < screens.length) {
      setCurrentScreen(currentScreen + 1);
    } else {
      // Mark onboarding as complete and redirect to dashboard
      localStorage.setItem("onboarding_complete", "true");
      setLocation("/");
    }
  };

  const handleSkip = () => {
    localStorage.setItem("onboarding_complete", "true");
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="max-w-2xl w-full p-8 md:p-12 shadow-2xl">
        <div className="space-y-8">
          {/* Progress indicator */}
          <div className="flex justify-center gap-2">
            {screens.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index + 1 === currentScreen
                    ? "w-8 bg-primary"
                    : index + 1 < currentScreen
                    ? "w-2 bg-primary/50"
                    : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="text-center space-y-6 min-h-[200px] flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              {screens[currentScreen - 1].title}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto">
              {screens[currentScreen - 1].description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="w-full sm:w-auto"
            >
              Skip for now
            </Button>
            <Button
              onClick={handleNext}
              className="w-full sm:w-auto min-w-[140px]"
            >
              {screens[currentScreen - 1].action}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
