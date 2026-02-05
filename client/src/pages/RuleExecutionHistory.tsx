import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CheckCircle2, XCircle, Clock, TrendingUp, Activity } from "lucide-react";

export default function RuleExecutionHistory() {
  const [selectedRule, setSelectedRule] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7");

  const { data: rules } = trpc.automation.getRules.useQuery();
  const { data: executions, isLoading } = trpc.automation.getExecutions.useQuery({
    ruleId: selectedRule === "all" ? undefined : selectedRule,
  });

  // Calculate metrics
  const totalExecutions = executions?.length || 0;
  const successfulExecutions = executions?.filter((e: any) => e.status === "success").length || 0;
  const failedExecutions = executions?.filter((e: any) => e.status === "failed").length || 0;
  const successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0;

  // Group executions by date for timeline
  const executionsByDate = executions?.reduce((acc: any, execution: any) => {
    const date = new Date(execution.executedAt).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(execution);
    return acc;
  }, {}) || {};

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "skipped":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getRuleName = (ruleId: string) => {
    const rule = rules?.find((r: any) => r.id === ruleId);
    return rule?.name || "Unknown Rule";
  };

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Rule Execution History</h1>
        <p className="text-muted-foreground mt-2">
          Monitor automation rule performance and execution details
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExecutions}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {successfulExecutions} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successfulExecutions}</div>
            <p className="text-xs text-muted-foreground">Completed successfully</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedExecutions}</div>
            <p className="text-xs text-muted-foreground">Execution errors</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter execution history by rule and date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rule</label>
              <Select value={selectedRule} onValueChange={setSelectedRule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rules</SelectItem>
                  {rules?.map((rule: any) => (
                    <SelectItem key={rule.id} value={rule.id}>
                      {rule.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Execution Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Timeline</CardTitle>
          <CardDescription>Chronological view of rule executions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading executions...</div>
          ) : executions && executions.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(executionsByDate)
                .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                .map(([date, dateExecutions]: [string, any]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium">{date}</h3>
                      <span className="text-sm text-muted-foreground">
                        ({dateExecutions.length} execution{dateExecutions.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="space-y-2 pl-6 border-l-2 border-border">
                      {dateExecutions.map((execution: any) => (
                        <Card key={execution.id} className="ml-4">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {getStatusIcon(execution.status)}
                                  <span className="font-medium">{getRuleName(execution.ruleId)}</span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                                    {getStatusLabel(execution.status)}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(execution.executedAt).toLocaleTimeString()}
                                </p>
                                {execution.result && (
                                  <p className="text-sm mt-2">{JSON.stringify(execution.result)}</p>
                                )}
                                {execution.error && (
                                  <p className="text-sm text-red-600 mt-2">{execution.error}</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No execution history found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Executions will appear here once your automation rules start running
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
