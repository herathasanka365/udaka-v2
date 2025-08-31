import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { FilterGroup } from "@/components/ui/filter-group";
import { Button } from "@/components/ui/button";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  ArrowLeft, 
  Filter, 
  Save, 
  Search, 
  MapPin, 
  DollarSign, 
  Calendar,
  Send,
  Star,
  Bookmark
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  budget_total: number;
  roles: any; // JSON field from Supabase
  keywords: string[];
  end_date: string;
  status: string;
}

interface Filters {
  keywords: string[];
  location: string;
  minBudget: string;
  maxBudget: string;
  roles: string[];
}

const applicationSchema = z.object({
  message: z.string().min(50, "Application message must be at least 50 characters"),
});

type ApplicationForm = z.infer<typeof applicationSchema>;

const LOCATIONS = [
  "Los Angeles, CA", "New York, NY", "Atlanta, GA", "Chicago, IL", 
  "London, UK", "Toronto, ON", "Vancouver, BC", "Austin, TX"
];

const COMMON_ROLES = [
  "Actor", "Director", "Producer", "Cinematographer", "Editor", 
  "Sound Engineer", "Makeup Artist", "Costume Designer", "Writer", "Voice Actor"
];

export default function CreatorExploreEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    keywords: [],
    location: "",
    minBudget: "",
    maxBudget: "",
    roles: [],
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      message: "",
    },
  });

  const itemsPerPage = 12;

  useEffect(() => {
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
    fetchEvents();
    fetchRecommendedEvents();
  }, [user, filters, currentPage]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('events')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      // Apply filters
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      if (filters.keywords.length > 0) {
        query = query.overlaps('keywords', filters.keywords);
      }

      if (filters.minBudget) {
        query = query.gte('budget_total', parseInt(filters.minBudget));
      }

      if (filters.maxBudget) {
        query = query.lte('budget_total', parseInt(filters.maxBudget));
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setEvents(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load events. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedEvents = async () => {
    try {
      // Get user's profile to find their keywords
      const { data: userProfile } = await supabase
        .from('users')
        .select('keywords')
        .eq('id', user.id)
        .single();

      if (userProfile?.keywords?.length > 0) {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'active')
          .overlaps('keywords', userProfile.keywords)
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) throw error;
        setRecommendedEvents(data || []);
      }
    } catch (error) {
      console.error('Error fetching recommended events:', error);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const saveFilters = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: user.id,
          role: 'creator',
          filters: filters as any,
        });

      if (error) throw error;

      toast({
        title: "Filters Saved",
        description: "Your search filters have been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving filters:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save filters. Please try again.",
      });
    }
  };

  const handleApplyToEvent = (event: Event) => {
    setSelectedEvent(event);
    form.reset();
    setIsApplicationModalOpen(true);
  };

  const onSubmitApplication = async (values: ApplicationForm) => {
    if (!selectedEvent || !user) return;

    setIsApplying(true);
    try {
      const { error } = await supabase
        .from('applications')
        .insert({
          creator_id: user.id,
          event_id: selectedEvent.id,
          message: values.message,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Application Sent",
        description: `Your application for "${selectedEvent.title}" has been sent successfully.`,
      });

      setIsApplicationModalOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit application. Please try again.",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(budget);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/creator/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Explore Events</h1>
              <p className="text-muted-foreground">Discover and apply to exciting new opportunities</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <GlassCard className="mb-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={saveFilters}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Filters
                </Button>
              </div>
            </div>

            <FilterGroup
              categories={COMMON_ROLES}
              selectedCategory=""
              onCategoryChange={() => {}}
              location={filters.location}
              onLocationChange={(location) => handleFilterChange({ ...filters, location })}
              keywords={filters.keywords}
              selectedKeywords={filters.keywords}
              onKeywordToggle={(keyword) => {
                const newKeywords = filters.keywords.includes(keyword)
                  ? filters.keywords.filter(k => k !== keyword)
                  : [...filters.keywords, keyword];
                handleFilterChange({ ...filters, keywords: newKeywords });
              }}
              onKeywordAdd={(keyword) => {
                if (!filters.keywords.includes(keyword)) {
                  handleFilterChange({ ...filters, keywords: [...filters.keywords, keyword] });
                }
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Min Budget</Label>
                <Input
                  type="number"
                  placeholder="Minimum budget"
                  value={filters.minBudget}
                  onChange={(e) => handleFilterChange({ ...filters, minBudget: e.target.value })}
                />
              </div>
              <div>
                <Label>Max Budget</Label>
                <Input
                  type="number"
                  placeholder="Maximum budget"
                  value={filters.maxBudget}
                  onChange={(e) => handleFilterChange({ ...filters, maxBudget: e.target.value })}
                />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Recommended Events */}
        {recommendedEvents.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Recommended for You</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedEvents.map((event) => (
                <GlassCard key={event.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-foreground text-lg">{event.title}</h3>
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        Recommended
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>Budget: {formatBudget(event.budget_total)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Deadline: {new Date(event.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {event.keywords?.slice(0, 3).map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>

                    <PrimaryButton
                      className="w-full"
                      onClick={() => handleApplyToEvent(event)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Apply Now
                    </PrimaryButton>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            {loading ? "Loading..." : `${events.length} Event${events.length !== 1 ? 's' : ''} Found`}
          </h2>
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <GlassCard key={i} className="p-6 animate-pulse">
                <div className="space-y-4">
                  <div className="h-6 bg-muted rounded"></div>
                  <div className="h-16 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : events.length === 0 ? (
          <GlassCard className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Events Found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters to find more opportunities.
            </p>
          </GlassCard>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {events.map((event) => (
                <GlassCard key={event.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground text-lg">{event.title}</h3>
                    
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {event.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>Budget: {formatBudget(event.budget_total)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Deadline: {new Date(event.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {event.keywords?.slice(0, 3).map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {event.keywords?.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{event.keywords.length - 3}
                        </Badge>
                      )}
                    </div>

                    <PrimaryButton
                      className="w-full"
                      onClick={() => handleApplyToEvent(event)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Apply Now
                    </PrimaryButton>
                  </div>
                </GlassCard>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = Math.max(1, currentPage - 2) + i;
                      if (page > totalPages) return null;
                      
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}

        {/* Application Modal */}
        <GlassModal
          isOpen={isApplicationModalOpen}
          onClose={() => setIsApplicationModalOpen(false)}
          title={`Apply to ${selectedEvent?.title}`}
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitApplication)} className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Event Details</h4>
                <div className="p-3 rounded-glass bg-background/50 space-y-2">
                  <p className="text-sm"><strong>Location:</strong> {selectedEvent?.location}</p>
                  <p className="text-sm"><strong>Budget:</strong> {selectedEvent && formatBudget(selectedEvent.budget_total)}</p>
                  <p className="text-sm"><strong>Deadline:</strong> {selectedEvent && new Date(selectedEvent.end_date).toLocaleDateString()}</p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell them why you're perfect for this role. Include relevant experience, skills, and why you're excited about this project..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <SecondaryButton
                  type="button"
                  onClick={() => setIsApplicationModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={isApplying} className="flex-1">
                  {isApplying ? "Sending..." : "Send Application"}
                </PrimaryButton>
              </div>
            </form>
          </Form>
        </GlassModal>
      </div>
    </div>
  );
}