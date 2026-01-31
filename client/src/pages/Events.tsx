import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, QrCode } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { CreateEventDialog } from "@/components/CreateEventDialog";

export default function Events() {
  const { data: events, isLoading } = trpc.events.list.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground mt-2">
            Manage events and lead capture forms
          </p>
        </div>
        <CreateEventDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
          <CardDescription>
            Events with QR code lead capture
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : events && events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <QrCode className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{event.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Slug: {event.slug}
                        </p>
                        {event.startsAt && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(event.startsAt), "MMM d, yyyy")}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View QR
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No events yet. Create your first event to start capturing leads!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
