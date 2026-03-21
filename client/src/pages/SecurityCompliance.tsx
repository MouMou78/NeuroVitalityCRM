import { Shield, Lock, FileText, Download, CheckCircle, Globe, Server, Key, AlertTriangle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface Document {
  title: string;
  description: string;
  filename: string;
  badge: string;
  badgeVariant: "default" | "secondary" | "outline";
}

const documents: Document[] = [
  {
    title: "Privacy Policy",
    description: "How we collect, use, and protect your personal data in accordance with GDPR.",
    filename: "privacy_policy.pdf",
    badge: "GDPR",
    badgeVariant: "default",
  },
  {
    title: "Terms of Service",
    description: "The legal agreement governing your use of the NeuroVitality CRM platform.",
    filename: "terms_of_service.pdf",
    badge: "Legal",
    badgeVariant: "secondary",
  },
  {
    title: "Data Processing Agreement",
    description: "Our formal DPA outlining our obligations as a data processor under GDPR.",
    filename: "data_processing_agreement.pdf",
    badge: "GDPR / DPA",
    badgeVariant: "default",
  },
  {
    title: "Cookie Policy",
    description: "Detailed information about the cookies we use and how to manage them.",
    filename: "cookie_policy.pdf",
    badge: "ePrivacy",
    badgeVariant: "secondary",
  },
  {
    title: "Security Overview",
    description: "A technical overview of our security controls, architecture, and practices.",
    filename: "security_overview.pdf",
    badge: "SOC 2 / ISO 27001",
    badgeVariant: "outline",
  },
];

interface SecurityControl {
  icon: React.ElementType;
  title: string;
  description: string;
}

const securityControls: SecurityControl[] = [
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description: "All data is encrypted in transit using TLS 1.2+ and at rest using AES-256-GCM. Your data is never stored in plaintext.",
  },
  {
    icon: Key,
    title: "Mandatory Two-Factor Authentication",
    description: "All user accounts require 2FA via TOTP (Time-based One-Time Password), providing an essential second layer of protection.",
  },
  {
    icon: Shield,
    title: "Session Security",
    description: "Sessions are managed with cryptographically signed, HttpOnly, Secure, and SameSite=Strict cookies, preventing hijacking and CSRF attacks.",
  },
  {
    icon: Server,
    title: "Rate Limiting & Brute-Force Protection",
    description: "Authentication endpoints are limited to 10 attempts per 15 minutes. All API endpoints are protected against denial-of-service attacks.",
  },
  {
    icon: Globe,
    title: "Strict CORS & Content Security Policy",
    description: "Only approved origins can interact with our API. A strict CSP prevents cross-site scripting (XSS) and content injection attacks.",
  },
  {
    icon: AlertTriangle,
    title: "Vulnerability Management",
    description: "We conduct regular security audits, static and dynamic analysis, and dependency scanning to identify and remediate vulnerabilities promptly.",
  },
];

interface ComplianceStandard {
  name: string;
  description: string;
  status: string;
}

const complianceStandards: ComplianceStandard[] = [
  {
    name: "GDPR",
    description: "General Data Protection Regulation",
    status: "Compliant",
  },
  {
    name: "OWASP Top 10",
    description: "Open Web Application Security Project",
    status: "Implemented",
  },
  {
    name: "SOC 2",
    description: "Service Organization Control 2",
    status: "Aligned",
  },
  {
    name: "ISO 27001",
    description: "Information Security Management",
    status: "Aligned",
  },
];

export default function SecurityCompliance() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Security & Compliance</h1>
            <p className="text-sm text-muted-foreground">
              NeuroVitality CRM is built with security and data protection at its core.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Compliance Standards */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Compliance Standards</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Our platform is designed and operated in alignment with the following internationally recognised security and data protection standards. We continuously monitor and update our controls to maintain compliance as these standards evolve.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {complianceStandards.map((standard) => (
            <Card key={standard.name} className="text-center">
              <CardHeader className="pb-2 pt-4">
                <div className="flex justify-center mb-2">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-base">{standard.name}</CardTitle>
                <CardDescription className="text-xs">{standard.description}</CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <Badge variant="secondary" className="text-xs">{standard.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Security Controls */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Security Controls</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We employ a defence-in-depth approach, combining multiple layers of security controls to protect your data from unauthorised access, breaches, and other threats.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {securityControls.map((control) => (
            <Card key={control.title}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                    <control.icon className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-medium">{control.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{control.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Document Downloads */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Legal & Compliance Documents</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            The following documents are available for download. These are provided for your review, due diligence, and any regulatory or procurement requirements. All documents are updated regularly and the date of last revision is indicated within each document.
          </p>
        </div>
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.filename} className="transition-colors hover:bg-accent/30">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-md bg-muted shrink-0">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{doc.title}</span>
                      <Badge variant={doc.badgeVariant} className="text-xs">{doc.badge}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{doc.description}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 ml-4 gap-2"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `/${doc.filename}`;
                    link.download = doc.filename;
                    link.click();
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Contact */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Contact Our Security Team</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you have any security concerns, wish to report a vulnerability, or have questions about our compliance posture, please do not hesitate to contact us. We take all security reports seriously and will respond promptly.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Security Issues", email: "security@neurovitalityltd.com", description: "Report vulnerabilities or security concerns" },
            { label: "Privacy & GDPR", email: "privacy@neurovitalityltd.com", description: "Data subject requests and privacy queries" },
            { label: "Legal & Compliance", email: "legal@neurovitalityltd.com", description: "DPA requests, legal, and compliance queries" },
          ].map((contact) => (
            <Card key={contact.email}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{contact.label}</CardTitle>
                <CardDescription className="text-xs">{contact.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href={`mailto:${contact.email}`}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  {contact.email}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
