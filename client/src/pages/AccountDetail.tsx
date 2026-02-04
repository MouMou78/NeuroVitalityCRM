import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Building2, Globe, MapPin, Calendar, Users, DollarSign, TrendingUp, ExternalLink, Mail, Phone, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";

export default function AccountDetail() {
  const params = useParams();
  const accountId = params.id;
  const [, navigate] = useLocation();

  const { data: account, isLoading } = trpc.amplemarket.getAccountById.useQuery(
    { accountId: accountId! },
    { enabled: !!accountId }
  );

  const { data: contacts } = trpc.amplemarket.getContactsByAccount.useQuery(
    { accountId: accountId! },
    { enabled: !!accountId }
  );

  const { data: activities, isLoading: activitiesLoading } = trpc.amplemarket.getAccountActivities.useQuery(
    { accountId: accountId! },
    { enabled: !!accountId }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading account...</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Account Not Found</h2>
          <p className="text-muted-foreground mb-4">The account you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/amplemarket/accounts")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Accounts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-3 md:py-4 px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/amplemarket/accounts")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Accounts
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">{account.name}</h1>
                <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1 md:mt-2 text-xs md:text-sm text-muted-foreground">
                  {account.industry && (
                    <span className="flex items-center gap-1">
                      <Badge variant="secondary">{account.industry}</Badge>
                    </span>
                  )}
                  {account.domain && (
                    <a
                      href={`https://${account.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Globe className="h-4 w-4" />
                      {account.domain}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-4 md:py-6 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Sidebar - Company Overview */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Company Overview</h3>
              <div className="space-y-4">
                {account.headquarters && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Headquarters</p>
                      <p className="text-sm text-muted-foreground">{account.headquarters}</p>
                    </div>
                  </div>
                )}

                {account.employees && (
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Employees</p>
                      <p className="text-sm text-muted-foreground">{account.employees}</p>
                    </div>
                  </div>
                )}

                {account.revenue && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Revenue</p>
                      <p className="text-sm text-muted-foreground">{account.revenue}</p>
                    </div>
                  </div>
                )}

                {account.foundingYear && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Founded</p>
                      <p className="text-sm text-muted-foreground">{account.foundingYear}</p>
                    </div>
                  </div>
                )}

                {account.lastFundingRound && (
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Last Funding</p>
                      <p className="text-sm text-muted-foreground">{account.lastFundingRound}</p>
                    </div>
                  </div>
                )}

                {account.linkedinUrl && (
                  <div className="pt-4 border-t">
                    <a
                      href={account.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      View on LinkedIn
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </Card>

            {account.technologies && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Technologies</h3>
                <div className="flex flex-wrap gap-2">
                  {((account.technologies as any) || '').toString().split(',').slice(0, 10).map((tech: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {tech.trim()}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="contacts" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="contacts" className="text-xs md:text-sm py-2">Contacts</TabsTrigger>
                <TabsTrigger value="activity" className="text-xs md:text-sm py-2">Activity</TabsTrigger>
                <TabsTrigger value="overview" className="text-xs md:text-sm py-2">Overview</TabsTrigger>
              </TabsList>

              <TabsContent value="contacts" className="mt-4 md:mt-6">
                <Card>
                  <div className="p-6">
                    <h3 className="font-semibold mb-4">Decision Makers</h3>
                    {contacts && contacts.length > 0 ? (
                      <div className="space-y-4">
                        {contacts.map((contact) => (
                          <Link
                            key={contact.id}
                            href={`/people/${contact.id}`}
                            className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent transition-colors"
                          >
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                              {contact.firstName?.[0]}{contact.lastName?.[0]}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{contact.fullName}</p>
                              <p className="text-sm text-muted-foreground">{contact.roleTitle || 'No title'}</p>
                              <p className="text-sm text-muted-foreground">{contact.primaryEmail}</p>
                            </div>
                            {contact.location && (
                              <div className="text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4 inline mr-1" />
                                {contact.location}
                              </div>
                            )}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No contacts found for this account</p>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="mt-6">
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Activity Timeline</h3>
                  {activitiesLoading ? (
                    <div className="text-center py-12">
                      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground">Loading activities...</p>
                    </div>
                  ) : activities && activities.length > 0 ? (
                    <div className="space-y-4">
                      {activities.map((activity: any) => (
                        <div key={activity.id} className="flex gap-4 p-4 rounded-lg border">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              {activity.type === 'email_sent' && <Mail className="h-5 w-5 text-primary" />}
                              {activity.type === 'email_received' && <Mail className="h-5 w-5 text-green-600" />}
                              {activity.type === 'call_completed' && <Phone className="h-5 w-5 text-blue-600" />}
                              {activity.type === 'meeting_held' && <Calendar className="h-5 w-5 text-purple-600" />}
                              {!['email_sent', 'email_received', 'call_completed', 'meeting_held'].includes(activity.type) && <Activity className="h-5 w-5 text-muted-foreground" />}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">
                                  {activity.type === 'email_sent' && 'Email Sent'}
                                  {activity.type === 'email_received' && 'Email Received'}
                                  {activity.type === 'reply_received' && 'Reply Received'}
                                  {activity.type === 'call_completed' && 'Call Completed'}
                                  {activity.type === 'meeting_held' && 'Meeting Held'}
                                  {activity.type === 'note_added' && 'Note Added'}
                                  {activity.type === 'lead_captured' && 'Lead Captured'}
                                  {activity.type === 'deal_won' && 'Deal Won'}
                                  {activity.type === 'deal_lost' && 'Deal Lost'}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {activity.personName} ({activity.personEmail})
                                </p>
                                {activity.metadata?.subject && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {activity.metadata.subject}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(activity.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No activity recorded yet</p>
                      <p className="text-sm mt-2">Engagement activities will appear here</p>
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="overview" className="mt-6">
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4">Performance Metrics</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-lg bg-muted">
                        <p className="text-2xl font-bold">{contacts?.length || 0}</p>
                        <p className="text-sm text-muted-foreground">Contacts</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted">
                        <p className="text-2xl font-bold">0</p>
                        <p className="text-sm text-muted-foreground">Activities</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted">
                        <p className="text-2xl font-bold">-</p>
                        <p className="text-sm text-muted-foreground">Last Interaction</p>
                      </div>
                    </div>
                  </Card>

                  {account.firstContacted && (
                    <Card className="p-6">
                      <h3 className="font-semibold mb-4">Engagement History</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">First Contacted</span>
                          <span>{new Date(account.firstContacted).toLocaleDateString()}</span>
                        </div>
                        {account.createdAt && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Added to CRM</span>
                            <span>{new Date(account.createdAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
