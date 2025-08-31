import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Search, 
  Calendar as CalendarIcon, 
  Briefcase, 
  Settings,
  CheckCircle,
  Clock,
  Bell,
  MapPin,
  Users
} from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";

// Tab Components
import CreatorOverview from "@/components/creator/CreatorOverview";
import CreatorExploreEvents from "@/components/creator/CreatorExploreEvents";
import CreatorAvailability from "@/components/creator/CreatorAvailability";
import CreatorPortfolio from "@/components/creator/CreatorPortfolio";
import CreatorBookedEvents from "@/components/creator/CreatorBookedEvents";
import CreatorSettings from "@/components/creator/CreatorSettings";

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

export default function CreatorDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeBookings: 0,
    totalApplications: 0,
    nextEvent: null,
    upcomingEvents: [],
    notifications: [],
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
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

    // Set up real-time notifications
    const channel = supabase
      .channel('creator-notifications')
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
            type: string;
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Creator Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Manage your creative career.</p>
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 rounded-glass bg-card/50 backdrop-blur-glass border border-border mb-8">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="explore" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Search className="h-4 w-4 mr-2" />
              Explore Events
            </TabsTrigger>
            <TabsTrigger value="availability" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Availability
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Briefcase className="h-4 w-4 mr-2" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="bookings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CheckCircle className="h-4 w-4 mr-2" />
              Booked Events
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <CreatorOverview stats={stats} />
          </TabsContent>

          <TabsContent value="explore" className="mt-0">
            <CreatorExploreEvents />
          </TabsContent>

          <TabsContent value="availability" className="mt-0">
            <CreatorAvailability />
          </TabsContent>

          <TabsContent value="portfolio" className="mt-0">
            <CreatorPortfolio />
          </TabsContent>

          <TabsContent value="bookings" className="mt-0">
            <CreatorBookedEvents />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <CreatorSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}