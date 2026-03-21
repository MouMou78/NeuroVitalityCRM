import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./components/theme-provider";
import DashboardLayout from "./components/DashboardLayout";
import FloatingAIChat from "./components/FloatingAIChat";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";

// Routes where the AI assistant should NOT appear (unauthenticated/public pages)
const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password", "/onboarding"];

function AuthenticatedExtras() {
  const [location] = useLocation();
  const isPublicRoute = PUBLIC_ROUTES.includes(location) || location.startsWith("/public/");
  if (isPublicRoute) return null;
  return (
    <>
      <FloatingAIChat />
      <KeyboardShortcuts />
    </>
  );
}

// Loading component for lazy-loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Lazy load all page components
const Home = lazy(() => import("./pages/Home"));
const People = lazy(() => import("./pages/People"));
const PersonDetail = lazy(() => import("./pages/PersonDetail"));
const ThreadDetail = lazy(() => import("./pages/ThreadDetail"));
const Events = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const PublicLeadCapture = lazy(() => import("./pages/PublicLeadCapture"));
const Integrations = lazy(() => import("./pages/Integrations"));
const SyncHistory = lazy(() => import("./pages/SyncHistory"));
const ConflictReview = lazy(() => import("./pages/ConflictReview"));
const SyncPerformance = lazy(() => import("./pages/SyncPerformance"));
const Funnel = lazy(() => import("./pages/Funnel"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Reports = lazy(() => import("./pages/Reports"));
const Assistant = lazy(() => import("./pages/Assistant"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const AmplemarketAccounts = lazy(() => import("./pages/AmplemarketAccounts"));
const AmplemarketPeople = lazy(() => import("./pages/AmplemarketPeople"));
const AmplemarketLeads = lazy(() => import("./pages/AmplemarketLeads"));
const AmplemarketSync = lazy(() => import("./pages/AmplemarketSync").then(m => ({ default: m.AmplemarketSync })));
const AccountDetail = lazy(() => import("./pages/AccountDetail"));
const AccountDetailPage = lazy(() => import("./pages/AccountDetailPage"));
const AccountMerge = lazy(() => import("./pages/AccountMerge"));
const AccountImport = lazy(() => import("./pages/AccountImport"));
const BulkImport = lazy(() => import("./pages/BulkImport"));
const Automation = lazy(() => import("./pages/Automation"));
const WorkflowAutomation = lazy(() => import("./pages/WorkflowAutomation"));
const RuleExecutionHistory = lazy(() => import("./pages/RuleExecutionHistory"));
const TemplatesMarketplace = lazy(() => import("./pages/TemplatesMarketplace"));
const Sequences = lazy(() => import("./pages/Sequences"));
const SequenceNew = lazy(() => import("./pages/SequenceNew"));
const SequenceGenerate = lazy(() => import("./pages/SequenceGenerate"));
const SequenceBuilderVisual = lazy(() => import("./pages/SequenceBuilderVisual"));
const SequenceAnalytics = lazy(() => import("./pages/SequenceAnalytics"));
const SequenceTemplates = lazy(() => import("./pages/SequenceTemplates"));
const CustomFields = lazy(() => import("./pages/CustomFields"));
const ActivityFeed = lazy(() => import("./pages/ActivityFeed"));
const EmailGenerator = lazy(() => import("./pages/EmailGenerator"));
const ScoringSettings = lazy(() => import("./pages/ScoringSettings"));
const Chat = lazy(() => import("./pages/Chat"));
const BookDemo = lazy(() => import("./pages/BookDemo"));
const Signup = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const EmailAccounts = lazy(() => import("./pages/EmailAccounts"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const RoleManagement = lazy(() => import("./pages/RoleManagement"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Settings = lazy(() => import("./pages/Settings"));
const WebhookMonitor = lazy(() => import("./pages/WebhookMonitor"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const ContactMerge = lazy(() => import("./pages/ContactMerge"));
const DealPipeline = lazy(() => import("./pages/DealPipeline").then(m => ({ default: m.DealPipeline })));
const DealDetail = lazy(() => import("./pages/DealDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Auth routes */}
        <Route path="/signup" component={Signup} />
        <Route path="/login" component={Login} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/settings" component={Settings} />
        <Route path="/reset-password" component={ResetPassword} />
        
        {/* Public routes */}
        <Route path="/public/e/:slug" component={PublicLeadCapture} />
        
        {/* Settings routes */}
        <Route path="/settings/email-accounts">
          <DashboardLayout>
            <EmailAccounts />
          </DashboardLayout>
        </Route>

        <Route path="/campaigns">
          <DashboardLayout>
            <Campaigns />
          </DashboardLayout>
        </Route>
        <Route path="/admin/users">
          <DashboardLayout>
            <UserManagement />
          </DashboardLayout>
        </Route>
        <Route path="/admin/roles">
          <DashboardLayout>
            <RoleManagement />
          </DashboardLayout>
        </Route>
        <Route path="/accounts">
          <DashboardLayout>
            <Accounts />
          </DashboardLayout>
        </Route>
        <Route path="/accounts/merge">
          <DashboardLayout>
            <AccountMerge />
          </DashboardLayout>
        </Route>
        <Route path="/accounts/import">
          <DashboardLayout>
            <AccountImport />
          </DashboardLayout>
        </Route>
        <Route path="/accounts/:id">
          <DashboardLayout>
            <AccountDetailPage />
          </DashboardLayout>
        </Route>
        <Route path="/webhooks">
          <DashboardLayout>
            <WebhookMonitor />
          </DashboardLayout>
        </Route>

        {/* Integrations routes */}
        <Route path="/integrations">
          <DashboardLayout>
            <Integrations />
          </DashboardLayout>
        </Route>
        <Route path="/integrations/sync-history">
          <DashboardLayout>
            <SyncHistory />
          </DashboardLayout>
        </Route>
        <Route path="/integrations/conflict-review">
          <DashboardLayout>
            <ConflictReview />
          </DashboardLayout>
        </Route>
        <Route path="/integrations/sync-performance">
          <DashboardLayout>
            <SyncPerformance />
          </DashboardLayout>
        </Route>

        {/* Amplemarket routes */}
        <Route path="/amplemarket">
          <DashboardLayout>
            <AmplemarketSync />
          </DashboardLayout>
        </Route>
        <Route path="/amplemarket/accounts">
          <DashboardLayout>
            <AmplemarketAccounts />
          </DashboardLayout>
        </Route>
        <Route path="/amplemarket/people">
          <DashboardLayout>
            <AmplemarketPeople />
          </DashboardLayout>
        </Route>
        <Route path="/amplemarket/leads">
          <DashboardLayout>
            <AmplemarketLeads />
          </DashboardLayout>
        </Route>

        {/* Analytics routes */}
        <Route path="/funnel">
          <DashboardLayout>
            <Funnel />
          </DashboardLayout>
        </Route>
        <Route path="/analytics">
          <DashboardLayout>
            <Analytics />
          </DashboardLayout>
        </Route>
        <Route path="/reports">
          <DashboardLayout>
            <Reports />
          </DashboardLayout>
        </Route>
        <Route path="/activity">
          <DashboardLayout>
            <ActivityFeed />
          </DashboardLayout>
        </Route>

        {/* Automation routes */}
        <Route path="/automation">
          <DashboardLayout>
            <Automation />
          </DashboardLayout>
        </Route>
        <Route path="/workflow-automation">
          <DashboardLayout>
            <WorkflowAutomation />
          </DashboardLayout>
        </Route>
        <Route path="/automation/history">
          <DashboardLayout>
            <RuleExecutionHistory />
          </DashboardLayout>
        </Route>
        <Route path="/templates">
          <DashboardLayout>
            <TemplatesMarketplace />
          </DashboardLayout>
        </Route>

        {/* Sequence routes */}
        <Route path="/sequences">
          <DashboardLayout>
            <Sequences />
          </DashboardLayout>
        </Route>
        <Route path="/sequences/new">
          <DashboardLayout>
            <SequenceNew />
          </DashboardLayout>
        </Route>
        <Route path="/sequences/generate">
          <DashboardLayout>
            <SequenceGenerate />
          </DashboardLayout>
        </Route>
        <Route path="/sequences/:id/builder">
          <DashboardLayout>
            <SequenceBuilderVisual />
          </DashboardLayout>
        </Route>
        <Route path="/sequences/:id/analytics">
          <DashboardLayout>
            <SequenceAnalytics />
          </DashboardLayout>
        </Route>
        <Route path="/sequences/templates">
          <DashboardLayout>
            <SequenceTemplates />
          </DashboardLayout>
        </Route>

        {/* Custom fields */}
        <Route path="/custom-fields">
          <DashboardLayout>
            <CustomFields />
          </DashboardLayout>
        </Route>

        {/* Email generator */}
        <Route path="/email-generator">
          <DashboardLayout>
            <EmailGenerator />
          </DashboardLayout>
        </Route>

        {/* Scoring settings */}
        <Route path="/scoring-settings">
          <DashboardLayout>
            <ScoringSettings />
          </DashboardLayout>
        </Route>

        {/* Chat */}
        <Route path="/chat">
          <DashboardLayout>
            <Chat />
          </DashboardLayout>
        </Route>

        {/* Book Demo */}
        <Route path="/calendar/book">
          <DashboardLayout>
            <BookDemo />
          </DashboardLayout>
        </Route>

        {/* People routes */}
        <Route path="/people">
          <DashboardLayout>
            <People />
          </DashboardLayout>
        </Route>
        <Route path="/people/merge">
          <DashboardLayout>
            <ContactMerge />
          </DashboardLayout>
        </Route>
        <Route path="/people/import">
          <DashboardLayout>
            <BulkImport />
          </DashboardLayout>
        </Route>
        <Route path="/people/:id">
          <DashboardLayout>
            <PersonDetail />
          </DashboardLayout>
        </Route>
        <Route path="/people/:id/thread/:threadId">
          <DashboardLayout>
            <ThreadDetail />
          </DashboardLayout>
        </Route>

        {/* Events routes */}
        <Route path="/events">
          <DashboardLayout>
            <Events />
          </DashboardLayout>
        </Route>
        <Route path="/events/:id">
          <DashboardLayout>
            <EventDetail />
          </DashboardLayout>
        </Route>

        {/* Deal routes */}
        <Route path="/deals">
          <DashboardLayout>
            <DealPipeline />
          </DashboardLayout>
        </Route>
        <Route path="/deals/:id">
          <DashboardLayout>
            <DealDetail />
          </DashboardLayout>
        </Route>

        {/* AI Assistant routes */}
        <Route path="/assistant">
          <DashboardLayout>
            <Assistant />
          </DashboardLayout>
        </Route>
        <Route path="/ai-assistant">
          <DashboardLayout>
            <AIAssistant />
          </DashboardLayout>
        </Route>

        {/* Dashboard/Home */}
        <Route path="/">
          <DashboardLayout>
            <Home />
          </DashboardLayout>
        </Route>

        {/* 404 */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="neurovitality-crm-theme">
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <Router />
          <AuthenticatedExtras />
        </ErrorBoundary>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
