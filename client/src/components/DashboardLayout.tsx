import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { Home, LogOut, PanelLeft, Users, Calendar, CalendarDays, Settings, BarChart3, TrendingUp, Sparkles, Building2, UserCircle, Zap, Mail, Sliders, Activity, Wand2, ChevronDown, Target, Send, LineChart, MessageSquare, Bell, Workflow, History, Store, Moon, Sun, Monitor, Brain, BookOpen, Shield, Video, Cpu, ListChecks, Flame, Ban, ScrollText } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { NotificationBell } from './NotificationBell';
import { useTheme } from "./theme-provider";
import { GlobalSearch } from './GlobalSearch';

const menuItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Users, label: "People", path: "/people" },
  { icon: Building2, label: "Accounts", path: "/accounts" },
  { icon: MessageSquare, label: "Team Chat", path: "/chat" },
  { icon: CalendarDays, label: "Calendar", path: "/calendar" },
  { icon: Calendar, label: "Events", path: "/events" },
  { icon: Video, label: "Meeting Co-pilot", path: "/meetings" },
  { icon: Sparkles, label: "AI Assistant", path: "/ai-assistant" },
];

const engagementItems: typeof menuItems = [
  // All engagement features removed - not available in white-label template
  // { icon: Mail, label: "Sequences", path: "/sequences" },
  // { icon: Wand2, label: "Email Generator", path: "/email-generator" },
  // { icon: Zap, label: "Automation", path: "/automation" },
  // { icon: Workflow, label: "Workflow Automation", path: "/workflow-automation" },
  // { icon: Store, label: "Templates Marketplace", path: "/templates-marketplace" },
  // { icon: History, label: "Execution History", path: "/rule-execution-history" },
];

const engineItems = [
  { icon: Workflow, label: "Workflows", path: "/engine/workflows" },
  { icon: ListChecks, label: "Enrollments", path: "/engine/enrollments" },
  { icon: Flame, label: "Lead Scoring", path: "/engine/scoring" },
  { icon: Ban, label: "Suppression", path: "/engine/suppression" },
  { icon: ScrollText, label: "Event Log", path: "/engine/events" },
];

const insightsItems = [
  { icon: BarChart3, label: "Funnel", path: "/funnel" },
  { icon: TrendingUp, label: "Analytics", path: "/analytics" },
  { icon: Activity, label: "Activity Feed", path: "/activity" },
];

const settingsItems = [
  { icon: Zap, label: "Integrations", path: "/integrations" },
  { icon: Target, label: "Lead Scoring", path: "/scoring-settings" },
  { icon: Users, label: "Team & Users", path: "/admin/users" },
  { icon: Brain, label: "AI Memory", path: "/admin/ai-memory", engineeringOnly: true },
  { icon: BookOpen, label: "Knowledge Vault", path: "/admin/knowledge-vault", engineeringOnly: true },
  { icon: Shield, label: "Deal Intelligence", path: "/admin/deal-intelligence" },
  { icon: Bell, label: "Notification Preferences", path: "/admin/notification-preferences" },
  { icon: Settings, label: "Security & Preferences", path: "/settings" },
];

// Amplemarket removed per user request

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // Skip onboarding check - allow direct access
  useEffect(() => {
    // Onboarding disabled - users go straight to dashboard
    localStorage.setItem("onboarding_completed", "true");
  }, []);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    window.location.href = '/login';
    return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth} searchOpen={searchOpen} setSearchOpen={setSearchOpen}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        if (theme === "light") {
          setTheme("dark");
        } else if (theme === "dark") {
          setTheme("system");
        } else {
          setTheme("light");
        }
      }}
      className="h-9 w-9"
    >
      {theme === "light" && <Sun className="h-4 w-4" />}
      {theme === "dark" && <Moon className="h-4 w-4" />}
      {theme === "system" && <Monitor className="h-4 w-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
};

function DashboardLayoutContent({
  searchOpen,
  setSearchOpen,
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  // Logo error state removed - using simple text logo
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  // React-controlled accordion state for Insights, Settings, and Engine
  const insightsActive = insightsItems.some(i => location === i.path);
  const settingsActive = settingsItems.some(i => location === i.path);
  const engineActive = engineItems.some(i => location.startsWith(i.path));
  const [insightsOpen, setInsightsOpen] = useState(() => insightsItems.some(i => location === i.path));
  const [settingsOpen, setSettingsOpen] = useState(() => settingsItems.some(i => location === i.path));
  const [engineOpen, setEngineOpen] = useState(() => engineItems.some(i => location.startsWith(i.path)));

  // Auto-expand accordion when navigating into a sub-route
  useEffect(() => { if (insightsActive) setInsightsOpen(true); }, [location]);
  useEffect(() => { if (settingsActive) setSettingsOpen(true); }, [location]);
  useEffect(() => { if (engineActive) setEngineOpen(true); }, [location]);

  // Global search keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center justify-center min-w-0 flex-1">
                  <img 
                    src="/neurovitality-logo.png" 
                    alt="NeuroVitality" 
                    className="h-8 w-auto object-contain"
                  />
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => { setLocation(item.path); setOpenMobile(false); }}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              
              {/* Engagement section removed - no items available */}

              {/* Insights Submenu */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setInsightsOpen(o => !o)}
                  tooltip="Insights"
                  className="h-10 font-normal"
                >
                  <LineChart className="h-4 w-4" />
                  <span className="flex-1">Insights</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${insightsOpen ? "rotate-180" : ""}`} />
                </SidebarMenuButton>
                {insightsOpen && (
                  <SidebarMenuSub className="ml-4 mt-1">
                    {insightsItems.map(item => {
                      const isActive = location === item.path;
                      return (
                        <SidebarMenuSubItem key={item.path}>
                          <SidebarMenuSubButton
                            isActive={isActive}
                            onClick={() => { setLocation(item.path); setOpenMobile(false); }}
                            className="h-9"
                          >
                            <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                            <span>{item.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
              {/* Amplemarket removed per user request */}

              {/* Engine Submenu */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setEngineOpen(o => !o)}
                  tooltip="Engine"
                  className="h-10 font-normal"
                >
                  <Cpu className="h-4 w-4" />
                  <span className="flex-1">Engine</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${engineOpen ? "rotate-180" : ""}`} />
                </SidebarMenuButton>
                {engineOpen && (
                  <SidebarMenuSub className="ml-4 mt-1">
                    {engineItems.map(item => {
                      const isActive = location.startsWith(item.path);
                      return (
                        <SidebarMenuSubItem key={item.path}>
                          <SidebarMenuSubButton
                            isActive={isActive}
                            onClick={() => { setLocation(item.path); setOpenMobile(false); }}
                            className="h-9"
                          >
                            <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                            <span>{item.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* Settings Submenu */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setSettingsOpen(o => !o)}
                  tooltip="Settings"
                  className="h-10 font-normal"
                >
                  <Settings className="h-4 w-4" />
                  <span className="flex-1">Settings</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`} />
                </SidebarMenuButton>
                {settingsOpen && (
                  <SidebarMenuSub className="ml-4 mt-1">
                    {settingsItems
                      .filter(item => !(item as any).engineeringOnly || user?.role === 'engineering')
                      .map(item => {
                        const isActive = location === item.path;
                        return (
                          <SidebarMenuSubItem key={item.path}>
                            <SidebarMenuSubButton
                              isActive={isActive}
                              onClick={() => { setLocation(item.path); setOpenMobile(false); }}
                              className="h-9"
                            >
                              <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                              <span>{item.label}</span>
                              {(item as any).engineeringOnly && (
                                <span className="ml-auto text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium">ENG</span>
                              )}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Mobile header */}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell />
            </div>
          </div>
        )}
        {/* Desktop header */}
        {!isMobile && (
          <div className="flex border-b h-14 items-center justify-end bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell />
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
