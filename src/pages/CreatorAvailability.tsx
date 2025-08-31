import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Download,
  Check,
  X,
  Info
} from "lucide-react";
import { format, parseISO, startOfDay, isSameDay } from "date-fns";

interface AvailabilityData {
  date: string;
  available: boolean;
  creator_id: string;
}

interface BookedDate {
  start_date: string;
  end_date: string;
  title: string;
}

export default function CreatorAvailability() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData[]>([]);
  const [bookedDates, setBookedDates] = useState<BookedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/creators/login");
        return;
      }
      setUser(session.user);
    };
    
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    fetchAvailabilityData();
    fetchBookedDates();
  }, [user]);

  const fetchAvailabilityData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('availabilities')
        .select('*')
        .eq('creator_id', user.id);

      if (error) throw error;
      setAvailabilityData(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load availability data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBookedDates = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          events (
            title,
            end_date,
            created_at
          )
        `)
        .eq('creator_id', user.id)
        .eq('status', 'accepted');

      if (error) throw error;

      const bookedEvents: BookedDate[] = (data || [])
        .filter(app => app.events)
        .map(app => ({
          start_date: app.events.created_at,
          end_date: app.events.end_date,
          title: app.events.title,
        }));

      setBookedDates(bookedEvents);
    } catch (error) {
      console.error('Error fetching booked dates:', error);
    }
  };

  const getDateAvailability = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const availability = availabilityData.find(a => a.date === dateStr);
    return availability?.available ?? true; // Default to available
  };

  const isDateBooked = (date: Date) => {
    return bookedDates.some(bookedDate => {
      const eventDate = new Date(bookedDate.end_date);
      return isSameDay(date, eventDate);
    });
  };

  const toggleDateAvailability = async (date: Date) => {
    if (!user || isDateBooked(date)) return;

    setSavingAvailability(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    const currentAvailability = getDateAvailability(date);
    const newAvailability = !currentAvailability;

    try {
      const { error } = await supabase
        .from('availabilities')
        .upsert({
          creator_id: user.id,
          date: dateStr,
          available: newAvailability,
        }, {
          onConflict: 'creator_id,date'
        });

      if (error) throw error;

      // Update local state
      setAvailabilityData(prev => {
        const existing = prev.find(a => a.date === dateStr);
        if (existing) {
          return prev.map(a => 
            a.date === dateStr ? { ...a, available: newAvailability } : a
          );
        } else {
          return [...prev, {
            date: dateStr,
            available: newAvailability,
            creator_id: user.id,
          }];
        }
      });

      toast({
        title: "Availability Updated",
        description: `${format(date, 'MMM dd, yyyy')} marked as ${newAvailability ? 'available' : 'unavailable'}.`,
      });

    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update availability. Please try again.",
      });
    } finally {
      setSavingAvailability(false);
    }
  };

  const exportToGoogleCalendar = () => {
    const unavailableDates = availabilityData
      .filter(a => !a.available)
      .map(a => {
        const date = new Date(a.date);
        const startDate = format(date, "yyyyMMdd");
        const endDate = format(date, "yyyyMMdd");
        return `BEGIN:VEVENT\nDTSTART:${startDate}\nDTEND:${endDate}\nSUMMARY:Unavailable\nEND:VEVENT`;
      })
      .join('\n');

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Your App//Availability Calendar//EN
${unavailableDates}
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'availability.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Calendar Exported",
      description: "Your availability calendar has been downloaded.",
    });
  };

  const getDayClassName = (date: Date) => {
    const isBooked = isDateBooked(date);
    const isAvailable = getDateAvailability(date);
    
    if (isBooked) {
      return "bg-destructive text-destructive-foreground hover:bg-destructive";
    } else if (!isAvailable) {
      return "bg-orange-500 text-white hover:bg-orange-600";
    }
    return "hover:bg-primary hover:text-primary-foreground";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/creator/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Availability Calendar</h1>
              <p className="text-muted-foreground">Manage your availability and view booked dates</p>
            </div>
          </div>
          <SecondaryButton onClick={exportToGoogleCalendar}>
            <Download className="h-4 w-4 mr-2" />
            Export Calendar
          </SecondaryButton>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <GlassCard className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Calendar
                </h2>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="text-muted-foreground">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-muted-foreground">Unavailable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-destructive rounded-full"></div>
                    <span className="text-muted-foreground">Booked</span>
                  </div>
                </div>
              </div>

              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                onDayClick={(date) => toggleDateAvailability(date)}
                disabled={(date) => date < new Date() || savingAvailability}
                className="rounded-md border-0 w-full"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-sm font-medium text-foreground",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: cn(
                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100 cursor-pointer",
                    "hover:bg-accent hover:text-accent-foreground rounded-md"
                  ),
                  day_range_end: "day-range-end",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                  day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
                modifiers={{
                  booked: (date) => isDateBooked(date),
                  unavailable: (date) => !getDateAvailability(date),
                }}
                modifiersClassNames={{
                  booked: "bg-destructive text-destructive-foreground hover:bg-destructive",
                  unavailable: "bg-orange-500 text-white hover:bg-orange-600",
                }}
              />
            </GlassCard>
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            {/* Selected Date Info */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                {selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : 'Select a Date'}
              </h3>
              
              {selectedDate && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Status:</span>
                    {isDateBooked(selectedDate) ? (
                      <Badge variant="destructive">Booked</Badge>
                    ) : getDateAvailability(selectedDate) ? (
                      <Badge className="bg-primary text-primary-foreground">Available</Badge>
                    ) : (
                      <Badge className="bg-orange-500 text-white">Unavailable</Badge>
                    )}
                  </div>

                  {!isDateBooked(selectedDate) && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Click on the calendar to toggle availability for this date.
                      </p>
                      <PrimaryButton
                        size="sm"
                        onClick={() => toggleDateAvailability(selectedDate)}
                        disabled={savingAvailability}
                        className="w-full"
                      >
                        {savingAvailability ? "Updating..." : 
                         getDateAvailability(selectedDate) ? "Mark Unavailable" : "Mark Available"}
                      </PrimaryButton>
                    </div>
                  )}

                  {isDateBooked(selectedDate) && (
                    <div className="p-3 rounded-glass bg-destructive/10 border border-destructive/20">
                      <div className="flex items-center gap-2 text-destructive mb-2">
                        <Info className="h-4 w-4" />
                        <span className="font-medium">Booked Date</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        This date is unavailable due to an accepted booking.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </GlassCard>

            {/* Upcoming Bookings */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-foreground mb-4">Upcoming Bookings</h3>
              {bookedDates.length > 0 ? (
                <div className="space-y-3">
                  {bookedDates.slice(0, 3).map((booking, index) => (
                    <div key={index} className="p-3 rounded-glass bg-background/50">
                      <p className="font-medium text-foreground">{booking.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.end_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  ))}
                  {bookedDates.length > 3 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{bookedDates.length - 3} more bookings
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No upcoming bookings</p>
              )}
            </GlassCard>

            {/* Quick Actions */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/creator/booked-events")}
                >
                  <Check className="h-4 w-4 mr-2" />
                  View Booked Events
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={exportToGoogleCalendar}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Calendar
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}