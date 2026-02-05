import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, ExternalLink, Copy, ArrowLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface EventDetailProps {
  eventId: string;
}

export default function EventDetail({ eventId }: EventDetailProps) {
  const [, setLocation] = useLocation();
  const { data: event, isLoading } = trpc.events.get.useQuery({ id: eventId });

  // Keyboard shortcut: Escape to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLocation("/events");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event) {
    return <div className="text-center py-12">Event not found</div>;
  }

  const publicUrl = `${window.location.origin}/public/e/${event.slug}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("URL copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/events")} className="h-8 px-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Events
        </Button>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{event.name}</span>
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
        {event.startsAt && (
          <div className="flex items-center gap-2 text-muted-foreground mt-2">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(event.startsAt), "MMMM d, yyyy")}
              {event.endsAt && ` - ${format(new Date(event.endsAt), "MMMM d, yyyy")}`}
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Slug</p>
              <p className="text-sm text-muted-foreground font-mono">{event.slug}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-1">Default Intent</p>
              <p className="text-sm text-muted-foreground">{event.defaultIntent}</p>
            </div>

            {event.defaultTags && event.defaultTags.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Default Tags</p>
                <div className="flex flex-wrap gap-2">
                  {event.defaultTags.map((tag, i) => (
                    <span key={i} className="text-xs bg-secondary px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Capture Form</CardTitle>
            <CardDescription>Public URL for collecting leads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Public URL</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={publicUrl}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                />
                <Button size="sm" variant="outline" onClick={copyToClipboard}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview Form
                </a>
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">QR Code</p>
              <div className="flex items-center justify-center p-6 bg-muted rounded-lg">
                <div className="w-48 h-48 bg-white flex items-center justify-center">
                  <p className="text-xs text-muted-foreground text-center">
                    QR Code generation<br />coming soon
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Form Fields</CardTitle>
          <CardDescription>Fields shown in the lead capture form</CardDescription>
        </CardHeader>
        <CardContent>
          {event.formSchema && event.formSchema.fields ? (
            <div className="space-y-2">
              {event.formSchema.fields.map((field, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{field.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {field.key} • {field.type}
                    </p>
                  </div>
                  {field.required && (
                    <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                      Required
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No form fields configured</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
