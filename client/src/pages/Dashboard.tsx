import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DollarSign, TrendingUp, Users, Activity } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

export default function Dashboard() {
  const { data: pipelineData, isLoading: pipelineLoading } = trpc.analytics.getDealPipeline.useQuery();
  const { data: conversionData, isLoading: conversionLoading } = trpc.analytics.getConversionRates.useQuery();
  const { data: metricsData, isLoading: metricsLoading } = trpc.analytics.getOverallMetrics.useQuery();
  const { data: campaignTrends, isLoading: trendsLoading } = trpc.analytics.getCampaignTrends.useQuery({});

  if (pipelineLoading || conversionLoading || metricsLoading || trendsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalDealValue = metricsData?.totalDealValue || 0;
  const totalDeals = metricsData?.totalDeals || 0;
  const avgDealSize = totalDeals > 0 ? totalDealValue / totalDeals : 0;

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Track your pipeline health, conversion rates, and team performance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalDealValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across {totalDeals} deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Deal Size</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Math.round(avgDealSize).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Per deal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeals}</div>
            <p className="text-xs text-muted-foreground">
              In pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sequences</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricsData?.activeSequenceEnrollments || 0}</div>
            <p className="text-xs text-muted-foreground">
              Enrollments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline by Stage */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          {pipelineData && pipelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stageName" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  labelStyle={{ color: '#000' }}
                />
                <Legend />
                <Bar dataKey="totalValue" fill="#8884d8" name="Total Value" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">No pipeline data available</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Deal Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Deal Distribution by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineData && pipelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pipelineData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ stageName, dealCount }) => `${stageName}: ${dealCount}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="dealCount"
                  >
                    {pipelineData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No distribution data available</p>
            )}
          </CardContent>
        </Card>

        {/* Conversion Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Stage Conversion Rates</CardTitle>
          </CardHeader>
          <CardContent>
            {conversionData && conversionData.length > 0 ? (
              <div className="space-y-4">
                {conversionData.map((conversion: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {conversion.from} → {conversion.to}
                      </span>
                      <span className="text-muted-foreground">
                        {conversion.conversionRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(conversion.conversionRate, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No conversion data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance Trends */}
      {campaignTrends && campaignTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={campaignTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="campaignName" />
                <YAxis />
                <Tooltip labelStyle={{ color: '#000' }} />
                <Legend />
                <Line type="monotone" dataKey="openRate" stroke="#8884d8" name="Open Rate %" />
                <Line type="monotone" dataKey="clickRate" stroke="#82ca9d" name="Click Rate %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
