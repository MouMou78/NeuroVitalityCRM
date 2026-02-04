import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Mail, Phone, Calendar, MessageSquare, TrendingUp, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Link } from "wouter";

export default function ActivityFeed() {
  const { data: activities, isLoading } = trpc.activities.list.useQuery();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredActivities = activities?.filter((activity) =>
    activity.personName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "email_sent":
      case "email_received":
      case "reply_received":
        return <Mail className="w-4 h-4" />;
      case "call_completed":
        return <Phone className="w-4 h-4" />;
      case "meeting_held":
        return <Calendar className="w-4 h-4" />;
      case "note_added":
        return <MessageSquare className="w-4 h-4" />;
      case "deal_won":
        return <Award className="w-4 h-4 text-green-500" />;
      case "deal_lost":
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "email_sent":
      case "email_received":
        return "bg-blue-500/10 text-blue-500";
      case "reply_received":
        return "bg-green-500/10 text-green-500";
      case "call_completed":
        return "bg-purple-500/10 text-purple-500";
      case "meeting_held":
        return "bg-orange-500/10 text-orange-500";
      case "note_added":
        return "bg-gray-500/10 text-gray-500";
      case "deal_won":
        return "bg-green-500/10 text-green-500";
      case "deal_lost":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const formatActivityType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="container py-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Activity Feed</CardTitle>
              <CardDescription>
                Unified timeline of all interactions across contacts, deals, and sequences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredActivities && filteredActivities.length > 0 ? (
            <div className="space-y-3">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 md:p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {formatActivityType(activity.type)}
                        </p>
                        {activity.personName && (
                          <Link href={`/people/${activity.personId}`}>
                            <p className="text-sm text-muted-foreground hover:text-primary transition-colors truncate">
                              {activity.personName}
                            </p>
                          </Link>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 break-words">
                        {activity.description}
                      </p>
                    )}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                        {Object.entries(activity.metadata).slice(0, 2).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="text-xs truncate max-w-full">
                            {key}: {String(value).substring(0, 30)}{String(value).length > 30 ? '...' : ''}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No activities yet</p>
              <p className="text-sm text-muted-foreground">
                Activities will appear here as you interact with contacts
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
