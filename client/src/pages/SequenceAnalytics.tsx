import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Users, Mail, Target } from 'lucide-react';
import { useLocation, Link } from 'wouter';

export default function SequenceAnalytics() {
  const [, setLocation] = useLocation();

  // Mock data for demonstration
  const sequenceData = {
    name: 'Cold Outreach Campaign',
    totalEnrolled: 1250,
    active: 890,
    completed: 320,
    unsubscribed: 40,
    overallConversionRate: 25.6,
  };

  const branchMetrics = [
    {
      branchName: 'Initial Email',
      nodeType: 'email',
      sent: 1250,
      opened: 875,
      clicked: 312,
      replied: 156,
      openRate: 70,
      clickRate: 25,
      replyRate: 12.5,
    },
    {
      branchName: 'Replied - Follow Up',
      nodeType: 'email',
      sent: 156,
      opened: 145,
      clicked: 89,
      replied: 67,
      openRate: 93,
      clickRate: 57,
      replyRate: 43,
    },
    {
      branchName: 'No Reply - Reminder',
      nodeType: 'email',
      sent: 1094,
      opened: 623,
      clicked: 187,
      replied: 93,
      openRate: 57,
      clickRate: 17,
      replyRate: 8.5,
    },
    {
      branchName: 'Goal Met - Meeting Booked',
      nodeType: 'goal_check',
      sent: 320,
      goalMet: 82,
      goalNotMet: 238,
      conversionRate: 25.6,
    },
  ];

  const abTestResults = [
    {
      variant: 'A',
      subject: 'Quick question about [Company]',
      sent: 625,
      opened: 450,
      replied: 89,
      openRate: 72,
      replyRate: 14.2,
    },
    {
      variant: 'B',
      subject: 'Helping [Company] with [Pain Point]',
      sent: 625,
      opened: 425,
      replied: 67,
      openRate: 68,
      replyRate: 10.7,
    },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => setLocation('/sequences')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sequences
          </Button>
          <h1 className="text-3xl font-bold">{sequenceData.name}</h1>
          <p className="text-muted-foreground">Performance analytics and branch metrics</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enrolled</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sequenceData.totalEnrolled}</div>
            <p className="text-xs text-muted-foreground">
              {sequenceData.active} active, {sequenceData.completed} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sequenceData.overallConversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {sequenceData.completed} prospects converted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Prospects</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sequenceData.active}</div>
            <p className="text-xs text-muted-foreground">
              Currently in sequence
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unsubscribed</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sequenceData.unsubscribed}</div>
            <p className="text-xs text-muted-foreground">
              {((sequenceData.unsubscribed / sequenceData.totalEnrolled) * 100).toFixed(1)}% unsubscribe rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Branch Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Performance</CardTitle>
          <CardDescription>
            Detailed metrics for each branch in the sequence flow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {branchMetrics.map((branch, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{branch.branchName}</h3>
                  <span className="text-sm text-muted-foreground capitalize">
                    {branch.nodeType.replace('_', ' ')}
                  </span>
                </div>
                
                {branch.nodeType === 'email' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Sent</p>
                      <p className="text-2xl font-bold">{branch.sent}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Open Rate</p>
                      <p className="text-2xl font-bold text-blue-600">{branch.openRate}%</p>
                      <p className="text-xs text-muted-foreground">{branch.opened} opened</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Click Rate</p>
                      <p className="text-2xl font-bold text-green-600">{branch.clickRate}%</p>
                      <p className="text-xs text-muted-foreground">{branch.clicked} clicked</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Reply Rate</p>
                      <p className="text-2xl font-bold text-purple-600">{branch.replyRate}%</p>
                      <p className="text-xs text-muted-foreground">{branch.replied} replied</p>
                    </div>
                  </div>
                )}

                {branch.nodeType === 'goal_check' && 'goalMet' in branch && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Checked</p>
                      <p className="text-2xl font-bold">{branch.sent}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Goal Met</p>
                      <p className="text-2xl font-bold text-green-600">{branch.goalMet}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
                      <p className="text-2xl font-bold text-blue-600">{branch.conversionRate}%</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* A/B Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>A/B Test Performance</CardTitle>
          <CardDescription>
            Compare variant performance to optimize your messaging
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {abTestResults.map((variant, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">Variant {variant.variant}</h3>
                    <p className="text-sm text-muted-foreground">{variant.subject}</p>
                  </div>
                  {variant.variant === 'A' && variant.replyRate > abTestResults[1].replyRate && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                      Winner
                    </span>
                  )}
                  {variant.variant === 'B' && variant.replyRate > abTestResults[0].replyRate && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                      Winner
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Sent</p>
                    <p className="text-2xl font-bold">{variant.sent}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Opened</p>
                    <p className="text-2xl font-bold">{variant.opened}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Open Rate</p>
                    <p className="text-2xl font-bold text-blue-600">{variant.openRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reply Rate</p>
                    <p className="text-2xl font-bold text-purple-600">{variant.replyRate}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
