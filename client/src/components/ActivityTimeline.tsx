import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Calendar, FileText, CheckSquare, TrendingUp, Tag, UserCheck } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface ActivityTimelineProps {
  personId?: string;
  accountId?: string;
  limit?: number;
}

const activityTypeFilters = [
  { value: "all", label: "All Activities" },
  { value: "email", label: "Emails", icon: Mail },
  { value: "call", label: "Calls", icon: Phone },
  { value: "meeting", label: "Meetings", icon: Calendar },
  { value: "note", label: "Notes", icon: FileText },
  { value: "task", label: "Tasks", icon: CheckSquare },
  { value: "deal_stage_change", label: "Deal Changes", icon: TrendingUp },
  { value: "tag_added", label: "Tags", icon: Tag },
  { value: "assignment_changed", label: "Assignments", icon: UserCheck },
];

export function ActivityTimeline({ personId, accountId, limit = 50 }: ActivityTimelineProps) {
  const [selectedFilter, setSelectedFilter] = useState("all");

  const { data: activities, isLoading } = personId
    ? trpc.activities.getByPerson.useQuery({ personId, limit })
    : accountId
    ? trpc.activities.getByAccount.useQuery({ accountId, limit })
    : { data: [], isLoading: false };

  const filteredActivities = selectedFilter === "all"
    ? activities
    : activities?.filter(a => a.activityType === selectedFilter);

  const getActivityIcon = (type: string) => {
    const filter = activityTypeFilters.find(f => f.value === type);
    const Icon = filter?.icon || FileText;
    return <Icon className="w-4 h-4" />;
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      email: "text-blue-500",
      call: "text-green-500",
      meeting: "text-purple-500",
      note: "text-gray-500",
      task: "text-orange-500",
      deal_stage_change: "text-indigo-500",
      tag_added: "text-pink-500",
      assignment_changed: "text-cyan-500",
    };
    return colors[type] || "text-gray-500";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>Loading activities...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
        <CardDescription>All interactions and updates</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {activityTypeFilters.map((filter) => {
            const Icon = filter.icon;
            return (
              <Button
                key={filter.value}
                variant={selectedFilter === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFilter(filter.value)}
                className="gap-2"
              >
                {Icon && <Icon className="w-3 h-3" />}
                {filter.label}
              </Button>
            );
          })}
        </div>

        {/* Timeline */}
        {filteredActivities && filteredActivities.length > 0 ? (
          <div className="space-y-4">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="flex gap-4">
                <div className={`mt-1 ${getActivityColor(activity.activityType)}`}>
                  {getActivityIcon(activity.activityType)}
                </div>
                <div className="flex-1 pb-4 border-b last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{activity.title}</div>
                      {activity.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {activity.description}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No activities found
            {selectedFilter !== "all" && " for this filter"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
