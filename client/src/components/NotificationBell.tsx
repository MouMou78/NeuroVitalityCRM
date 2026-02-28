import { useState, useEffect, useRef } from "react";
import { Bell, X, CheckCheck, ExternalLink, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation } from "wouter";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 border-red-300 text-red-800",
  high: "bg-orange-100 border-orange-300 text-orange-800",
  medium: "bg-yellow-100 border-yellow-300 text-yellow-800",
  low: "bg-blue-100 border-blue-300 text-blue-800",
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
};

function AlertIcon({ type }: { type: string }) {
  if (type === "deal_alert") return <AlertTriangle className="h-4 w-4 text-orange-500" />;
  if (type === "meeting_summary") return <Zap className="h-4 w-4 text-purple-500" />;
  return <Bell className="h-4 w-4 text-gray-500" />;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  // Poll unread count every 60 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function fetchUnreadCount() {
    try {
      const res = await fetch("/api/notifications/unread-count", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch {}
  }

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
    setLoading(false);
  }

  async function markAllRead() {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  }

  async function markRead(id: string) {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  }

  async function deleteNotif(id: string) {
    const wasUnread = notifications.find(n => n.id === id)?.read === false;
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  }

  function handleOpen() {
    setOpen(prev => {
      if (!prev) fetchNotifications();
      return !prev;
    });
  }

  function handleNotifClick(notif: Notification) {
    if (!notif.read) markRead(notif.id);
    if (notif.actionUrl) {
      const path = notif.actionUrl.replace(window.location.origin, "");
      setLocation(path);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={handleOpen}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[360px] sm:w-[400px] rounded-xl border bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-600" />
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllRead}>
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Notification list */}
          <ScrollArea className="max-h-[480px]">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">Deal alerts will appear here automatically</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`group relative flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${!notif.read ? "bg-blue-50/40" : ""}`}
                    onClick={() => handleNotifClick(notif)}
                  >
                    {/* Unread dot */}
                    {!notif.read && (
                      <div className={`absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[notif.severity] || "bg-blue-500"}`} />
                    )}

                    {/* Icon */}
                    <div className="mt-0.5 flex-shrink-0">
                      <AlertIcon type={notif.type} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium leading-snug ${!notif.read ? "text-gray-900" : "text-gray-700"}`}>
                          {notif.title}
                        </p>
                        <button
                          className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-opacity"
                          onClick={e => { e.stopPropagation(); deleteNotif(notif.id); }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      {notif.entityName && (
                        <p className="text-xs text-gray-500 mt-0.5">{notif.entityName}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.body}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${SEVERITY_COLORS[notif.severity] || "bg-gray-100 border-gray-200 text-gray-600"}`}>
                          {notif.severity}
                        </span>
                        <span className="text-[10px] text-gray-400">{timeAgo(notif.createdAt)}</span>
                        {notif.actionUrl && (
                          <ExternalLink className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="border-t px-4 py-2.5 flex items-center justify-between">
            <button
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              onClick={() => { setLocation("/admin/notification-preferences"); setOpen(false); }}
            >
              Notification preferences
            </button>
            <button
              className="text-xs text-gray-500 hover:text-gray-700"
              onClick={() => { setLocation("/deal-intelligence"); setOpen(false); }}
            >
              View all alerts →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
