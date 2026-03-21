import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Target, Flame, Plus, X, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// NeuroVitality CRM - scoring configuration for health and wellness professionals
const defaultConfig = {
  fit: {
    creatorTypes: [
      { name: "Life Coach", points: 25 },
      { name: "Business Coach", points: 25 },
      { name: "Fitness Coach", points: 25 },
      { name: "Educational Creator", points: 25 },
      { name: "Course Creator", points: 25 },
    ],
    audienceSizes: [
      { range: "1000-5000", points: 15, label: "Growing (1K-5K)" },
      { range: "5000-25000", points: 20, label: "Established (5K-25K)" },
      { range: "25000-100000", points: 25, label: "Influential (25K-100K)" },
      { range: "100000+", points: 25, label: "Major Creator (100K+)" },
    ],
    businessStages: [
      { stage: "Starting Out", points: 10 },
      { stage: "Growing", points: 20 },
      { stage: "Scaling", points: 25 },
      { stage: "Established", points: 20 },
    ],
    platformCommitment: [
      { level: "Single Feature User", points: 5 },
      { level: "Multiple Features", points: 15 },
      { level: "Full Platform User", points: 25 },
      { level: "Custom App Owner", points: 30 },
    ],
    tiers: {
      A: { min: 70, label: "Tier A (70+) - High Value" },
      B: { min: 40, max: 69, label: "Tier B (40-69) - Good Fit" },
      C: { max: 39, label: "Tier C (0-39) - Low Priority" },
    },
  },
  intent: {
    events: [
      { type: "coaching.session_booked", points: 25, label: "1:1 Session Booked" },
      { type: "course.purchased", points: 20, label: "Course Purchased" },
      { type: "subscription.upgraded", points: 20, label: "Plan Upgraded" },
      { type: "livestream.attended", points: 15, label: "Live Stream Attended" },
      { type: "community.post_created", points: 10, label: "Community Post" },
      { type: "app.downloaded", points: 25, label: "Mobile App Downloaded" },
      { type: "digital_product.purchased", points: 15, label: "Digital Product Bought" },
      { type: "ama.attended", points: 12, label: "AMA Session Attended" },
      { type: "content.viewed", points: 5, label: "Content Viewed" },
      { type: "email.clicked", points: 3, label: "Email Link Clicked" },
    ],
    decayHalfLife: 14, // 2 weeks for coaching/creator engagement
    tiers: {
      Hot: { min: 60, label: "Hot (60+) - Highly Engaged" },
      Warm: { min: 25, max: 59, label: "Warm (25-59) - Active" },
      Cold: { max: 24, label: "Cold (0-24) - Inactive" },
    },
  },
  combined: {
    fitWeight: 50,
    intentWeight: 50, // Equal weight for coaching/creator business
  },
};

export default function ScoringSettings() {
  const [config, setConfig] = useState(defaultConfig);
  const [newCreatorType, setNewCreatorType] = useState({ name: "", points: 25 });
  const [newEvent, setNewEvent] = useState({ type: "", label: "", points: 10 });

  const handleSave = () => {
    // In a real implementation, this would save to the backend
    toast.success("Scoring configuration saved successfully");
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    toast.info("Scoring configuration reset to defaults");
  };

  const addCreatorType = () => {
    if (!newCreatorType.name.trim()) {
      toast.error("Creator type cannot be empty");
      return;
    }
    setConfig({
      ...config,
      fit: {
        ...config.fit,
        creatorTypes: [...config.fit.creatorTypes, newCreatorType],
      },
    });
    setNewCreatorType({ name: "", points: 25 });
    toast.success(`Added ${newCreatorType.name} to target creator types`);
  };

  const removeCreatorType = (index: number) => {
    setConfig({
      ...config,
      fit: {
        ...config.fit,
        creatorTypes: config.fit.creatorTypes.filter((_, i) => i !== index),
      },
    });
    toast.success("Creator type removed");
  };

  const addEvent = () => {
    if (!newEvent.type.trim() || !newEvent.label.trim()) {
      toast.error("Event type and label cannot be empty");
      return;
    }
    setConfig({
      ...config,
      intent: {
        ...config.intent,
        events: [...config.intent.events, newEvent],
      },
    });
    setNewEvent({ type: "", label: "", points: 10 });
    toast.success(`Added ${newEvent.label} to intent signals`);
  };

  const removeEvent = (index: number) => {
    setConfig({
      ...config,
      intent: {
        ...config.intent,
        events: config.intent.events.filter((_, i) => i !== index),
      },
    });
    toast.success("Event removed");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Scoring Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Configure fit and intent scoring for coaches and creators on your platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Fit Scoring Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Fit Scoring Rules
          </CardTitle>
          <CardDescription>
            Configure criteria that determine how well a creator matches your ideal customer profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Target Creator Types */}
          <div>
            <Label className="text-base font-semibold">Target Creator Types</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Types of coaches and creators that match your ideal customer profile
            </p>
            <div className="space-y-2">
              {config.fit.creatorTypes.map((creator, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{creator.name}</span>
                    <Badge variant="secondary">+{creator.points} points</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCreatorType(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 mt-3">
                <Input
                  placeholder="Creator type (e.g., Wellness Coach)"
                  value={newCreatorType.name}
                  onChange={(e) => setNewCreatorType({ ...newCreatorType, name: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Points"
                  className="w-24"
                  value={newCreatorType.points}
                  onChange={(e) => setNewCreatorType({ ...newCreatorType, points: parseInt(e.target.value) || 0 })}
                />
                <Button onClick={addCreatorType}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Audience Sizes */}
          <div>
            <Label className="text-base font-semibold">Audience Size Preferences</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Follower/subscriber counts that indicate growth potential
            </p>
            <div className="space-y-2">
              {config.fit.audienceSizes.map((size, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{size.label}</span>
                  <Badge variant="secondary">+{size.points} points</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Business Stages */}
          <div>
            <Label className="text-base font-semibold">Business Stage</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Where the creator is in their business journey
            </p>
            <div className="space-y-2">
              {config.fit.businessStages.map((stage, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{stage.stage}</span>
                  <Badge variant="secondary">+{stage.points} points</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Commitment */}
          <div>
            <Label className="text-base font-semibold">Platform Commitment Level</Label>
            <p className="text-sm text-muted-foreground mb-3">
              How deeply the contact is using CRM features
            </p>
            <div className="space-y-2">
              {config.fit.platformCommitment.map((level, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{level.level}</span>
                  <Badge variant="secondary">+{level.points} points</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Fit Tier Thresholds */}
          <div>
            <Label className="text-base font-semibold">Fit Tier Thresholds</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Score ranges that determine fit tier classification
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="p-3 border rounded-lg">
                <Badge variant="default" className="mb-2">Tier A</Badge>
                <p className="text-sm text-muted-foreground">{config.fit.tiers.A.label}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge variant="secondary" className="mb-2">Tier B</Badge>
                <p className="text-sm text-muted-foreground">{config.fit.tiers.B.label}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge variant="outline" className="mb-2">Tier C</Badge>
                <p className="text-sm text-muted-foreground">{config.fit.tiers.C.label}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Intent Scoring Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5" />
            Intent Scoring Rules
          </CardTitle>
          <CardDescription>
            Configure engagement signals that indicate purchase intent and platform activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Engagement Events */}
          <div>
            <Label className="text-base font-semibold">Engagement Signals</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Platform activities that indicate interest and engagement
            </p>
            <div className="space-y-2">
              {config.intent.events.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{event.label}</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{event.type}</code>
                    <Badge variant="secondary">+{event.points} points</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEvent(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 mt-3">
                <Input
                  placeholder="Event type (e.g., webinar.attended)"
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder="Label (e.g., Webinar Attended)"
                  value={newEvent.label}
                  onChange={(e) => setNewEvent({ ...newEvent, label: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Points"
                  className="w-24"
                  value={newEvent.points}
                  onChange={(e) => setNewEvent({ ...newEvent, points: parseInt(e.target.value) || 0 })}
                />
                <Button onClick={addEvent}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Score Decay */}
          <div>
            <Label className="text-base font-semibold">Score Decay Settings</Label>
            <p className="text-sm text-muted-foreground mb-3">
              How quickly intent scores decrease over time (half-life in days)
            </p>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={config.intent.decayHalfLife}
                onChange={(e) => setConfig({
                  ...config,
                  intent: { ...config.intent, decayHalfLife: parseInt(e.target.value) || 14 }
                })}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                days (scores halve every {config.intent.decayHalfLife} days)
              </span>
            </div>
          </div>

          {/* Intent Tier Thresholds */}
          <div>
            <Label className="text-base font-semibold">Intent Tier Thresholds</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Score ranges that determine engagement level classification
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="p-3 border rounded-lg">
                <Badge variant="destructive" className="mb-2">Hot</Badge>
                <p className="text-sm text-muted-foreground">{config.intent.tiers.Hot.label}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge className="mb-2 bg-orange-500">Warm</Badge>
                <p className="text-sm text-muted-foreground">{config.intent.tiers.Warm.label}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge variant="outline" className="mb-2">Cold</Badge>
                <p className="text-sm text-muted-foreground">{config.intent.tiers.Cold.label}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Combined Scoring Weights */}
      <Card>
        <CardHeader>
          <CardTitle>Combined Score Weighting</CardTitle>
          <CardDescription>
            Balance between fit (who they are) and intent (what they do)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Fit Weight</Label>
                <span className="text-sm font-medium">{config.combined.fitWeight}%</span>
              </div>
              <Input
                type="range"
                min="0"
                max="100"
                value={config.combined.fitWeight}
                onChange={(e) => setConfig({
                  ...config,
                  combined: {
                    fitWeight: parseInt(e.target.value),
                    intentWeight: 100 - parseInt(e.target.value),
                  }
                })}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Intent Weight</Label>
                <span className="text-sm font-medium">{config.combined.intentWeight}%</span>
              </div>
              <Input
                type="range"
                min="0"
                max="100"
                value={config.combined.intentWeight}
                onChange={(e) => setConfig({
                  ...config,
                  combined: {
                    intentWeight: parseInt(e.target.value),
                    fitWeight: 100 - parseInt(e.target.value),
                  }
                })}
              />
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Current balance:</strong> {config.combined.fitWeight}% based on creator profile match, 
                {config.combined.intentWeight}% based on platform engagement
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
