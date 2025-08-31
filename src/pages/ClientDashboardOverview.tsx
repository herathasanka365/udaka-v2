import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/ui/glass-card";
import { 
  FileText, 
  MessageSquare, 
  Calendar,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  activePosts: number;
  pendingRequests: number;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    end_date: string;
  }>;
  notifications: Array<{
    id: string;
    message: string;
    created_at: string;
    read: boolean;
  }>;
}

export default function ClientDashboardOverview() {
  const [stats, setStats] = useState<DashboardStats>({
    activePosts: 0,
    pendingRequests: 0,
    upcomingDeadlines: [],
    notifications: [],
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
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
        // Fetch active posts count
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('id, title, end_date')
          .eq('client_id', user.id)
          .eq('status', 'active');

        if (eventsError) throw eventsError;

        // Fetch pending requests count
        const { data: applications, error: applicationsError } = await supabase
          .from('applications')
          .select('id, event_id')
          .eq('status', 'pending')
          .in('event_id', events?.map(e => e.id) || []);

        if (applicationsError) throw applicationsError;

        // Fetch notifications
        const { data: notifications, error: notificationsError } = await supabase
          .from('notifications')
          .select('id, message, created_at, read')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (notificationsError) throw notificationsError;

        // Filter upcoming deadlines (within next 30 days)
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const upcomingDeadlines = events?.filter(event => 
          event.end_date && 
          new Date(event.end_date) > now && 
          new Date(event.end_date) <= thirtyDaysFromNow
        ) || [];

        setStats({
          activePosts: events?.length || 0,
          pendingRequests: applications?.length || 0,
          upcomingDeadlines,
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
        <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening with your projects.</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-glass bg-primary/20">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.activePosts}</p>
              <p className="text-muted-foreground">Active Projects</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-glass bg-secondary/20">
              <MessageSquare className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.pendingRequests}</p>
              <p className="text-muted-foreground">Applicants Waiting</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-glass bg-orange-500/20">
              <Calendar className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.upcomingDeadlines.length}</p>
              <p className="text-muted-foreground">Upcoming Deadlines</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center justify-center">
          <Button 
            onClick={() => navigate("/client/post-event")}
            className="w-full h-full flex flex-col gap-2"
          >
            <Plus className="h-6 w-6" />
            <span>Post New Event</span>
          </Button>
        </GlassCard>
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">Upcoming Deadlines</h3>
          {stats.upcomingDeadlines.length > 0 ? (
            <div className="space-y-3">
              {stats.upcomingDeadlines.map((deadline) => (
                <div key={deadline.id} className="flex items-center justify-between p-3 rounded-glass bg-background/50">
                  <div>
                    <p className="font-medium text-foreground">{deadline.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(deadline.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No upcoming deadlines</p>
          )}
        </GlassCard>

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
                    <p className="text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No notifications</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}