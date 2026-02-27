import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./components/theme-provider";
import Home from "./pages/Home";
import People from "./pages/People";
import PersonDetail from "./pages/PersonDetail";
import ThreadDetail from "./pages/ThreadDetail";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import PublicLeadCapture from "./pages/PublicLeadCapture";
import Integrations from "./pages/Integrations";
import SyncHistory from "./pages/SyncHistory";
import ConflictReview from "./pages/ConflictReview";
import SyncPerformance from "./pages/SyncPerformance";
import Funnel from "./pages/Funnel";
import Analytics from "./pages/Analytics";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Assistant from "./pages/Assistant";
import AIAssistant from "./pages/AIAssistant";
// Amplemarket removed per user request
import AccountDetail from "./pages/AccountDetail";
import AccountDetailPage from "./pages/AccountDetailPage";

import BulkImport from "./pages/BulkImport";
import Automation from "./pages/Automation";
import WorkflowAutomation from "./pages/WorkflowAutomation";
import RuleExecutionHistory from "./pages/RuleExecutionHistory";
import TemplatesMarketplace from "./pages/TemplatesMarketplace";
import Sequences from "./pages/Sequences";
import SequenceNew from "./pages/SequenceNew";
import SequenceGenerate from "./pages/SequenceGenerate";
import SequenceBuilderVisual from "./pages/SequenceBuilderVisual";
import SequenceAnalytics from "./pages/SequenceAnalytics";
import SequenceTemplates from "./pages/SequenceTemplates";
import CustomFields from "./pages/CustomFields";
import ActivityFeed from "./pages/ActivityFeed";
import EmailGenerator from "./pages/EmailGenerator";
import ScoringSettings from "./pages/ScoringSettings";
import Chat from "./pages/Chat";
import DashboardLayout from "./components/DashboardLayout";
import FloatingAIChat from "./components/FloatingAIChat";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import EmailAccounts from "./pages/EmailAccounts";
import Campaigns from "./pages/Campaigns";
import UserManagement from "./pages/UserManagement";
import Accounts from "./pages/Accounts";
import AccountMerge from "./pages/AccountMerge";
import AccountImport from "./pages/AccountImport";
import Settings from "./pages/Settings";
import WebhookMonitor from "./pages/WebhookMonitor";
import BookDemo from "./pages/BookDemo";
import CalendarView from "./pages/CalendarView";

import Onboarding from "./pages/Onboarding";
import WelcomeSplash from "./pages/WelcomeSplash";
import ContactMerge from "./pages/ContactMerge";
import { DealPipeline } from "./pages/DealPipeline";
import DealDetail from "./pages/DealDetail";

function Router() {
  return (
    <Switch>
      {/* Auth routes */}
      <Route path="/signup" component={Signup} />
      <Route path="/login" component={Login} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/welcome" component={WelcomeSplash} />
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
      
      {/* Protected dashboard routes */}
      <Route path="/">
        <DashboardLayout>
          <Home />
        </DashboardLayout>
      </Route>
      
      <Route path="/people">
        <DashboardLayout>
          <People />
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
      
      <Route path="/calendar">
        <DashboardLayout>
          <CalendarView />
        </DashboardLayout>
      </Route>

      <Route path="/calendar/book">
        <DashboardLayout>
          <BookDemo />
        </DashboardLayout>
      </Route>
      
      <Route path="/chat">
        <DashboardLayout>
          <Chat />
        </DashboardLayout>
      </Route>
      
      <Route path="/people/import">
        <DashboardLayout>
          <BulkImport />
        </DashboardLayout>
      </Route>
      
      <Route path="/people/merge">
        <DashboardLayout>
          <ContactMerge />
        </DashboardLayout>
      </Route>
      
      <Route path="/people/:id">
        {(params) => (
          <DashboardLayout>
            <PersonDetail personId={params.id} />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path="/threads/:id">
        {(params) => (
          <DashboardLayout>
            <ThreadDetail threadId={params.id} />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path="/events">
        <DashboardLayout>
          <Events />
        </DashboardLayout>
      </Route>
      
      <Route path="/events/:id">
        {(params) => (
          <DashboardLayout>
            <EventDetail eventId={params.id} />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path="/integrations">
        <DashboardLayout>
          <Integrations />
        </DashboardLayout>
      </Route>
      
      <Route path="/webhooks">
        <DashboardLayout>
          <WebhookMonitor />
        </DashboardLayout>
      </Route>
      
      <Route path="/sync-history">
        <DashboardLayout>
          <SyncHistory />
        </DashboardLayout>
      </Route>
      
      <Route path="/conflict-review">
        <DashboardLayout>
          <ConflictReview />
        </DashboardLayout>
      </Route>
      
      <Route path="/sync-performance">
        <DashboardLayout>
          <SyncPerformance />
        </DashboardLayout>
      </Route>
      
      {/* Amplemarket routes removed per user request */}
      
      <Route path="/accounts/:id">
        {(params) => (
          <DashboardLayout>
            <AccountDetailPage />
          </DashboardLayout>
        )}
      </Route>
      
      
      <Route path="/funnel">
        <DashboardLayout>
          <Funnel />
        </DashboardLayout>
      </Route>
      
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
      
      <Route path="/rule-execution-history">
        <DashboardLayout>
          <RuleExecutionHistory />
        </DashboardLayout>
      </Route>
      
      <Route path="/templates-marketplace">
        <DashboardLayout>
          <TemplatesMarketplace />
        </DashboardLayout>
      </Route>
      
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
      
      <Route path="/sequences/visual-builder">
        <DashboardLayout>
          <SequenceBuilderVisual />
        </DashboardLayout>
      </Route>
      
      <Route path="/sequences/analytics">
        <DashboardLayout>
          <SequenceAnalytics />
        </DashboardLayout>
      </Route>
      
      <Route path="/sequences/templates">
        <DashboardLayout>
          <SequenceTemplates />
        </DashboardLayout>
      </Route>
      
      <Route path="/sequences/:id">
        {(params) => (
          <DashboardLayout>
            <SequenceNew />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path="/custom-fields">
        <DashboardLayout>
          <CustomFields />
        </DashboardLayout>
      </Route>
      
      <Route path="/deals">
        <DashboardLayout>
          <DealPipeline />
        </DashboardLayout>
      </Route>
      
      <Route path="/deals/:id">
        {(params) => (
          <DashboardLayout>
            <DealDetail />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path="/scoring-settings">
        <DashboardLayout>
          <ScoringSettings />
        </DashboardLayout>
      </Route>
      
      <Route path="/activity">
        <DashboardLayout>
          <ActivityFeed />
        </DashboardLayout>
      </Route>
      
      <Route path="/activity-feed">
        <DashboardLayout>
          <ActivityFeed />
        </DashboardLayout>
      </Route>
      
      <Route path="/email-generator">
        <DashboardLayout>
          <EmailGenerator />
        </DashboardLayout>
      </Route>
      
      <Route path="/analytics">
        <Analytics />
      </Route>
      
      <Route path="/reports">
        <DashboardLayout>
          <Reports />
        </DashboardLayout>
      </Route>
      
      <Route path="/dashboard">
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      
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
      
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system">
        <TooltipProvider>
          <Toaster />
          <Router />
          <FloatingAIChat />
          <KeyboardShortcuts />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
