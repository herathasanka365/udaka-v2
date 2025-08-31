import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { Button } from "@/components/ui/button";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  ArrowLeft, 
  Calendar,
  DollarSign,
  MapPin,
  User,
  Star,
  MessageSquare,
  Clock,
  CheckCircle
} from "lucide-react";
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns";

interface BookedEvent {
  id: string;
  event: {
    id: string;
    title: string;
    description: string;
    location: string;
    budget_total: number;
    end_date: string;
    client_id: string;
    users?: {
      name: string;
      email: string;
    };
  };
  status: string;
  created_at: string;
  feedback?: {
    rating: number;
    comment: string;
    submitted_at: string;
  };
}

const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(10, "Feedback must be at least 10 characters"),
});

type FeedbackForm = z.infer<typeof feedbackSchema>;

export default function CreatorBookedEvents() {
  const [bookedEvents, setBookedEvents] = useState<BookedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState<BookedEvent | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<FeedbackForm>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      rating: 0,
      comment: "",
    },
  });

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
    fetchBookedEvents();
  }, [user]);

  const fetchBookedEvents = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          created_at,
          message,
          events (
            id,
            title,
            description,
            location,
            budget_total,
            end_date,
            client_id
          )
        `)
        .eq('creator_id', user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch client profiles separately for each event
      const eventsWithClientInfo = await Promise.all(
        (data || []).map(async (application) => {
          const { data: clientProfile } = await supabase
            .from('profiles')
            .select('display_name, email')
            .eq('id', application.events.client_id)
            .single();

          return {
            ...application,
            events: {
              ...application.events,
              client: clientProfile || { display_name: 'Unknown', email: '' }
            }
          };
        })
      );

      // Transform the data and parse any existing feedback
      const transformedEvents: BookedEvent[] = eventsWithClientInfo.map(application => {
        let feedback = null;
        try {
          // Try to parse feedback from message field if it contains JSON
          const messageObj = JSON.parse(application.message || '{}');
          if (messageObj.feedback) {
            feedback = messageObj.feedback;
          }
        } catch {
          // If parsing fails, no feedback exists
        }

        return {
          id: application.id,
          event: {
            ...application.events,
            users: {
              name: application.events.client?.display_name || 'Unknown',
              email: application.events.client?.email || ''
            }
          },
          status: application.status,
          created_at: application.created_at,
          feedback,
        };
      });

      setBookedEvents(transformedEvents);
    } catch (error) {
      console.error('Error fetching booked events:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load booked events. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventStatus = (event: BookedEvent) => {
    const now = new Date();
    const eventDate = new Date(event.event.end_date);
    const eventEndDate = addDays(eventDate, 1); // Assume event lasts a day

    if (isBefore(now, eventDate)) {
      return 'Upcoming';
    } else if (isAfter(now, eventDate) && isBefore(now, eventEndDate)) {
      return 'In Progress';
    } else {
      return 'Completed';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Upcoming':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Completed':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleFeedbackSubmit = (event: BookedEvent) => {
    setSelectedEvent(event);
    setRating(event.feedback?.rating || 0);
    form.reset({
      rating: event.feedback?.rating || 0,
      comment: event.feedback?.comment || "",
    });
    setIsFeedbackModalOpen(true);
  };

  const onSubmitFeedback = async (values: FeedbackForm) => {
    if (!selectedEvent || !user) return;

    setSubmittingFeedback(true);
    try {
      // Create feedback object
      const feedback = {
        rating: values.rating,
        comment: values.comment,
        submitted_at: new Date().toISOString(),
      };

      // Update the application with feedback
      // We'll store feedback in the message field as JSON
      const updatedMessage = JSON.stringify({
        original_message: selectedEvent.event.description,
        feedback,
      });

      const { error } = await supabase
        .from('applications')
        .update({ message: updatedMessage })
        .eq('id', selectedEvent.id);

      if (error) throw error;

      // Update local state
      setBookedEvents(prev => prev.map(event => 
        event.id === selectedEvent.id 
          ? { ...event, feedback }
          : event
      ));

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! It helps improve our platform.",
      });

      setIsFeedbackModalOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(budget);
  };

  const StarRating = ({ rating, onRatingChange, readonly = false }: { 
    rating: number; 
    onRatingChange?: (rating: number) => void; 
    readonly?: boolean;
  }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !readonly && onRatingChange?.(star)}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
            disabled={readonly}
          >
            <Star
              className={`h-5 w-5 ${
                star <= rating 
                  ? 'text-yellow-400 fill-yellow-400' 
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/creator/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Booked Events</h1>
              <p className="text-muted-foreground">Manage your confirmed gigs and provide feedback</p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <GlassCard>
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

          <GlassCard>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-glass bg-orange-500/20">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {bookedEvents.filter(e => getEventStatus(e) === 'Upcoming').length}
                </p>
                <p className="text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-glass bg-green-500/20">
                <Star className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {bookedEvents.filter(e => e.feedback).length}
                </p>
                <p className="text-muted-foreground">Reviewed</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Events List */}
        {bookedEvents.length === 0 ? (
          <GlassCard className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Booked Events</h3>
            <p className="text-muted-foreground mb-4">
              Once you get accepted for events, they'll appear here.
            </p>
            <Button onClick={() => navigate("/creator/explore")}>
              Explore Events
            </Button>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            {bookedEvents.map((event) => {
              const status = getEventStatus(event);
              const canProvideFeedback = status === 'Completed';
              
              return (
                <GlassCard key={event.id} className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    {/* Event Details */}
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <h3 className="text-xl font-semibold text-foreground">
                          {event.event.title}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(status)}>
                          {status}
                        </Badge>
                      </div>

                      <p className="text-muted-foreground">
                        {event.event.description}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>Client: {event.event.users?.name || 'Unknown'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{event.event.location}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>Budget: {formatBudget(event.event.budget_total)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Date: {format(new Date(event.event.end_date), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>

                      {/* Existing Feedback */}
                      {event.feedback && (
                        <div className="p-4 rounded-glass bg-primary/5 border border-primary/20">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            <span className="font-medium text-foreground">Your Feedback</span>
                          </div>
                          <div className="space-y-2">
                            <StarRating rating={event.feedback.rating} readonly />
                            <p className="text-sm text-muted-foreground">
                              "{event.feedback.comment}"
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Submitted on {format(new Date(event.feedback.submitted_at), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="lg:w-48 space-y-2">
                      {canProvideFeedback && (
                        <PrimaryButton
                          className="w-full"
                          onClick={() => handleFeedbackSubmit(event)}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          {event.feedback ? 'Update Feedback' : 'Leave Feedback'}
                        </PrimaryButton>
                      )}
                      
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(`mailto:${event.event.users?.email}`, '_blank')}
                      >
                        Contact Client
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Feedback Modal */}
        <GlassModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          title={`Feedback for ${selectedEvent?.event.title}`}
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitFeedback)} className="space-y-6">
              <div className="space-y-2">
                <Label>Overall Rating</Label>
                <StarRating
                  rating={rating}
                  onRatingChange={(newRating) => {
                    setRating(newRating);
                    form.setValue('rating', newRating);
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  Rate your overall experience working on this project
                </p>
              </div>

              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback Comment</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share your experience working on this project. What went well? Any suggestions for improvement?"
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
                  onClick={() => setIsFeedbackModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </SecondaryButton>
                <PrimaryButton 
                  type="submit" 
                  disabled={submittingFeedback || rating === 0} 
                  className="flex-1"
                >
                  {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                </PrimaryButton>
              </div>
            </form>
          </Form>
        </GlassModal>
      </div>
    </div>
  );
}
