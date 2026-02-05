import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, DollarSign, Calendar, User, Building2 } from "lucide-react";
import Notes from "@/components/Notes";
import { format } from "date-fns";

export default function DealDetail() {
  const params = useParams();
  const dealId = params.id as string;
  const [, setLocation] = useLocation();

  const { data: deal, isLoading } = trpc.deals.get.useQuery({ dealId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Deal Not Found</h2>
          <Button onClick={() => setLocation("/deals")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pipeline
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => setLocation("/deals")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pipeline
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{deal.name}</h1>
        <div className="flex items-center gap-4 text-muted-foreground">
          <Badge variant="outline">Stage ID: {deal.stageId}</Badge>
          <span className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            {deal.value ? `$${deal.value.toLocaleString()}` : "No value"}
          </span>
          {deal.expectedCloseDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(deal.expectedCloseDate), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Deal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Deal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deal.accountId && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Company</label>
                <div className="flex items-center gap-2 mt-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>Account ID: {deal.accountId}</span>
                </div>
              </div>
            )}
            
            {deal.contactId && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Primary Contact</label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Contact ID: {deal.contactId}</span>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">Stage</label>
              <p className="mt-1">Stage ID: {deal.stageId}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Value</label>
              <p className="mt-1 text-lg font-semibold">
                {deal.value ? `$${deal.value.toLocaleString()}` : "Not set"}
              </p>
            </div>

            {deal.expectedCloseDate && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Expected Close Date</label>
                <p className="mt-1">{format(new Date(deal.expectedCloseDate), "MMMM d, yyyy")}</p>
              </div>
            )}

            {deal.probability !== undefined && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Probability</label>
                <p className="mt-1">{deal.probability}%</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="mt-1">{format(new Date(deal.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>

            {deal.updatedAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="mt-1">{format(new Date(deal.updatedAt), "MMM d, yyyy 'at' h:mm a")}</p>
              </div>
            )}

            {deal.ownerUserId && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Owner</label>
                <p className="mt-1">User ID: {deal.ownerUserId}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contextual Notes */}
      <div className="mt-6">
        <Notes entityType="deal" entityId={dealId} />
      </div>
    </div>
  );
}
