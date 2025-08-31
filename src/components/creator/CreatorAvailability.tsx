import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/ui/glass-card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Check, X } from "lucide-react";
import { format, isSameDay } from "date-fns";

interface AvailabilityData {
  date: string;
  available: boolean;
}

export default function CreatorAvailability() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availability, setAvailability] = useState<AvailabilityData[]>([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAvailability();
    }
  }, [user]);

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('availabilities')
        .select('date, available')
        .eq('creator_id', user.id)
        .order('date');

      if (error) throw error;

      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load availability data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (date: Date) => {
    if (!user) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    const existingEntry = availability.find(a => a.date === dateStr);
    const newAvailability = !existingEntry?.available;

    try {
      if (existingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('availabilities')
          .update({ available: newAvailability })
          .eq('creator_id', user.id)
          .eq('date', dateStr);

        if (error) throw error;
      } else {
        // Insert new entry
        const { error } = await supabase
          .from('availabilities')
          .insert({
            creator_id: user.id,
            date: dateStr,
            available: newAvailability
          });

        if (error) throw error;
      }

      // Update local state
      setAvailability(prev => {
        const updated = [...prev];
        const index = updated.findIndex(a => a.date === dateStr);
        
        if (index >= 0) {
          updated[index] = { date: dateStr, available: newAvailability };
        } else {
          updated.push({ date: dateStr, available: newAvailability });
        }
        
        return updated.sort((a, b) => a.date.localeCompare(b.date));
      });

      toast({
        title: "Availability Updated",
        description: `You are now ${newAvailability ? 'available' : 'unavailable'} on ${format(date, 'MMM dd, yyyy')}`,
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update availability. Please try again.",
      });
    }
  };

  const getDateAvailability = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availability.find(a => a.date === dateStr);
  };

  const isDateAvailable = (date: Date) => {
    const entry = getDateAvailability(date);
    return entry?.available ?? true; // Default to available if not set
  };

  const getDayClassName = (date: Date) => {
    const entry = getDateAvailability(date);
    if (!entry) return "";
    
    return entry.available 
      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" 
      : "bg-red-500/20 text-red-400 hover:bg-red-500/30";
  };

  const upcomingDates = availability
    .filter(a => new Date(a.date) >= new Date())
    .slice(0, 10);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-foreground">Loading availability...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <GlassCard className="lg:col-span-2 rounded-glass bg-card/50 backdrop-blur-glass border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Set Your Availability
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            Click on any date to toggle your availability. Green = Available, Red = Unavailable
          </p>
          
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              onDayClick={toggleAvailability}
              className="rounded-md border-0"
              classNames={{
                day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100 cursor-pointer transition-colors",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              }}
              modifiers={{
                available: (date) => isDateAvailable(date) && getDateAvailability(date) !== undefined,
                unavailable: (date) => !isDateAvailable(date) && getDateAvailability(date) !== undefined,
              }}
              modifiersClassNames={{
                available: "bg-green-500/20 text-green-400 hover:bg-green-500/30",
                unavailable: "bg-red-500/20 text-red-400 hover:bg-red-500/30",
              }}
            />
          </div>
        </GlassCard>

        {/* Availability Summary */}
        <GlassCard className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Availability Summary</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/50"></div>
              <span className="text-sm text-foreground">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/50"></div>
              <span className="text-sm text-foreground">Unavailable</span>
            </div>
          </div>

          {selectedDate && (
            <div className="mt-6 p-4 rounded-glass bg-background/50">
              <h4 className="font-medium text-foreground mb-2">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </h4>
              <div className="flex items-center gap-2">
                {isDateAvailable(selectedDate) ? (
                  <>
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-green-400 text-sm">Available</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 text-sm">Unavailable</span>
                  </>
                )}
              </div>
              <Button
                className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => toggleAvailability(selectedDate)}
              >
                Mark as {isDateAvailable(selectedDate) ? 'Unavailable' : 'Available'}
              </Button>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Upcoming Availability */}
      <GlassCard className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Upcoming Availability</h3>
        
        {upcomingDates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {upcomingDates.map((entry) => (
              <div key={entry.date} className="p-3 rounded-glass bg-background/50 text-center">
                <p className="text-sm font-medium text-foreground">
                  {format(new Date(entry.date), "MMM dd")}
                </p>
                <Badge 
                  variant={entry.available ? "secondary" : "destructive"}
                  className={entry.available ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}
                >
                  {entry.available ? "Available" : "Unavailable"}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No availability set for upcoming dates</p>
            <p className="text-muted-foreground text-sm">Click on calendar dates to set your availability</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}