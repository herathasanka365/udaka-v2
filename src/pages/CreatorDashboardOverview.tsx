import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { 
  CheckCircle,
  Users,
  Clock,
  Search,
  MapPin
} from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";

interface DashboardStats {
  activeBookings: number;
  totalApplications: number;
  nextEvent: {
    id: string;
    title: string;
    date: string;
    location: string;
  } | null;
  upcomingEvents: Array<{
    id: string;
    title: string;
    date: string;
    location: string;
    status: string;
  }>;
  notifications: Array<{
    id: string;
    message: string;
    created_at: string;
    read: boolean;
    type: string;
  }>;
}

export default function CreatorDashboardOverview() {
  const [stats, setStats] = useState<DashboardStats>({
    activeBookings: 0,
    totalApplications: 0,
    nextEvent: null,
    upcomingEvents: [],
    notifications: [],
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Get user from auth session
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };
    
    getUser();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        // Fetch applications for this creator
        const { data: applications, error: applicationsError } = await supabase
          .from('applications')
          .select(`
            id,
            status,
            created_at,
            events (
              id,
              title,
              end_date,
              location
            )
          `)
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false });

        if (applicationsError) throw applicationsError;

        // Filter accepted applications (active bookings)
        const acceptedApplications = applications?.filter(app => app.status === 'accepted') || [];
        
        // Get upcoming events from accepted applications
        const now = new Date();
        const upcomingEvents = acceptedApplications
          .map(app => ({
            id: app.events?.id || '',
            title: app.events?.title || '',
            date: app.events?.end_date || '',
            location: app.events?.location || '',
            status: app.status
          }))
          .filter(event => event.date && new Date(event.date) > now)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Find next event
        const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

        // Fetch notifications
        const { data: notifications, error: notificationsError } = await supabase
          .from('notifications')
          .select('id, message, created_at, read, type')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (notificationsError) throw notificationsError;

        setStats({
          activeBookings: acceptedApplications.length,
          totalApplications: applications?.length || 0,
          nextEvent,
          upcomingEvents: upcomingEvents.slice(0, 5),
          notifications: notifications || [],
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load dashboard data. Please refresh the page.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, toast]);

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM dd, yyyy");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Creator Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your current activity overview.</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-glass bg-primary/20">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.activeBookings}</p>
              <p className="text-muted-foreground">Active Bookings</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-glass bg-secondary/20">
              <Users className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalApplications}</p>
              <p className="text-muted-foreground">Total Applications</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-glass bg-orange-500/20">
              <Clock className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.upcomingEvents.length}</p>
              <p className="text-muted-foreground">Upcoming Events</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center justify-center">
          <Button 
            onClick={() => navigate("/creator/explore")}
            className="w-full h-full flex flex-col gap-2"
          >
            <Search className="h-6 w-6" />
            <span>Explore Events</span>
          </Button>
        </GlassCard>
      </div>

      {/* Current Bookings Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-4">Current Bookings Overview</h3>
          
          {stats.nextEvent ? (
            <div className="space-y-4">
              <div className="p-4 rounded-glass bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-foreground">Next Event</h4>
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                    {formatEventDate(stats.nextEvent.date)}
                  </span>
                </div>
                <p className="text-foreground font-medium">{stats.nextEvent.title}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <MapPin className="h-4 w-4" />
                  <span>{stats.nextEvent.location}</span>
                </div>
              </div>

              {stats.upcomingEvents.length > 1 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Upcoming Events</h4>
                  {stats.upcomingEvents.slice(1).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 rounded-glass bg-background/50">
                      <div>
                        <p className="font-medium text-foreground">{event.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{event.location}</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatEventDate(event.date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold text-foreground mb-2">No Active Bookings</h4>
              <p className="text-muted-foreground mb-4">
                Start exploring events to find your next opportunity!
              </p>
              <Button onClick={() => navigate("/creator/explore")}>
                <Search className="h-4 w-4 mr-2" />
                Explore Events
              </Button>
            </div>
          )}
        </GlassCard>

        {/* Mini Calendar */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">Calendar</h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border-0"
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
              head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
            }}
          />
        </GlassCard>
      </div>

      {/* Recent Notifications */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Notifications</h3>
        {stats.notifications.length > 0 ? (
          <div className="space-y-3">
            {stats.notifications.map((notification) => (
              <div key={notification.id} className="flex items-start gap-3 p-3 rounded-glass bg-background/50">
                <div className={`w-2 h-2 rounded-full mt-2 ${notification.read ? 'bg-muted-foreground' : 'bg-primary'}`} />
                <div className="flex-1">
                  <p className="text-foreground text-sm">{notification.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notification.created_at), "MMM dd, yyyy 'at' HH:mm")}
                    </p>
                    {!notification.read && (
                      <span className="inline-block w-1 h-1 bg-primary rounded-full"></span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">No notifications</p>
        )}
      </GlassCard>
    </div>
  );
}