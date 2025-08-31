import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Plus, 
  MessageSquare, 
  Search, 
  FileText, 
  Settings,
  Calendar,
  Bell,
  User
} from "lucide-react";

import ClientHeader from "@/components/client/ClientHeader";
import ClientOverviewTab from "@/components/client/ClientOverviewTab";
import ClientMyPostsTab from "@/components/client/ClientMyPostsTab";
import ClientPostNewTab from "@/components/client/ClientPostNewTab";
import ClientExploreCreatorsTab from "@/components/client/ClientExploreCreatorsTab";
import ClientRequestsTab from "@/components/client/ClientRequestsTab";
import ClientBookingsTab from "@/components/client/ClientBookingsTab";
import ClientSettingsTab from "@/components/client/ClientSettingsTab";

export default function ClientDashboardWithTabs() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("requests");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth/client/sign-in");
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    // Fetch unread notifications count
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('read', false);

      if (!error && data) {
        setUnreadNotifications(data.length);
      }
    };

    fetchNotifications();

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
        () => {
          setUnreadNotifications(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
            <h1 className="text-3xl font-bold text-foreground">Client Dashboard</h1>
            <p className="text-muted-foreground">Manage your events, bookings, and creator connections</p>
          </div>
          
          <ClientHeader userId={user?.id} />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 lg:w-fit lg:grid-cols-7 mb-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="my-posts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">My Posts</span>
            </TabsTrigger>
            <TabsTrigger value="post-new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Post New</span>
            </TabsTrigger>
            <TabsTrigger value="explore" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Explore</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Requests</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Bookings</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ClientOverviewTab userId={user?.id} />
          </TabsContent>

          <TabsContent value="my-posts">
            <ClientMyPostsTab userId={user?.id} />
          </TabsContent>

          <TabsContent value="post-new">
            <ClientPostNewTab userId={user?.id} onSuccess={() => setActiveTab("my-posts")} />
          </TabsContent>

          <TabsContent value="explore">
            <ClientExploreCreatorsTab userId={user?.id} />
          </TabsContent>

          <TabsContent value="requests">
            <ClientRequestsTab userId={user?.id} />
          </TabsContent>

          <TabsContent value="bookings">
            <ClientBookingsTab userId={user?.id} />
          </TabsContent>

          <TabsContent value="settings">
            <ClientSettingsTab userId={user?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}