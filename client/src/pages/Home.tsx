import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Clock, Users } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { data, isLoading } = trpc.home.dashboard.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to 1twenty CRM. Here's your overview for today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Actions</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.todayActions.length || 0}</div>
            <p className="text-xs text-muted-foreground">Actions requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting On</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.waitingOn.length || 0}</div>
            <p className="text-xs text-muted-foreground">Follow-ups pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.recentlyTouched.length || 0}</div>
            <p className="text-xs text-muted-foreground">Recently active</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's Actions</CardTitle>
            <CardDescription>Actions that need your attention</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.todayActions && data.todayActions.length > 0 ? (
              <div className="space-y-3">
                {data.todayActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{action.actionType}</p>
                      <p className="text-sm text-muted-foreground">Thread: {action.threadId}</p>
                    </div>
                    <Button size="sm" variant="outline">View</Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No actions for today</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently Touched</CardTitle>
            <CardDescription>Your most recent contacts</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.recentlyTouched && data.recentlyTouched.length > 0 ? (
              <div className="space-y-3">
                {data.recentlyTouched.map((person) => (
                  <Link key={person.id} href={`/people/${person.id}`}>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                      <div>
                        <p className="font-medium">{person.fullName}</p>
                        <p className="text-sm text-muted-foreground">{person.companyName || person.primaryEmail}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No recent contacts</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
