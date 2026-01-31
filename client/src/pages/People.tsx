import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { AddPersonDialog } from "@/components/AddPersonDialog";

export default function People() {
  const { data: people, isLoading } = trpc.people.list.useQuery();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPeople = people?.filter((person) =>
    person.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.primaryEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">People</h1>
          <p className="text-muted-foreground mt-2">
            Manage your contacts and relationships
          </p>
        </div>
        <AddPersonDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Contacts</CardTitle>
          <CardDescription>
            Search and view all people in your CRM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or company..."
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
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {person.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{person.fullName}</p>
                          <p className="text-sm text-muted-foreground">{person.primaryEmail}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {person.companyName && (
                        <p className="text-sm font-medium">{person.companyName}</p>
                      )}
                      {person.roleTitle && (
                        <p className="text-sm text-muted-foreground">{person.roleTitle}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? "No people found matching your search" : "No people yet. Add your first contact!"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
