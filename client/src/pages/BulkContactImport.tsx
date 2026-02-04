import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export function BulkContactImport() {
  const [csvContent, setCsvContent] = useState("");
  const [parseResult, setParseResult] = useState<any>(null);
  const [mapping, setMapping] = useState<Array<{ csvColumn: string; crmField: string }>>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [step, setStep] = useState<"upload" | "map" | "review" | "complete">("upload");

  const { data: availableFields } = trpc.bulkImport.getAvailableFields.useQuery();
  const parseMutation = trpc.bulkImport.parseCSV.useMutation();
  const importMutation = trpc.bulkImport.importContacts.useMutation();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);

      try {
        const result = await parseMutation.mutateAsync({ content });
        setParseResult(result);
        setStep("map");

        // Auto-map common fields
        const autoMapping: Array<{ csvColumn: string; crmField: string }> = [];
        result.headers.forEach((header: string) => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('name') && !lowerHeader.includes('company')) {
            autoMapping.push({ csvColumn: header, crmField: 'fullName' });
          } else if (lowerHeader.includes('email')) {
            autoMapping.push({ csvColumn: header, crmField: 'primaryEmail' });
          } else if (lowerHeader.includes('title') || lowerHeader.includes('position')) {
            autoMapping.push({ csvColumn: header, crmField: 'title' });
          } else if (lowerHeader.includes('phone')) {
            autoMapping.push({ csvColumn: header, crmField: 'phone' });
          } else if (lowerHeader.includes('linkedin')) {
            autoMapping.push({ csvColumn: header, crmField: 'linkedinUrl' });
          } else if (lowerHeader.includes('location') || lowerHeader.includes('city')) {
            autoMapping.push({ csvColumn: header, crmField: 'location' });
          }
        });
        setMapping(autoMapping);
      } catch (error: any) {
        console.error("Error parsing CSV:", error.message);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    try {
      const result = await importMutation.mutateAsync({
        content: csvContent,
        mapping,
        skipDuplicates: true,
      });
      setImportResult(result);
      setStep("complete");
    } catch (error: any) {
      console.error("Error importing contacts:", error.message);
    }
  };

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Bulk Contact Import</h1>
        <p className="text-muted-foreground mt-1">
          Import multiple contacts from a CSV file
        </p>
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card className="p-8">
          <div className="text-center">
            <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">Upload CSV File</h2>
            <p className="text-muted-foreground mb-6">
              Select a CSV file containing your contact data
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload">
              <Button asChild>
                <span>Choose File</span>
              </Button>
            </label>
            <div className="mt-8 text-left text-sm text-muted-foreground">
              <p className="font-medium mb-2">CSV Format Requirements:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>First row must contain column headers</li>
                <li>Required fields: Name, Email</li>
                <li>Supported fields: Title, Phone, LinkedIn, Location</li>
                <li>Maximum file size: 10MB</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Map Fields */}
      {step === "map" && parseResult && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Map CSV Columns to CRM Fields</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Found {parseResult.rowCount} contacts. Map your CSV columns to CRM fields below.
            </p>

            <div className="space-y-4">
              {parseResult.headers.map((header: string) => {
                const currentMapping = mapping.find(m => m.csvColumn === header);
                return (
                  <div key={header} className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium">{header}</label>
                      <div className="text-xs text-muted-foreground mt-1">
                        Sample: {parseResult.preview[0]?.[header] || 'N/A'}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <select
                      className="flex-1 border rounded-md px-3 py-2"
                      value={currentMapping?.crmField || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          setMapping(prev => {
                            const filtered = prev.filter(m => m.csvColumn !== header);
                            return [...filtered, { csvColumn: header, crmField: e.target.value }];
                          });
                        } else {
                          setMapping(prev => prev.filter(m => m.csvColumn !== header));
                        }
                      }}
                    >
                      <option value="">Skip this column</option>
                      {availableFields?.map((field: any) => (
                        <option key={field.field} value={field.field}>
                          {field.label} {field.required && '*'}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button
                onClick={() => setStep("review")}
                disabled={!mapping.some(m => m.crmField === 'primaryEmail') || !mapping.some(m => m.crmField === 'fullName')}
              >
                Continue to Review
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Step 3: Review */}
      {step === "review" && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Review Import</h2>
          <div className="space-y-4 mb-6">
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Total Contacts:</span>
              <span>{parseResult.rowCount}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Mapped Fields:</span>
              <span>{mapping.length}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-medium">Skip Duplicates:</span>
              <span>Yes</span>
            </div>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setStep("map")}>
              Back
            </Button>
            <Button onClick={handleImport} disabled={importMutation.isPending}>
              {importMutation.isPending ? "Importing..." : "Start Import"}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Complete */}
      {step === "complete" && importResult && (
        <Card className="p-8">
          <div className="text-center">
            {importResult.imported > 0 ? (
              <>
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-600" />
                <h2 className="text-2xl font-semibold mb-2">Import Complete</h2>
              </>
            ) : (
              <>
                <AlertCircle className="h-16 w-16 mx-auto mb-4 text-orange-600" />
                <h2 className="text-2xl font-semibold mb-2">Import Completed with Issues</h2>
              </>
            )}

            <div className="space-y-2 my-6">
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Successfully Imported:</span>
                <span className="text-green-600 font-semibold">{importResult.imported}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Skipped/Failed:</span>
                <span className="text-orange-600 font-semibold">{importResult.skipped}</span>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="mt-6 text-left">
                <h3 className="font-semibold mb-2">Errors:</h3>
                <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                  {importResult.errors.slice(0, 10).map((error: any, idx: number) => (
                    <div key={idx} className="text-red-600">
                      Row {error.row}: {error.error}
                    </div>
                  ))}
                  {importResult.errors.length > 10 && (
                    <div className="text-muted-foreground">
                      ... and {importResult.errors.length - 10} more errors
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-4 mt-8 justify-center">
              <Button variant="outline" onClick={() => {
                setStep("upload");
                setCsvContent("");
                setParseResult(null);
                setMapping([]);
                setImportResult(null);
              }}>
                Import Another File
              </Button>
              <Button onClick={() => window.location.href = '/people'}>
                View Contacts
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
