import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
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
import Assistant from "./pages/Assistant";
import AIAssistant from "./pages/AIAssistant";
import AmplemarketAccounts from "./pages/AmplemarketAccounts";
import AmplemarketPeople from "./pages/AmplemarketPeople";
import AccountDetail from "./pages/AccountDetail";

import BulkImport from "./pages/BulkImport";
import Automation from "./pages/Automation";
import Sequences from "./pages/Sequences";
import SequenceNew from "./pages/SequenceNew";
import CustomFields from "./pages/CustomFields";
import ActivityFeed from "./pages/ActivityFeed";
import EmailGenerator from "./pages/EmailGenerator";
import ScoringSettings from "./pages/ScoringSettings";
import DashboardLayout from "./components/DashboardLayout";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/public/e/:slug" component={PublicLeadCapture} />
      
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
      
      <Route path="/people/import">
        <DashboardLayout>
          <BulkImport />
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
            <AccountDetail />
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
          <Analytics />
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
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
