import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Building2, MapPin, Users, DollarSign, Calendar } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function AmplemarketAccounts() {
  const { data: accounts, isLoading, refetch } = trpc.integrations.listAmplemarketAccounts.useQuery();
  const syncMutation = trpc.integrations.syncAmplemarket.useMutation({
    onSuccess: () => {
      refetch();
    },
  });
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAccounts = accounts?.filter((account) =>
    account.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.domain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Amplemarket Accounts</h1>
          <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
            View and manage accounts synced from Amplemarket
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
          <CardTitle>All Accounts</CardTitle>
          <CardDescription>
            {accounts?.length || 0} accounts synced from Amplemarket
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, domain, or industry..."
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
          ) : filteredAccounts && filteredAccounts.length > 0 ? (
            <div className="space-y-3">
              {filteredAccounts.map((account) => (
                <Link key={account.id} href={`/accounts/${account.id}`} className="block">
                  <div className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{account.name}</h3>
                          {account.domain && (
                            <a
                              href={`https://${account.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              {account.domain}
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {account.industry && (
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="secondary" className="truncate">{account.industry}</Badge>
                          </div>
                        )}
                        {account.employees && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                            <Users className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{account.employees} employees</span>
                          </div>
                        )}
                        {account.revenue && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                            <DollarSign className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{account.revenue}</span>
                          </div>
                        )}
                        {account.headquarters && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{account.headquarters}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {account.foundingYear && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>Founded {account.foundingYear}</span>
                          </div>
                        )}
                        {account.lastFundingRound && (
                          <Badge variant="outline" className="text-xs">
                            {account.lastFundingRound}
                          </Badge>
                        )}
                        {account.technologies && Array.isArray(account.technologies) && account.technologies.length > 0 && (
                          <div className="flex gap-1">
                            {account.technologies.slice(0, 3).map((tech: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                            {account.technologies.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{account.technologies.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No accounts found matching your search" : "No accounts synced yet. Click 'Sync from Amplemarket' to get started."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
