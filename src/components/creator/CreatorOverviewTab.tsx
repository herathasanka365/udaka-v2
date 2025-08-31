import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface CreatorOverviewTabProps {
  userId: string;
}

export default function CreatorOverviewTab({ userId }: CreatorOverviewTabProps) {
  const [stats, setStats] = useState<DashboardStats>({
    activeBookings: 0,
    totalApplications: 0,
    nextEvent: null,
    upcomingEvents: [],
    notifications: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;

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
          .eq('creator_id', userId)
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
          .eq('user_id', userId)
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
  }, [userId, toast]);

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
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBookings}</div>
            <p className="text-xs text-muted-foreground">
              Current confirmed bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground">
              Applications submitted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingEvents.length}</div>
            <p className="text-xs text-muted-foreground">
              Events this month
            </p>
          </CardContent>
        </Card>

        <Card className="flex items-center justify-center">
          <CardContent className="p-6">
            <Button className="w-full h-full flex flex-col gap-2" size="lg">
              <Search className="h-6 w-6" />
              <span>Explore Events</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Current Bookings Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Current Bookings Overview</CardTitle>
              <CardDescription>Your upcoming confirmed events</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.nextEvent ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Next Event</h4>
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        {formatEventDate(stats.nextEvent.date)}
                      </span>
                    </div>
                    <p className="font-medium">{stats.nextEvent.title}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <MapPin className="h-4 w-4" />
                      <span>{stats.nextEvent.location}</span>
                    </div>
                  </div>

                  {stats.upcomingEvents.length > 1 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Upcoming Events</h4>
                      {stats.upcomingEvents.slice(1).map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">{event.title}</p>
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
                  <h4 className="font-semibold mb-2">No Active Bookings</h4>
                  <p className="text-muted-foreground mb-4">
                    Start exploring events to find your next opportunity!
                  </p>
                  <Button>
                    <Search className="h-4 w-4 mr-2" />
                    Explore Events
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mini Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>Today's date and upcoming events</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border-0"
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>Latest updates and messages</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.notifications.length > 0 ? (
            <div className="space-y-3">
              {stats.notifications.map((notification) => (
                <div key={notification.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className={`w-2 h-2 rounded-full mt-2 ${notification.read ? 'bg-muted-foreground' : 'bg-primary'}`} />
                  <div className="flex-1">
                    <p className="text-sm">{notification.message}</p>
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
        </CardContent>
      </Card>
    </div>
  );
}