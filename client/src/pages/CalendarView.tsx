import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  isWeekend,
  parseISO,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  Video,
  User,
  Users,
  Plus,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  salesManagerId: string;
  bookedByUserId: string;
  title: string;
  description?: string | null;
  startTime: string | Date;
  endTime: string | Date;
  meetLink: string;
  status: "scheduled" | "completed" | "cancelled";
}

interface TimeSlot {
  time: string;
  available: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-gray-400",
};

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  scheduled: "default",
  completed: "secondary",
  cancelled: "destructive",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateTimeSlots(
  date: Date,
  bookings: Booking[],
  managerId: string
): TimeSlot[] {
  const SLOT_INTERVAL = 35; // 30 min meeting + 5 min buffer
  const slots: TimeSlot[] = [];

  for (let hour = 9; hour < 17; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_INTERVAL) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + 30);

      const managerBookings = bookings.filter(
        (b) => b.salesManagerId === managerId && b.status === "scheduled"
      );

      const hasConflict = managerBookings.some((b) => {
        const bStart = new Date(b.startTime);
        const bEnd = new Date(b.endTime);
        return (
          (slotStart >= bStart && slotStart < bEnd) ||
          (slotEnd > bStart && slotEnd <= bEnd) ||
          (slotStart <= bStart && slotEnd >= bEnd)
        );
      });

      const timeString = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
      slots.push({ time: timeString, available: !hasConflict });
    }
  }

  return slots;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BookingChip({
  booking,
  users,
  onClick,
}: {
  booking: Booking;
  users: any[];
  onClick: () => void;
}) {
  const manager = users.find((u) => u.id === booking.salesManagerId);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "w-full text-left text-xs text-white rounded px-1.5 py-0.5 truncate mb-0.5",
        STATUS_COLORS[booking.status] ?? "bg-blue-500",
        booking.status === "cancelled" && "line-through opacity-60"
      )}
      title={`${booking.title} — ${manager?.name ?? "Unknown"}`}
    >
      {format(new Date(booking.startTime), "HH:mm")} {booking.title}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Booking form state
  const [bookingManagerId, setBookingManagerId] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingTitle, setBookingTitle] = useState("Meeting");
  const [bookingDescription, setBookingDescription] = useState("");

  // Date range for the current month view (includes leading/trailing days)
  const rangeStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });

  // Fetch all users and bookings
  const { data: allUsers = [] } = trpc.calendar.listAllUsers.useQuery();
  const { data: bookings = [], refetch: refetchBookings } =
    trpc.calendar.getBookingsForRange.useQuery({
      startDate: rangeStart.toISOString(),
      endDate: addDays(rangeEnd, 1).toISOString(),
      userId: selectedUserId === "all" ? undefined : selectedUserId,
    });

  // Availability slots for the selected date + manager when booking
  const { data: availability } = trpc.calendar.getAvailability.useQuery(
    {
      salesManagerId: bookingManagerId,
      date: selectedDate?.toISOString().split("T")[0] ?? "",
    },
    { enabled: !!bookingManagerId && !!selectedDate && bookingModalOpen }
  );

  const cancelBooking = trpc.calendar.cancelBooking.useMutation({
    onSuccess: () => {
      toast.success("Booking cancelled.");
      refetchBookings();
      setDetailModalOpen(false);
    },
    onError: () => toast.error("Failed to cancel booking."),
  });

  const bookMeeting = trpc.calendar.bookDemo.useMutation({
    onSuccess: (data) => {
      toast.success(`Meeting booked! Meet link: ${data.meetLink}`);
      refetchBookings();
      setBookingModalOpen(false);
      resetBookingForm();
    },
    onError: (err) => toast.error(`Booking failed: ${err.message}`),
  });

  function resetBookingForm() {
    setBookingManagerId("");
    setBookingTime("");
    setBookingTitle("Meeting");
    setBookingDescription("");
  }

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    let day = rangeStart;
    while (day <= rangeEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [rangeStart, rangeEnd]);

  // Group bookings by date key
  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    (bookings as Booking[]).forEach((b) => {
      const key = format(new Date(b.startTime), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [bookings]);

  function handleDayClick(day: Date) {
    if (isWeekend(day)) return;
    setSelectedDate(day);
    setBookingModalOpen(true);
  }

  function handleBookingClick(booking: Booking) {
    setSelectedBooking(booking);
    setDetailModalOpen(true);
  }

  function handleConfirmBooking() {
    if (!selectedDate || !bookingManagerId || !bookingTime || !bookingTitle) {
      toast.error("Please fill in all required fields.");
      return;
    }
    bookMeeting.mutate({
      salesManagerId: bookingManagerId,
      date: selectedDate.toISOString().split("T")[0],
      time: bookingTime,
      title: bookingTitle,
      description: bookingDescription || undefined,
    });
  }

  const slots = useMemo(() => {
    if (!selectedDate || !bookingManagerId) return [];
    return generateTimeSlots(selectedDate, bookings as Booking[], bookingManagerId);
  }, [selectedDate, bookingManagerId, bookings]);

  const selectedManager = allUsers.find((u: any) => u.id === bookingManagerId);
  const detailManager = allUsers.find(
    (u: any) => u.id === selectedBooking?.salesManagerId
  );
  const detailBooker = allUsers.find(
    (u: any) => u.id === selectedBooking?.bookedByUserId
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            View team availability and book meetings
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedDate(new Date());
            setBookingModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Book Meeting
        </Button>
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-lg font-semibold min-w-[160px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
        </div>

        {/* User filter */}
        <div className="flex items-center gap-2 ml-auto">
          <Users className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All team members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All team members</SelectItem>
              {allUsers.map((u: any) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
          Scheduled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />
          Cancelled
        </span>
        <span className="ml-4 text-muted-foreground">
          Click any weekday to book a meeting
        </span>
      </div>

      {/* ── Calendar Grid ── */}
      <Card>
        <CardContent className="p-0">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div
                key={d}
                className="py-2 text-center text-xs font-semibold text-muted-foreground border-r last:border-r-0"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const key = format(day, "yyyy-MM-dd");
              const dayBookings = bookingsByDate[key] ?? [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const weekend = isWeekend(day);
              const today = isToday(day);

              return (
                <div
                  key={key}
                  onClick={() => !weekend && handleDayClick(day)}
                  className={cn(
                    "min-h-[110px] p-1.5 border-r border-b last:border-r-0 transition-colors",
                    !isCurrentMonth && "bg-muted/30",
                    weekend && "bg-muted/20 cursor-not-allowed",
                    !weekend && isCurrentMonth && "cursor-pointer hover:bg-accent/50",
                    idx % 7 === 6 && "border-r-0"
                  )}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                        !isCurrentMonth && "text-muted-foreground",
                        today && "bg-primary text-primary-foreground",
                        !today && isCurrentMonth && !weekend && "text-foreground",
                        weekend && "text-muted-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {dayBookings.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {dayBookings.length}
                      </span>
                    )}
                  </div>

                  {/* Booking chips — show up to 3, then overflow */}
                  <div className="space-y-0.5">
                    {dayBookings.slice(0, 3).map((b) => (
                      <BookingChip
                        key={b.id}
                        booking={b}
                        users={allUsers}
                        onClick={() => handleBookingClick(b)}
                      />
                    ))}
                    {dayBookings.length > 3 && (
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground w-full text-left pl-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Show all by clicking the first hidden one
                          handleBookingClick(dayBookings[3]);
                        }}
                      >
                        +{dayBookings.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Book Meeting Modal ── */}
      <Dialog open={bookingModalOpen} onOpenChange={(open) => {
        setBookingModalOpen(open);
        if (!open) resetBookingForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Book a Meeting
              {selectedDate && (
                <span className="text-muted-foreground font-normal text-base ml-1">
                  — {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Select a team member, choose an available time slot, and confirm the booking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Meeting title */}
            <div className="space-y-1.5">
              <Label htmlFor="meeting-title">Meeting Title *</Label>
              <Input
                id="meeting-title"
                value={bookingTitle}
                onChange={(e) => setBookingTitle(e.target.value)}
                placeholder="e.g. Discovery Call, Demo, Check-in"
              />
            </div>

            {/* Select team member */}
            <div className="space-y-1.5">
              <Label>Team Member *</Label>
              <Select value={bookingManagerId} onValueChange={(v) => {
                setBookingManagerId(v);
                setBookingTime("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose who to meet with" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      <span className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5" />
                        {u.name || u.email}
                        <span className="text-xs text-muted-foreground capitalize">
                          ({u.role})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time slots */}
            {bookingManagerId && selectedDate && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Available Time Slots (30 min + 5 min buffer)
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {(availability?.slots ?? slots).map((slot) => (
                    <Button
                      key={slot.time}
                      variant={bookingTime === slot.time ? "default" : "outline"}
                      size="sm"
                      disabled={!slot.available}
                      onClick={() => setBookingTime(slot.time)}
                      className={cn(
                        "text-xs",
                        !slot.available && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      {slot.time}
                      {!slot.available && (
                        <X className="w-3 h-3 ml-1 text-destructive" />
                      )}
                    </Button>
                  ))}
                </div>
                {(availability?.slots ?? slots).every((s) => !s.available) && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No available slots on this day for the selected team member.
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="meeting-desc">Notes / Agenda (optional)</Label>
              <Textarea
                id="meeting-desc"
                value={bookingDescription}
                onChange={(e) => setBookingDescription(e.target.value)}
                placeholder="Add topics to discuss, context, or any relevant notes..."
                rows={3}
              />
            </div>

            {/* Summary */}
            {bookingManagerId && selectedDate && bookingTime && (
              <Card className="border-primary bg-primary/5">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Booking Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">With</span>
                    <span className="font-medium">
                      {selectedManager?.name ?? selectedManager?.email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">
                      {format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium">{bookingTime} (30 minutes)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Meet link</span>
                    <span className="text-muted-foreground text-xs">
                      Generated on confirmation
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBooking}
              disabled={
                !bookingManagerId ||
                !bookingTime ||
                !bookingTitle ||
                bookMeeting.isPending
              }
            >
              {bookMeeting.isPending ? "Booking..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Booking Detail Modal ── */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              {selectedBooking?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedBooking &&
                format(new Date(selectedBooking.startTime), "EEEE, MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Time</p>
                  <p className="font-medium">
                    {format(new Date(selectedBooking.startTime), "HH:mm")} –{" "}
                    {format(new Date(selectedBooking.endTime), "HH:mm")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Status</p>
                  <Badge variant={STATUS_BADGE[selectedBooking.status]}>
                    {selectedBooking.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">With</p>
                  <p className="font-medium">
                    {detailManager?.name ?? detailManager?.email ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Booked by</p>
                  <p className="font-medium">
                    {detailBooker?.name ?? detailBooker?.email ?? "—"}
                  </p>
                </div>
              </div>

              {selectedBooking.description && (
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Notes</p>
                  <p className="text-sm">{selectedBooking.description}</p>
                </div>
              )}

              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Google Meet</p>
                <a
                  href={selectedBooking.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline underline-offset-2 break-all"
                >
                  {selectedBooking.meetLink}
                </a>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
              Close
            </Button>
            {selectedBooking?.status === "scheduled" && (
              <Button
                variant="destructive"
                onClick={() =>
                  cancelBooking.mutate({ bookingId: selectedBooking.id })
                }
                disabled={cancelBooking.isPending}
              >
                {cancelBooking.isPending ? "Cancelling..." : "Cancel Meeting"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
