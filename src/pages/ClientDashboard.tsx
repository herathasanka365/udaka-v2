import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Plus, 
  MessageSquare, 
  Search, 
  FileText, 
  User,
  Calendar,
  Bell,
  LogOut
} from "lucide-react";

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

const sidebarItems = [
  { title: "Overview", icon: LayoutDashboard, url: "/client/dashboard" },
  { title: "Post Event", icon: Plus, url: "/client/post-event" },
  { title: "Manage Requests", icon: MessageSquare, url: "/client/requests" },
  { title: "Explore Creators", icon: Search, url: "/client/explore" },
  { title: "My Posts", icon: FileText, url: "/client/posts" },
  { title: "Profile", icon: User, url: "/client/profile" },
];

function ClientSidebar() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign out. Please try again.",
      });
    } else {
      navigate("/");
    }
  };

  return (
    <Sidebar className="w-60">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-semibold px-4 py-2">
            Client Dashboard
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className="hover:bg-glass-bg/50 transition-colors"
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 px-4 py-2"
                      onClick={() => navigate(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 px-4 py-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default function ClientDashboard() {
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
    // Check authentication
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/clients/login");
        return;
      }
      setUser(session.user);
    };
    
    checkAuth();
  }, [navigate]);

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

    // Set up real-time notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as {
            id: string;
            message: string;
            created_at: string;
            read: boolean;
          };
          
          setStats(prev => ({
            ...prev,
            notifications: [newNotification, ...prev.notifications.slice(0, 4)]
          }));
          
          toast({
            title: "New Notification",
            description: newNotification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const unreadNotifications = stats.notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ClientSidebar />
        
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
                <p className="text-muted-foreground">Welcome back! Here's what's happening with your projects.</p>
              </div>
            </div>
            
            <div className="relative">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-glass bg-green-500/20">
                  <Bell className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{unreadNotifications}</p>
                  <p className="text-muted-foreground">New Notifications</p>
                </div>
              </div>
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
        </main>
      </div>
    </SidebarProvider>
  );
}