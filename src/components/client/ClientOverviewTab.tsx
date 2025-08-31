import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, MessageSquare, Calendar, Bell } from "lucide-react";

interface DashboardStats {
  activePosts: number;
  pendingApplications: number;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    end_date: string;
  }>;
  recentNotifications: Array<{
    id: string;
    message: string;
    created_at: string;
    read: boolean;
  }>;
}

interface ClientOverviewTabProps {
  userId: string;
}

export default function ClientOverviewTab({ userId }: ClientOverviewTabProps) {
  const [stats, setStats] = useState<DashboardStats>({
    activePosts: 0,
    pendingApplications: 0,
    upcomingDeadlines: [],
    recentNotifications: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchDashboardData = async () => {
      try {
        // Fetch active posts
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('id, title, end_date')
          .eq('client_id', userId)
          .eq('status', 'active');

        if (eventsError) throw eventsError;

        // Fetch pending applications
        const { data: applications, error: applicationsError } = await supabase
          .from('applications')
          .select('id, event_id')
          .eq('status', 'pending')
          .in('event_id', events?.map(e => e.id) || []);

        if (applicationsError) throw applicationsError;

        // Fetch recent notifications
        const { data: notifications, error: notificationsError } = await supabase
          .from('notifications')
          .select('id, message, created_at, read')
          .eq('user_id', userId)
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
          pendingApplications: applications?.length || 0,
          upcomingDeadlines,
          recentNotifications: notifications || [],
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userId]);

  if (loading) {
    return <div className="text-center py-8">Loading overview...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePosts}</div>
            <p className="text-xs text-muted-foreground">
              Events currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApplications}</div>
            <p className="text-xs text-muted-foreground">
              Waiting for your review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingDeadlines.length}</div>
            <p className="text-xs text-muted-foreground">
              Within 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.recentNotifications.filter(n => !n.read).length}
            </div>
            <p className="text-xs text-muted-foreground">
              New notifications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Events ending soon</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.upcomingDeadlines.length > 0 ? (
              <div className="space-y-3">
                {stats.upcomingDeadlines.map((deadline) => (
                  <div key={deadline.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{deadline.title}</p>
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
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
            <CardDescription>Latest updates</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentNotifications.length > 0 ? (
              <div className="space-y-3">
                {stats.recentNotifications.map((notification) => (
                  <div key={notification.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className={`w-2 h-2 rounded-full mt-2 ${notification.read ? 'bg-muted-foreground' : 'bg-primary'}`} />
                    <div className="flex-1">
                      <p className="text-sm">{notification.message}</p>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}