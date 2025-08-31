import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Search, 
  Calendar as CalendarIcon, 
  Briefcase, 
  User,
  CheckCircle,
  Bell,
  LogOut
} from "lucide-react";

const sidebarItems = [
  { title: "Overview", icon: LayoutDashboard, url: "/dashboard/creator/dashboard" },
  { title: "Explore Events", icon: Search, url: "/dashboard/creator/explore" },
  { title: "Availability", icon: CalendarIcon, url: "/dashboard/creator/availability" },
  { title: "Portfolio", icon: Briefcase, url: "/dashboard/creator/portfolio" },
  { title: "Booked Events", icon: CheckCircle, url: "/dashboard/creator/bookings" },
  { title: "Settings", icon: User, url: "/dashboard/creator/settings" },
];

function CreatorSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
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

  const isActive = (url: string) => location.pathname === url;

  return (
    <Sidebar 
      className="w-60 bg-[rgba(18,18,18,0.7)] backdrop-blur-[10px] border-r border-[rgba(255,255,255,0.2)] font-['Poppins'] text-white"
      aria-label="Creator Dashboard Navigation"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-semibold px-4 py-2 text-white font-['Poppins']">
            Creator Dashboard
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className="hover:bg-sidebar-accent transition-colors rounded-glass"
                  >
                    <Button
                      variant="ghost"
                      className={`w-full justify-start gap-3 px-4 py-2 font-['Poppins'] text-sm rounded-xl transition-colors ${
                        isActive(item.url) 
                          ? "bg-[#e01e3c] text-white font-semibold" 
                          : "text-white hover:bg-[rgba(224,30,60,0.1)]"
                      }`}
                      onClick={() => navigate(item.url)}
                      aria-current={isActive(item.url) ? "page" : undefined}
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
                    className="w-full justify-start gap-3 px-4 py-2 text-destructive hover:text-destructive hover:bg-destructive/10 font-['Poppins'] text-sm rounded-xl transition-colors"
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

export default function CreatorDashboardLayout() {
  const [user, setUser] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

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

    // Fetch unread notifications count
    const fetchNotifications = async () => {
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('read', false);
      
      setUnreadNotifications(notifications?.length || 0);
    };

    fetchNotifications();

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
          setUnreadNotifications(prev => prev + 1);
          toast({
            title: "New Notification",
            description: payload.new.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <CreatorSidebar />
        
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b border-[rgba(255,255,255,0.2)] bg-[rgba(18,18,18,0.8)] backdrop-blur-sm flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="lg:hidden" />
              <h2 className="text-xl font-semibold text-white font-['Poppins']">Creator Dashboard</h2>
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
          </header>
          
          <div className="flex-1 p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}