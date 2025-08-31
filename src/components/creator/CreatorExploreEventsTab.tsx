import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Filter, 
  Search, 
  MapPin, 
  DollarSign, 
  Calendar,
  Send,
  Star
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  budget_total: number;
  keywords: string[];
  end_date: string;
  status: string;
}

interface Filters {
  keywords: string[];
  location: string;
  minBudget: string;
  maxBudget: string;
}

const applicationSchema = z.object({
  message: z.string().min(10, "Application message must be at least 10 characters"),
});

type ApplicationForm = z.infer<typeof applicationSchema>;

interface CreatorExploreEventsTabProps {
  userId: string;
}

export default function CreatorExploreEventsTab({ userId }: CreatorExploreEventsTabProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
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
  });
  const { toast } = useToast();

  const form = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      message: "",
    },
  });

  const itemsPerPage = 12;

  useEffect(() => {
    if (!userId) return;
    fetchEvents();
    fetchRecommendedEvents();
  }, [userId, filters, currentPage]);

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
        .from('creator_profiles')
        .select('keywords')
        .eq('id', userId)
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

  const handleApplyToEvent = (event: Event) => {
    setSelectedEvent(event);
    form.reset();
    setIsApplicationModalOpen(true);
  };

  const onSubmitApplication = async (values: ApplicationForm) => {
    if (!selectedEvent || !userId) return;

    console.log('=== Starting application submission ===');
    console.log('User ID:', userId);
    console.log('Event ID:', selectedEvent.id);
    console.log('Message:', values.message);

    setIsApplying(true);
    try {
      // Check if user has already applied to this event
      console.log('Checking for existing application...');
      const { data: existingApplication, error: checkError } = await supabase
        .from('applications')
        .select('id')
        .eq('creator_id', userId)
        .eq('event_id', selectedEvent.id)
        .maybeSingle();

      console.log('Existing application check:', { existingApplication, checkError });

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing application:', checkError);
        throw checkError;
      }

      if (existingApplication) {
        toast({
          variant: "destructive",
          title: "Already Applied",
          description: `You have already applied to "${selectedEvent.title}". Check your applications in the Bookings tab.`,
        });
        setIsApplicationModalOpen(false);
        return;
      }

      // Proceed with application if no existing application found
      console.log('Creating new application...');
      const applicationData = {
        creator_id: userId,
        event_id: selectedEvent.id,
        message: values.message,
        status: 'pending' as const
      };
      console.log('Application data:', applicationData);

      const { data: newApplication, error } = await supabase
        .from('applications')
        .insert(applicationData)
        .select();

      console.log('Application creation result:', { newApplication, error });

      if (error) throw error;

      toast({
        title: "Application Sent",
        description: `Your application for "${selectedEvent.title}" has been sent successfully.`,
      });

      setIsApplicationModalOpen(false);
      setSelectedEvent(null);
    } catch (error: any) {
      console.error('=== Error submitting application ===', error);
      
      // Handle the duplicate key constraint error specifically
      if (error.code === '23505') {
        toast({
          variant: "destructive",
          title: "Already Applied",
          description: `You have already applied to "${selectedEvent.title}". Check your applications in the Bookings tab.`,
        });
        setIsApplicationModalOpen(false);
        return;
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit application. Please try again.",
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
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search Filters
          </CardTitle>
          <CardDescription>Find events that match your skills and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="Search by location..."
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Keywords</Label>
              <Input
                placeholder="Enter keywords (comma separated)"
                onChange={(e) => {
                  const keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k);
                  setFilters({ ...filters, keywords });
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Budget</Label>
              <Input
                type="number"
                placeholder="Minimum budget"
                value={filters.minBudget}
                onChange={(e) => setFilters({ ...filters, minBudget: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Budget</Label>
              <Input
                type="number"
                placeholder="Maximum budget"
                value={filters.maxBudget}
                onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Events */}
      {recommendedEvents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Recommended for You</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedEvents.map((event) => (
              <Card key={event.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      Recommended
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="line-clamp-2">
                    {event.description}
                  </CardDescription>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{event.location}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Budget: {formatBudget(event.budget_total)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
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

                  <Button
                    className="w-full"
                    onClick={() => handleApplyToEvent(event)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Apply Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
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
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-16 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-10 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Events Found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters to find more opportunities.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="line-clamp-3">
                    {event.description}
                  </CardDescription>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{event.location}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Budget: {formatBudget(event.budget_total)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
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

                  <Button
                    className="w-full"
                    onClick={() => handleApplyToEvent(event)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Apply Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
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
          )}
        </>
      )}

      {/* Application Modal */}
      <Dialog open={isApplicationModalOpen} onOpenChange={setIsApplicationModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to {selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              Send your application for this event. Make sure to include why you're a good fit!
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitApplication)} className="space-y-4">
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application Message *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell them why you're perfect for this event..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsApplicationModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isApplying}>
                  {isApplying ? "Sending..." : "Send Application"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}