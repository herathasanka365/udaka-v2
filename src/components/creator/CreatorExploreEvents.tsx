import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  Search, 
  MapPin, 
  DollarSign, 
  Calendar as CalIcon,
  CalendarIcon,
  Filter,
  Send
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  budget_total: number;
  roles: any;
  keywords: string[];
  end_date: string;
  status: string;
}

const applicationSchema = z.object({
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export default function CreatorExploreEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    category: "",
    location: "",
    minBudget: "",
    maxBudget: "",
    endDate: undefined as Date | undefined,
  });

  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof applicationSchema>>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      message: "",
    },
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user, filters]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('events')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters.minBudget) {
        query = query.gte('budget_total', parseInt(filters.minBudget));
      }
      if (filters.maxBudget) {
        query = query.lte('budget_total', parseInt(filters.maxBudget));
      }
      if (filters.endDate) {
        query = query.gte('end_date', format(filters.endDate, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by category/role if specified
      let filteredEvents = data || [];
      if (filters.category) {
        filteredEvents = filteredEvents.filter(event => 
          (Array.isArray(event.roles) && event.roles.some((role: any) => 
            role.name?.toLowerCase().includes(filters.category.toLowerCase())
          )) ||
          event.keywords?.some((keyword: string) => 
            keyword.toLowerCase().includes(filters.category.toLowerCase())
          )
        );
      }

      setEvents(filteredEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch events. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const onSubmitApplication = async (values: z.infer<typeof applicationSchema>) => {
    if (!user || !selectedEvent) return;

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
        title: "Application Submitted!",
        description: "Your application has been sent to the client.",
      });

      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit application. Please try again.",
      });
    }
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <GlassCard className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filter Events
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Category/Role</label>
            <Input
              placeholder="e.g. Actor, Director"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="bg-background/50"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Location</label>
            <Input
              placeholder="City, State"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="bg-background/50"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Min Budget</label>
            <Input
              type="number"
              placeholder="1000"
              value={filters.minBudget}
              onChange={(e) => setFilters({ ...filters, minBudget: e.target.value })}
              className="bg-background/50"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Max Budget</label>
            <Input
              type="number"
              placeholder="10000"
              value={filters.maxBudget}
              onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })}
              className="bg-background/50"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">End Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background/50",
                    !filters.endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate ? format(filters.endDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.endDate}
                  onSelect={(date) => setFilters({ ...filters, endDate: date })}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button onClick={fetchEvents} className="bg-primary hover:bg-primary/90">
            <Search className="h-4 w-4 mr-2" />
            Search Events
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setFilters({ category: "", location: "", minBudget: "", maxBudget: "", endDate: undefined })}
          >
            Clear Filters
          </Button>
        </div>
      </GlassCard>

      {/* Events Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-foreground">Loading events...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <GlassCard key={event.id} className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground text-lg">{event.title}</h4>
                  <p className="text-muted-foreground text-sm line-clamp-2 mt-2">
                    {event.description}
                  </p>
                </div>

                <div className="space-y-2">
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  
                  {event.budget_total && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>{formatBudget(event.budget_total)}</span>
                    </div>
                  )}
                  
                  {event.end_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalIcon className="h-4 w-4" />
                      <span>{format(new Date(event.end_date), "MMM dd, yyyy")}</span>
                    </div>
                  )}
                </div>

                {event.keywords && event.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {event.keywords.slice(0, 3).map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {event.keywords.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{event.keywords.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => handleApplyToEvent(event)}
                >
                  Apply Now
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {events.length === 0 && !loading && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Events Found</h3>
          <p className="text-muted-foreground">Try adjusting your filters to find more opportunities.</p>
        </div>
      )}

      {/* Application Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Apply to Event</DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="p-4 rounded-glass bg-background/50">
                <h4 className="font-semibold text-foreground">{selectedEvent.title}</h4>
                <p className="text-muted-foreground text-sm">{selectedEvent.description}</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitApplication)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Your Application Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell the client why you're perfect for this role..."
                            className="min-h-[100px] bg-background/50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Send className="h-4 w-4 mr-2" />
                    Submit Application
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}