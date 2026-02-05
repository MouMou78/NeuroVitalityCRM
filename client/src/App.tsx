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
import Funnel from "./pages/Funnel";
import Analytics from "./pages/Analytics";
import Dashboard from "./pages/Dashboard";
import Assistant from "./pages/Assistant";
import AIAssistant from "./pages/AIAssistant";
import AmplemarketAccounts from "./pages/AmplemarketAccounts";
import AmplemarketPeople from "./pages/AmplemarketPeople";
import AccountDetail from "./pages/AccountDetail";
import AccountDetailPage from "./pages/AccountDetailPage";

import BulkImport from "./pages/BulkImport";
import Automation from "./pages/Automation";
import Sequences from "./pages/Sequences";
import SequenceNew from "./pages/SequenceNew";
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
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
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
      
      <Route path="/email-generator">
        <DashboardLayout>
          <EmailGenerator />
        </DashboardLayout>
      </Route>
      
      <Route path="/analytics">
        <DashboardLayout>
          <Dashboard />
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
