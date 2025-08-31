import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { 
  CheckCircle,
  Clock,
  Bell,
  Search,
  MapPin,
  Users
} from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { useState } from "react";

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

interface CreatorOverviewProps {
  stats: DashboardStats;
}

export default function CreatorOverview({ stats }: CreatorOverviewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const navigate = useNavigate();

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM dd, yyyy");
  };

  const unreadNotifications = stats.notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-8">
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-glass bg-primary/20">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.activeBookings}</p>
              <p className="text-muted-foreground">Current Bookings</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
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

        <GlassCard className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-glass bg-accent/20">
              <Clock className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.upcomingEvents.length}</p>
              <p className="text-muted-foreground">Upcoming Events</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-glass bg-muted/20">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{unreadNotifications}</p>
              <p className="text-muted-foreground">Notifications</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Current Bookings & Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 rounded-glass bg-card/50 backdrop-blur-glass border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Current Bookings</h3>
          
          {stats.nextEvent ? (
            <div className="space-y-4">
              <div className="p-4 rounded-glass bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-foreground">Next Event</h4>
                  <Badge variant="secondary" className="bg-primary/20 text-primary">
                    {formatEventDate(stats.nextEvent.date)}
                  </Badge>
                </div>
                <p className="text-foreground font-medium">{stats.nextEvent.title}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <MapPin className="h-4 w-4" />
                  <span>{stats.nextEvent.location}</span>
                </div>
              </div>

              {stats.upcomingEvents.length > 1 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Other Upcoming Events</h4>
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
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Search className="h-4 w-4 mr-2" />
                Explore Events
              </Button>
            </div>
          )}
        </GlassCard>

        {/* Mini Calendar */}
        <GlassCard className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Calendar</h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border-0"
          />
        </GlassCard>
      </div>

      {/* Recent Notifications */}
      <GlassCard className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Notifications</h3>
        {stats.notifications.length > 0 ? (
          <div className="space-y-3">
            {stats.notifications.map((notification) => (
              <div key={notification.id} className="flex items-start gap-3 p-3 rounded-glass bg-background/50">
                <div className={`w-2 h-2 rounded-full mt-2 ${notification.read ? 'bg-muted-foreground' : 'bg-primary'}`} />
                <div className="flex-1">
                  <p className="text-foreground text-sm">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(notification.created_at), "MMM dd, yyyy 'at' HH:mm")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}