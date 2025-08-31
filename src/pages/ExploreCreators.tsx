import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { Button } from "@/components/ui/button";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ArrowLeft, 
  Filter, 
  Save, 
  Search, 
  MapPin, 
  User, 
  Send,
  X
} from "lucide-react";

interface Creator {
  id: string;
  name: string;
  location: string;
  description: string;
  keywords: string[];
  portfolio_urls: string[];
}

interface Event {
  id: string;
  title: string;
}

interface Filters {
  category: string;
  location: string;
  keywords: string[];
  availability: string;
}

const requestSchema = z.object({
  event_id: z.string().min(1, "Please select an event"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type RequestForm = z.infer<typeof requestSchema>;

const CATEGORIES = [
  "Actor", "Cinematographer", "Director", "Editor", "Producer", 
  "Sound Engineer", "Makeup Artist", "Costume Designer", "Writer", "Voice Actor"
];

const LOCATIONS = [
  "Los Angeles, CA", "New York, NY", "Atlanta, GA", "Chicago, IL", 
  "London, UK", "Toronto, ON", "Vancouver, BC", "Austin, TX"
];

export default function ExploreCreators() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [keywordInput, setKeywordInput] = useState("");
  const [filters, setFilters] = useState<Filters>({
    category: "all",
    location: "all",
    keywords: [],
    availability: "all",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      event_id: "",
      message: "",
    },
  });

  const itemsPerPage = 12;

  useEffect(() => {
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

    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title')
          .eq('client_id', user.id)
          .eq('status', 'active');

        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, [user]);

  useEffect(() => {
    fetchCreators();
  }, [filters, currentPage]);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('users')
        .select('id, name, location, description, keywords, portfolio_urls', { count: 'exact' })
        .eq('role', 'creator');

      // Apply filters
      if (filters.category && filters.category !== "all") {
        query = query.contains('keywords', [filters.category.toLowerCase()]);
      }
      
      if (filters.location && filters.location !== "all") {
        query = query.ilike('location', `%${filters.location}%`);
      }

      if (filters.keywords.length > 0) {
        query = query.overlaps('keywords', filters.keywords);
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setCreators(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error fetching creators:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load creators. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const addKeyword = (keyword: string) => {
    if (keyword.trim() && !filters.keywords.includes(keyword.trim())) {
      setFilters(prev => ({
        ...prev,
        keywords: [...prev.keywords, keyword.trim().toLowerCase()]
      }));
      setKeywordInput("");
      setCurrentPage(1);
    }
  };

  const removeKeyword = (index: number) => {
    setFilters(prev => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index)
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      category: "all",
      location: "all",
      keywords: [],
      availability: "all",
    });
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
          filters: filters as any, // Cast to any for Json type compatibility
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

  const handleSendRequest = (creator: Creator) => {
    setSelectedCreator(creator);
    form.reset();
    setIsRequestModalOpen(true);
  };

  const onSubmitRequest = async (values: RequestForm) => {
    if (!selectedCreator || !user) return;

    setIsSendingRequest(true);
    try {
      const { error } = await supabase
        .from('applications')
        .insert({
          creator_id: selectedCreator.id,
          event_id: values.event_id,
          message: values.message,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Request Sent",
        description: `Your request has been sent to ${selectedCreator.name}.`,
      });

      setIsRequestModalOpen(false);
      setSelectedCreator(null);
    } catch (error) {
      console.error('Error sending request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send request. Please try again.",
      });
    } finally {
      setIsSendingRequest(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/client/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Explore Creators</h1>
              <p className="text-muted-foreground">Find and connect with talented creators for your projects</p>
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
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <Label>Category</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => handleFilterChange("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location Filter */}
              <div>
                <Label>Location</Label>
                <Select
                  value={filters.location}
                  onValueChange={(value) => handleFilterChange("location", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {LOCATIONS.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Availability Filter */}
              <div>
                <Label>Availability</Label>
                <Select
                  value={filters.availability}
                  onValueChange={(value) => handleFilterChange("availability", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Time</SelectItem>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="next_7_days">Next 7 days</SelectItem>
                    <SelectItem value="next_30_days">Next 30 days</SelectItem>
                    <SelectItem value="next_3_months">Next 3 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search Input */}
              <div>
                <Label>Search</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search creators..."
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addKeyword(keywordInput);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addKeyword(keywordInput)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Active Keyword Filters */}
            {filters.keywords.length > 0 && (
              <div>
                <Label className="block mb-2">Active Keywords:</Label>
                <div className="flex flex-wrap gap-2">
                  {filters.keywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {keyword}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => removeKeyword(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            {loading ? "Loading..." : `${creators.length} Creator${creators.length !== 1 ? 's' : ''} Found`}
          </h2>
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        {/* Creators Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <GlassCard key={i} className="p-6 animate-pulse">
                <div className="w-full h-40 bg-muted rounded-glass mb-4"></div>
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </GlassCard>
            ))}
          </div>
        ) : creators.length === 0 ? (
          <GlassCard className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Creators Found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters to find more creators.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {creators.map((creator) => (
              <GlassCard key={creator.id} className="p-6 hover:shadow-lg transition-shadow">
                {/* Creator Image */}
                <div className="relative mb-4">
                  {creator.portfolio_urls?.[0] ? (
                    <img
                      src={creator.portfolio_urls[0]}
                      alt={creator.name}
                      className="w-full h-40 object-cover rounded-glass"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  ) : (
                    <div className="w-full h-40 bg-muted rounded-glass flex items-center justify-center">
                      <User className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Creator Info */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg mb-1">
                      {creator.name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{creator.location}</span>
                    </div>
                  </div>

                  {/* Keywords */}
                  {creator.keywords && creator.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {creator.keywords.slice(0, 3).map((keyword, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {creator.keywords.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{creator.keywords.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  {creator.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {creator.description}
                    </p>
                  )}

                  {/* Send Request Button */}
                  <PrimaryButton
                    className="w-full"
                    onClick={() => handleSendRequest(creator)}
                    disabled={events.length === 0}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Request
                  </PrimaryButton>
                  
                  {events.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Post an event first to send requests
                    </p>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}

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
          </div>
        )}

        {/* Send Request Modal */}
        <GlassModal 
          isOpen={isRequestModalOpen} 
          onClose={() => setIsRequestModalOpen(false)}
          title={`Send Request to ${selectedCreator?.name}`}
          size="lg"
        >
          {selectedCreator && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitRequest)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="event_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Event</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose an event for this request" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {events.map((event) => (
                            <SelectItem key={event.id} value={event.id}>
                              {event.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Hi, I'd love to discuss this opportunity with you..."
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRequestModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <PrimaryButton type="submit" disabled={isSendingRequest}>
                    {isSendingRequest ? "Sending..." : "Send Request"}
                  </PrimaryButton>
                </div>
              </form>
            </Form>
          )}
        </GlassModal>
      </div>
    </div>
  );
}