import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle,
  Clock,
  MapPin,
  DollarSign,
  Calendar as CalIcon,
  MessageCircle
} from "lucide-react";
import { format, isPast, isFuture, isToday } from "date-fns";

interface BookedEvent {
  id: string;
  message: string;
  status: string;
  created_at: string;
  event: {
    id: string;
    title: string;
    description: string;
    location: string;
    budget_total: number;
    end_date: string;
    roles: any;
    client_profiles?: {
      company_name: string;
    };
  };
}

export default function CreatorBookedEvents() {
  const [bookedEvents, setBookedEvents] = useState<BookedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  const { toast } = useToast();

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
      fetchBookedEvents();
    }
  }, [user]);

  const fetchBookedEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          message,
          status,
          created_at,
          events!inner (
            id,
            title,
            description,
            location,
            budget_total,
            end_date,
            roles,
            client_profiles (
              company_name
            )
          )
        `)
        .eq('creator_id', user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = data?.map(item => ({
        id: item.id,
        message: item.message,
        status: item.status,
        created_at: item.created_at,
        event: {
          id: item.events.id,
          title: item.events.title,
          description: item.events.description,
          location: item.events.location,
          budget_total: item.events.budget_total,
          end_date: item.events.end_date,
          roles: item.events.roles,
          client_profiles: Array.isArray(item.events.client_profiles) ? item.events.client_profiles[0] : null
        }
      })) || [];

      setBookedEvents(transformedData);
    } catch (error) {
      console.error('Error fetching booked events:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load booked events.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventStatus = (endDate: string) => {
    const date = new Date(endDate);
    const now = new Date();
    
    if (isPast(date) && !isToday(date)) return 'Completed';
    if (isToday(date)) return 'Today';
    if (isFuture(date)) return 'Upcoming';
    return 'Active';
  };

  const getStatusColor = (endDate: string) => {
    const status = getEventStatus(endDate);
    switch (status) {
      case 'Completed': return 'bg-green-500/20 text-green-400';
      case 'Today': return 'bg-orange-500/20 text-orange-400';
      case 'Upcoming': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-primary/20 text-primary';
    }
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    return format(date, "MMM dd, yyyy");
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-foreground">Loading booked events...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-glass bg-primary/20">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{bookedEvents.length}</p>
              <p className="text-muted-foreground">Total Bookings</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-glass bg-blue-500/20">
              <Clock className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {bookedEvents.filter(booking => isFuture(new Date(booking.event.end_date))).length}
              </p>
              <p className="text-muted-foreground">Upcoming Events</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-glass bg-green-500/20">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {bookedEvents.filter(booking => isPast(new Date(booking.event.end_date))).length}
              </p>
              <p className="text-muted-foreground">Completed Events</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Booked Events List */}
      {bookedEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookedEvents.map((booking) => (
            <GlassCard key={booking.id} className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground text-lg">{booking.event.title}</h4>
                    {booking.event.client_profiles?.company_name && (
                      <p className="text-sm text-muted-foreground">
                        by {booking.event.client_profiles.company_name}
                      </p>
                    )}
                  </div>
                  <Badge className={getStatusColor(booking.event.end_date)}>
                    {getEventStatus(booking.event.end_date)}
                  </Badge>
                </div>

                <p className="text-muted-foreground text-sm line-clamp-2">
                  {booking.event.description}
                </p>

                <div className="space-y-2">
                  {booking.event.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{booking.event.location}</span>
                    </div>
                  )}
                  
                  {booking.event.budget_total && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>{formatBudget(booking.event.budget_total)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalIcon className="h-4 w-4" />
                    <span>{formatEventDate(booking.event.end_date)}</span>
                  </div>
                </div>

                {/* Application Message */}
                {booking.message && (
                  <div className="p-3 rounded-glass bg-background/50">
                    <p className="text-xs text-muted-foreground mb-1">Your Application:</p>
                    <p className="text-sm text-foreground line-clamp-2">{booking.message}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      // In a real app, this would open a contact modal or redirect to messaging
                      toast({
                        title: "Contact Feature",
                        description: "Contact functionality would be implemented here.",
                      });
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact Client
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Booked Events</h3>
            <p className="text-muted-foreground mb-4">
              You haven't been accepted for any events yet. Keep applying!
            </p>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Explore Events
            </Button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}