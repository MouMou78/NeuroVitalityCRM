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
      
      <Route path="/assistant">
        <DashboardLayout>
          <Assistant />
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
