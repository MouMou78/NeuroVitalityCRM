import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Clock, GitBranch, Target, Sparkles } from 'lucide-react';
import { useLocation } from 'wouter';


interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  nodeCount: number;
  branchCount: number;
  estimatedDuration: string;
  useCase: string;
  preview: {
    nodes: Array<{ type: string; label: string }>;
    branches: string[];
  };
}

const templates: Template[] = [
  {
    id: 'cold-outreach-reply',
    name: 'Cold Outreach with Reply Detection',
    description: 'Multi-touch cold outreach sequence that adapts based on prospect replies. Automatically moves engaged prospects to a nurture track.',
    category: 'Cold Outreach',
    nodeCount: 8,
    branchCount: 3,
    estimatedDuration: '14 days',
    useCase: 'Initial prospecting to new leads with intelligent follow-up based on engagement',
    preview: {
      nodes: [
        { type: 'email', label: 'Initial Outreach' },
        { type: 'wait', label: 'Wait 3 days' },
        { type: 'condition', label: 'Check Reply' },
        { type: 'email', label: 'Follow-up (No Reply)' },
        { type: 'email', label: 'Engagement Email (Replied)' },
        { type: 'wait', label: 'Wait 5 days' },
        { type: 'email', label: 'Final Touch' },
        { type: 'exit', label: 'End Sequence' },
      ],
      branches: ['Replied → Engagement Track', 'No Reply → Reminder Track', 'Still No Reply → Exit'],
    },
  },
  {
    id: 'nurture-engagement',
    name: 'Nurture with Engagement Scoring',
    description: 'Long-term nurture sequence that tracks email opens and clicks to identify hot prospects and route them to sales.',
    category: 'Nurture',
    nodeCount: 12,
    branchCount: 4,
    estimatedDuration: '30 days',
    useCase: 'Warming up prospects over time with valuable content and identifying buying signals',
    preview: {
      nodes: [
        { type: 'email', label: 'Welcome Email' },
        { type: 'wait', label: 'Wait 5 days' },
        { type: 'email', label: 'Value Content #1' },
        { type: 'condition', label: 'Check Opens/Clicks' },
        { type: 'email', label: 'High Engagement Path' },
        { type: 'email', label: 'Low Engagement Path' },
        { type: 'goal_check', label: 'Check Meeting Booked' },
        { type: 'exit', label: 'End or Loop' },
      ],
      branches: ['High Engagement → Sales Handoff', 'Medium Engagement → Continue Nurture', 'Low Engagement → Re-engagement', 'Meeting Booked → Exit'],
    },
  },
  {
    id: 'reengagement-negative',
    name: 'Re-engagement with Negative Response Handling',
    description: 'Win back inactive prospects while respecting "not interested" responses and automatically unsubscribing those who opt out.',
    category: 'Re-engagement',
    nodeCount: 7,
    branchCount: 3,
    estimatedDuration: '10 days',
    useCase: 'Reactivating cold leads while maintaining good sender reputation',
    preview: {
      nodes: [
        { type: 'email', label: 'Re-engagement Offer' },
        { type: 'wait', label: 'Wait 4 days' },
        { type: 'condition', label: 'Check Response Type' },
        { type: 'email', label: 'Positive Response Follow-up' },
        { type: 'exit', label: 'Unsubscribe (Negative)' },
        { type: 'email', label: 'Last Chance Offer' },
        { type: 'exit', label: 'End Sequence' },
      ],
      branches: ['Positive Reply → Continue', 'Negative Reply → Auto-unsubscribe', 'No Reply → Final Attempt'],
    },
  },
  {
    id: 'ab-test-optimization',
    name: 'A/B Test with Auto-optimization',
    description: 'Test two different messaging approaches and automatically send more prospects down the winning path.',
    category: 'Optimization',
    nodeCount: 10,
    branchCount: 2,
    estimatedDuration: '21 days',
    useCase: 'Continuously improve messaging by testing variants and learning from results',
    preview: {
      nodes: [
        { type: 'abSplit', label: 'A/B Split 50/50' },
        { type: 'email', label: 'Variant A Email' },
        { type: 'email', label: 'Variant B Email' },
        { type: 'wait', label: 'Wait 3 days' },
        { type: 'condition', label: 'Check Engagement' },
        { type: 'email', label: 'Follow-up A' },
        { type: 'email', label: 'Follow-up B' },
        { type: 'goal_check', label: 'Check Conversion' },
      ],
      branches: ['Variant A Path', 'Variant B Path'],
    },
  },
  {
    id: 'event-followup',
    name: 'Event Follow-up with Segmentation',
    description: 'Follow up with event attendees, segmenting by attendance type (attended, no-show, registered only) for personalized outreach.',
    category: 'Event Marketing',
    nodeCount: 9,
    branchCount: 3,
    estimatedDuration: '7 days',
    useCase: 'Maximize ROI from events by following up appropriately based on engagement level',
    preview: {
      nodes: [
        { type: 'condition', label: 'Check Attendance' },
        { type: 'email', label: 'Thank You (Attended)' },
        { type: 'email', label: 'Sorry We Missed You' },
        { type: 'email', label: 'Recording Available' },
        { type: 'wait', label: 'Wait 2 days' },
        { type: 'email', label: 'Next Steps' },
        { type: 'goal_check', label: 'Check Demo Request' },
      ],
      branches: ['Attended → High Priority', 'No-show → Medium Priority', 'Registered Only → Low Priority'],
    },
  },
  {
    id: 'trial-onboarding',
    name: 'Trial Onboarding with Usage Tracking',
    description: 'Guide trial users through product adoption with emails triggered by usage milestones and inactivity detection.',
    category: 'Product-led',
    nodeCount: 11,
    branchCount: 4,
    estimatedDuration: '14 days',
    useCase: 'Increase trial-to-paid conversion by ensuring users experience product value',
    preview: {
      nodes: [
        { type: 'email', label: 'Welcome to Trial' },
        { type: 'wait', label: 'Wait 1 day' },
        { type: 'goal_check', label: 'Check First Action' },
        { type: 'email', label: 'Getting Started Tips' },
        { type: 'email', label: 'Inactive User Nudge' },
        { type: 'condition', label: 'Check Usage Level' },
        { type: 'email', label: 'Power User Path' },
        { type: 'email', label: 'Need Help Path' },
      ],
      branches: ['Active User → Feature Education', 'Inactive User → Activation Campaign', 'Power User → Upgrade Offer', 'Trial Ending → Conversion Push'],
    },
  },
];

export default function SequenceTemplates() {
  const [, setLocation] = useLocation();


  const handleUseTemplate = (template: Template) => {
    // TODO: Load template data into visual builder
    alert(`Template "${template.name}" selected. This will load the template in the visual builder for customization.`);
    setLocation('/sequences/builder/visual');
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <Button
          variant="ghost"
          onClick={() => setLocation('/sequences')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sequences
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Sequence Templates</h1>
        </div>
        <p className="text-muted-foreground">
          Pre-built conditional sequence patterns you can customize and deploy
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">{template.name}</CardTitle>
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full mb-3">
                    {template.category}
                  </span>
                  <CardDescription className="text-sm">
                    {template.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 py-3 border-y">
                <div className="text-center">
                  <Mail className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-semibold">{template.nodeCount}</p>
                  <p className="text-xs text-muted-foreground">Nodes</p>
                </div>
                <div className="text-center">
                  <GitBranch className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-semibold">{template.branchCount}</p>
                  <p className="text-xs text-muted-foreground">Branches</p>
                </div>
                <div className="text-center">
                  <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-semibold">{template.estimatedDuration}</p>
                  <p className="text-xs text-muted-foreground">Duration</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">Use Case:</p>
                <p className="text-sm text-muted-foreground">{template.useCase}</p>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">Flow Preview:</p>
                <div className="space-y-2">
                  {template.preview.branches.map((branch, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <GitBranch className="w-4 h-4 text-purple-600" />
                      <span className="text-muted-foreground">{branch}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={() => handleUseTemplate(template)}
              >
                <Target className="w-4 h-4 mr-2" />
                Use This Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
