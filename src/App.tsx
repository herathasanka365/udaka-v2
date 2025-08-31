import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Home from "./pages/Home";
import ExploreTalent from "./pages/ExploreTalent";
import About from "./pages/About";
import Contact from "./pages/Contact";

// Auth pages
import CreatorRegister from "./pages/auth/CreatorRegister";
import CreatorSignIn from "./pages/auth/CreatorSignIn";
import ClientRegister from "./pages/auth/ClientRegister";
import ClientSignIn from "./pages/auth/ClientSignIn";

import ClientDashboardLayout from "./components/layout/ClientDashboardLayout";
import ClientDashboardOverview from "./pages/ClientDashboardOverview";
import ClientDashboardWithTabs from "./pages/ClientDashboardWithTabs";
import PostEvent from "./pages/PostEvent";
import MyPosts from "./pages/MyPosts";
import ManageRequests from "./pages/ManageRequests";
import ExploreCreators from "./pages/ExploreCreators";
import ClientProfile from "./pages/ClientProfile";
import CreatorDashboardLayout from "./components/layout/CreatorDashboardLayout";
import CreatorDashboardOverview from "./pages/CreatorDashboardOverview";
import CreatorDashboardWithTabs from "./pages/CreatorDashboardWithTabs";
import CreatorExploreEvents from "./pages/CreatorExploreEvents";
import CreatorPortfolio from "./pages/CreatorPortfolio";
import CreatorAvailability from "./pages/CreatorAvailability";
import CreatorBookedEvents from "./pages/CreatorBookedEvents";
import CreatorSettings from "./pages/CreatorSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/home" element={<Home />} />
            <Route path="/explore-talent" element={<ExploreTalent />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            
            {/* Auth Routes */}
            <Route path="/auth/creator/register" element={<CreatorRegister />} />
            <Route path="/auth/creator/sign-in" element={<CreatorSignIn />} />
            <Route path="/auth/client/register" element={<ClientRegister />} />
            <Route path="/auth/client/sign-in" element={<ClientSignIn />} />
          
          {/* Client Dashboard with Tabs */}
          <Route path="/dashboard/client" element={<ClientDashboardWithTabs />} />
          
          {/* Legacy Client Dashboard Routes */}
          <Route path="/client/dashboard" element={<ClientDashboardLayout />}>
            <Route path="dashboard" element={<ClientDashboardOverview />} />
            <Route path="post-event" element={<PostEvent />} />
            <Route path="posts" element={<MyPosts />} />
            <Route path="requests" element={<ManageRequests />} />
            <Route path="explore" element={<ExploreCreators />} />
            <Route path="profile" element={<ClientProfile />} />
          </Route>
          
          {/* Creator Dashboard with Tabs */}
          <Route path="/dashboard/creator" element={<CreatorDashboardWithTabs />} />
          
          {/* Legacy Creator Dashboard Routes */}
          <Route path="/creator/dashboard" element={<CreatorDashboardLayout />}>
            <Route index element={<CreatorDashboardOverview />} />
            <Route path="dashboard" element={<CreatorDashboardOverview />} />
            <Route path="explore" element={<CreatorExploreEvents />} />
            <Route path="portfolio" element={<CreatorPortfolio />} />
            <Route path="availability" element={<CreatorAvailability />} />
            <Route path="bookings" element={<CreatorBookedEvents />} />
            <Route path="settings" element={<CreatorSettings />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
