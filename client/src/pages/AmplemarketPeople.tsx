import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Mail, Phone, MapPin, Building2, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function AmplemarketPeople() {
  const { data: people, isLoading, refetch } = trpc.integrations.listAmplemarketPeople.useQuery();
  const syncMutation = trpc.integrations.syncAmplemarket.useMutation({
    onSuccess: () => {
      refetch();
    },
  });
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPeople = people?.filter((person) =>
    person.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.primaryEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.roleTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Amplemarket People</h1>
          <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
            View and manage contacts synced from Amplemarket
          </p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="w-full md:w-auto shrink-0"
        >
          {syncMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Sync from Amplemarket
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Contacts</CardTitle>
          <CardDescription>
            {people?.length || 0} contacts synced from Amplemarket
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, company, or title..."
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
          ) : filteredPeople && filteredPeople.length > 0 ? (
            <div className="space-y-2">
              {filteredPeople.map((person) => (
                <Link key={person.id} href={`/people/${person.id}`}>
                  <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-primary">
                            {person.fullName?.charAt(0).toUpperCase() || person.primaryEmail?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{person.fullName}</h3>
                            {person.status && (
                              <Badge variant="outline" className="text-xs">
                                {person.status}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{person.primaryEmail}</span>
                            </div>
                            
                            {person.companyName && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building2 className="w-3 h-3" />
                                <span>{person.companyName}</span>
                                {person.roleTitle && (
                                  <span className="text-muted-foreground/70">• {person.roleTitle}</span>
                                )}
                              </div>
                            )}
                            
                            {person.location && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="w-3 h-3" />
                                <span>{person.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                          {person.sequenceName && (
                            <Badge variant="secondary" className="text-xs">
                              {person.sequenceName}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {person.numberOfOpens !== null && person.numberOfOpens !== undefined && (
                            <span>{person.numberOfOpens} opens</span>
                          )}
                          {person.replied && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Replied</span>
                            </div>
                          )}
                          {person.meetingBooked && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Meeting</span>
                            </div>
                          )}
                        </div>

                        {(person.phone || person.mobileNumber || person.workNumber) && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{person.phone || person.mobileNumber || person.workNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No contacts found matching your search" : "No contacts synced yet. Click 'Sync from Amplemarket' to get started."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
