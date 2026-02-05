import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const [dateRange, setDateRange] = useState("30");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportType, setReportType] = useState<"deals" | "contacts" | "activities">("deals");

  const { data: contactsData } = trpc.people.list.useQuery();
  const { data: dealsData } = trpc.deals.list.useQuery();
  const { data: momentsData } = trpc.moments.list.useQuery();
  
  const exportToCSV = () => {
    let csvContent = "";
    let filename = "";

    if (reportType === "contacts" && contactsData) {
      filename = `contacts_report_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = "Name,Email,Company,Title\n";
      contactsData.forEach((contact: any) => {
        csvContent += `"${contact.name || contact.fullName}","${contact.primaryEmail || ''}","${contact.companyName || ''}","${contact.roleTitle || ''}"\n`;
      });
    } else if (reportType === "deals" && dealsData) {
      filename = `deals_report_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = "Deal Name,Value,Stage ID,Expected Close Date,Probability\n";
      dealsData.forEach((deal: any) => {
        csvContent += `"${deal.name}","${deal.value || 0}","${deal.stageId}","${deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : ''}","${deal.probability || 50}%"\n`;
      });
    } else if (reportType === "activities" && momentsData) {
      filename = `activities_report_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = "Date,Type,Source,Content\n";
      momentsData.forEach((moment: any) => {
        csvContent += `"${new Date(moment.happenedAt).toLocaleDateString()}","${moment.type}","${moment.source}","${(moment.content || '').replace(/"/g, '""')}"\n`;
      });
    } else {
      toast.error("No data available to export");
      return;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Report exported: ${filename}`);
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Custom Reports</h1>
        <p className="text-muted-foreground">
          Generate and export custom reports with flexible metrics and date ranges
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Report Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>Select metrics and date range for your report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger id="reportType">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deals">Deals Report</SelectItem>
                  <SelectItem value="contacts">Contacts Report</SelectItem>
                  <SelectItem value="activities">Activities Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateRange">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger id="dateRange">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === "custom" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}

            <Button onClick={exportToCSV} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export as CSV
            </Button>
          </CardContent>
        </Card>

        {/* Report Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Report Preview</CardTitle>
            <CardDescription>Preview of your report data</CardDescription>
          </CardHeader>
          <CardContent>
            {reportType === "contacts" && contactsData && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Contacts Report</span>
                </div>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left font-medium">Name</th>
                        <th className="p-2 text-left font-medium">Email</th>
                        <th className="p-2 text-left font-medium">Company</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contactsData.slice(0, 10).map((contact: any) => (
                        <tr key={contact.id} className="border-b last:border-0">
                          <td className="p-2">{contact.name || contact.fullName}</td>
                          <td className="p-2">{contact.primaryEmail || '-'}</td>
                          <td className="p-2">{contact.companyName || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {contactsData.length > 10 && (
                    <div className="p-2 text-xs text-muted-foreground text-center border-t">
                      Showing 10 of {contactsData.length} contacts
                    </div>
                  )}
                </div>
              </div>
            )}

            {reportType === "deals" && dealsData && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Deals Report</span>
                </div>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left font-medium">Deal Name</th>
                        <th className="p-2 text-left font-medium">Value</th>
                        <th className="p-2 text-left font-medium">Stage</th>
                        <th className="p-2 text-left font-medium">Probability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dealsData.slice(0, 10).map((deal: any) => (
                        <tr key={deal.id} className="border-b last:border-0">
                          <td className="p-2">{deal.name}</td>
                          <td className="p-2">${deal.value ? Number(deal.value).toLocaleString() : '0'}</td>
                          <td className="p-2">{deal.stageId}</td>
                          <td className="p-2">{deal.probability || 50}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dealsData.length > 10 && (
                    <div className="p-2 text-xs text-muted-foreground text-center border-t">
                      Showing 10 of {dealsData.length} deals
                    </div>
                  )}
                </div>
              </div>
            )}

            {reportType === "activities" && momentsData && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Activities Report</span>
                </div>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left font-medium">Date</th>
                        <th className="p-2 text-left font-medium">Type</th>
                        <th className="p-2 text-left font-medium">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {momentsData.slice(0, 10).map((moment: any) => (
                        <tr key={moment.id} className="border-b last:border-0">
                          <td className="p-2">{new Date(moment.happenedAt).toLocaleDateString()}</td>
                          <td className="p-2">{moment.type}</td>
                          <td className="p-2">{moment.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {momentsData.length > 10 && (
                    <div className="p-2 text-xs text-muted-foreground text-center border-t">
                      Showing 10 of {momentsData.length} activities
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
