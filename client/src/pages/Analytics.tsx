import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, Users, Target, Clock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<"last_4_weeks" | "last_8_weeks" | "last_12_weeks">("last_8_weeks");
  
  const { data, isLoading, error } = trpc.analytics.get.useQuery({ timeRange });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center text-red-600 p-8">
          Error loading analytics: {error.message}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Track your CRM performance and engagement metrics
            </p>
          </div>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_4_weeks">Last 4 Weeks</SelectItem>
              <SelectItem value="last_8_weeks">Last 8 Weeks</SelectItem>
              <SelectItem value="last_12_weeks">Last 12 Weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((data?.engagement.replies_per_email_sent || 0) * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Replies per email sent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meeting Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((data?.engagement.meetings_per_reply || 0) * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Meetings per reply
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Actions</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.follow_up_discipline.overdue_open_actions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Actions past due date
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Action Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(data?.follow_up_discipline.avg_hours_to_complete_action || 0).toFixed(1)}h
              </div>
              <p className="text-xs text-muted-foreground">
                Hours to complete
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Over Time</CardTitle>
            <CardDescription>Weekly breakdown of your outreach and engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.activity.by_week || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week_start" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="email_sent" stroke="#8b5cf6" name="Emails Sent" />
                <Line type="monotone" dataKey="reply_received" stroke="#10b981" name="Replies" />
                <Line type="monotone" dataKey="meeting_held" stroke="#f59e0b" name="Meetings" />
                <Line type="monotone" dataKey="lead_captured" stroke="#3b82f6" name="Leads" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Funnel Health */}
        <Card>
          <CardHeader>
            <CardTitle>Funnel Distribution</CardTitle>
            <CardDescription>Number of threads in each stage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.funnel_health.counts_by_stage || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage_key" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Velocity Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contact to Reply</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.velocity.median_days_first_contact_to_reply?.toFixed(1) || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">Median days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Reply to Meeting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.velocity.median_days_reply_to_meeting?.toFixed(1) || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">Median days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Meeting to Close</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.velocity.median_days_meeting_to_close_signal?.toFixed(1) || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">Median days</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
