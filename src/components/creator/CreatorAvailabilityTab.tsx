import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Check, X } from "lucide-react";
import { format, addDays, startOfToday } from "date-fns";

interface Availability {
  date: string;
  available: boolean;
  creator_id: string;
}

interface CreatorAvailabilityTabProps {
  userId: string;
}

export default function CreatorAvailabilityTab({ userId }: CreatorAvailabilityTabProps) {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [calendarDates, setCalendarDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;
    fetchAvailabilities();
  }, [userId]);

  const fetchAvailabilities = async () => {
    try {
      const { data, error } = await supabase
        .from('availabilities')
        .select('*')
        .eq('creator_id', userId)
        .order('date', { ascending: true });

      if (error) throw error;

      setAvailabilities(data || []);
      
      // Set calendar dates for available days
      const availableDates = data
        ?.filter(av => av.available)
        ?.map(av => new Date(av.date)) || [];
      setCalendarDates(availableDates);
    } catch (error) {
      console.error('Error fetching availabilities:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load availability",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = async (date: Date, available: boolean) => {
    setUpdating(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('availabilities')
        .upsert({
          creator_id: userId,
          date: dateStr,
          available: available
        });

      if (error) throw error;

      // Update local state
      setAvailabilities(prev => {
        const existing = prev.find(av => av.date === dateStr);
        if (existing) {
          return prev.map(av => 
            av.date === dateStr ? { ...av, available } : av
          );
        } else {
          return [...prev, { date: dateStr, available, creator_id: userId }];
        }
      });

      // Update calendar dates
      if (available) {
        setCalendarDates(prev => [...prev, date]);
      } else {
        setCalendarDates(prev => prev.filter(d => format(d, 'yyyy-MM-dd') !== dateStr));
      }

      toast({
        title: "Success",
        description: `Marked ${format(date, 'MMM dd, yyyy')} as ${available ? 'available' : 'unavailable'}`,
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update availability",
      });
    } finally {
      setUpdating(false);
    }
  };

  const setQuickAvailability = async (days: number, available: boolean) => {
    setUpdating(true);
    try {
      const today = startOfToday();
      const dates = Array.from({ length: days }, (_, i) => addDays(today, i));
      
      const updates = dates.map(date => ({
        creator_id: userId,
        date: format(date, 'yyyy-MM-dd'),
        available: available
      }));

      const { error } = await supabase
        .from('availabilities')
        .upsert(updates);

      if (error) throw error;

      // Refresh availabilities
      await fetchAvailabilities();

      toast({
        title: "Success",
        description: `Marked next ${days} days as ${available ? 'available' : 'unavailable'}`,
      });
    } catch (error) {
      console.error('Error setting quick availability:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update availability",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getAvailabilityForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availabilities.find(av => av.date === dateStr);
  };

  const isDateAvailable = (date: Date) => {
    const availability = getAvailabilityForDate(date);
    return availability?.available || false;
  };

  if (loading) {
    return <div className="text-center py-8">Loading availability...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Availability Calendar</h2>
        <p className="text-muted-foreground">
          Manage your availability to help clients know when you're free for projects
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Select Dates
              </CardTitle>
              <CardDescription>
                Click on dates to mark them as available or unavailable
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                modifiers={{
                  available: calendarDates,
                }}
                modifiersStyles={{
                  available: {
                    backgroundColor: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                  }
                }}
                disabled={(date) => date < startOfToday()}
              />
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Set availability for multiple days at once</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setQuickAvailability(7, true)}
                disabled={updating}
              >
                <Check className="h-4 w-4 mr-2" />
                Available next 7 days
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setQuickAvailability(30, true)}
                disabled={updating}
              >
                <Check className="h-4 w-4 mr-2" />
                Available next 30 days
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setQuickAvailability(7, false)}
                disabled={updating}
              >
                <X className="h-4 w-4 mr-2" />
                Unavailable next 7 days
              </Button>
            </CardContent>
          </Card>

          {/* Selected Date Control */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {format(selectedDate, 'MMM dd, yyyy')}
                </CardTitle>
                <CardDescription>Manage availability for this date</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Current status:</span>
                  <Badge variant={isDateAvailable(selectedDate) ? "default" : "secondary"}>
                    {isDateAvailable(selectedDate) ? "Available" : "Unavailable"}
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    onClick={() => updateAvailability(selectedDate, true)}
                    disabled={updating || isDateAvailable(selectedDate)}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Available
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => updateAvailability(selectedDate, false)}
                    disabled={updating || !isDateAvailable(selectedDate)}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Unavailable
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Availability Stats</CardTitle>
              <CardDescription>Your availability overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Available days:</span>
                <Badge variant="default">
                  {availabilities.filter(av => av.available).length}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Unavailable days:</span>
                <Badge variant="secondary">
                  {availabilities.filter(av => !av.available).length}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total managed:</span>
                <Badge variant="outline">
                  {availabilities.length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Availability Changes */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Changes</CardTitle>
          <CardDescription>Your latest availability updates</CardDescription>
        </CardHeader>
        <CardContent>
          {availabilities.length > 0 ? (
            <div className="space-y-2">
              {availabilities
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((availability) => (
                  <div key={availability.date} className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">
                      {format(new Date(availability.date), 'MMM dd, yyyy')}
                    </span>
                    <Badge variant={availability.available ? "default" : "secondary"}>
                      {availability.available ? "Available" : "Unavailable"}
                    </Badge>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No availability set yet. Start by selecting dates above!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}