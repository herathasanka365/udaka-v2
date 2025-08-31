import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutDashboard, 
  Search, 
  User,
  Calendar,
  CheckCircle,
  Settings,
  Bell
} from "lucide-react";

// Import tab components
import CreatorHeader from "@/components/creator/CreatorHeader";
import CreatorOverviewTab from "@/components/creator/CreatorOverviewTab";
import CreatorExploreEventsTab from "@/components/creator/CreatorExploreEventsTab";
import CreatorPortfolioTab from "@/components/creator/CreatorPortfolioTab";
import CreatorAvailabilityTab from "@/components/creator/CreatorAvailabilityTab";
import CreatorBookedEventsTab from "@/components/creator/CreatorBookedEventsTab";
import CreatorInvitationsTab from "@/components/creator/CreatorInvitationsTab";
import CreatorSettingsTab from "@/components/creator/CreatorSettingsTab";

export default function CreatorDashboardWithTabs() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("invitations");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth/creator/sign-in");
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    
    checkAuth();
  }, [navigate]);

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
            <p className="text-muted-foreground">Manage your portfolio, applications, and bookings</p>
          </div>
          
          <CreatorHeader userId={user?.id} />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 lg:w-fit lg:grid-cols-7 mb-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="explore" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Explore</span>
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Portfolio</span>
            </TabsTrigger>
            <TabsTrigger value="availability" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Availability</span>
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Invitations</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Bookings</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <CreatorOverviewTab userId={user?.id} />
          </TabsContent>

          <TabsContent value="explore">
            <CreatorExploreEventsTab userId={user?.id} />
          </TabsContent>

          <TabsContent value="portfolio">
            <CreatorPortfolioTab userId={user?.id} />
          </TabsContent>

          <TabsContent value="availability">
            <CreatorAvailabilityTab userId={user?.id} />
          </TabsContent>

          <TabsContent value="invitations">
            <CreatorInvitationsTab userId={user?.id} />
          </TabsContent>

          <TabsContent value="bookings">
            <CreatorBookedEventsTab userId={user?.id} />
          </TabsContent>

          <TabsContent value="settings">
            <CreatorSettingsTab userId={user?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}