import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Eye, 
  Edit, 
  Archive, 
  Plus,
  ArrowLeft,
  Calendar,
  MapPin,
  DollarSign
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'closed';
  keywords: string[];
  roles: any; // Using any for now as roles come as Json from Supabase
  budget_total: number;
  end_date: string;
  location: string;
  views: number;
  created_at: string;
  applications?: Array<{ id: string }>;
}

export default function MyPosts() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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
        const { data: events, error } = await supabase
          .from('events')
          .select(`
            *,
            applications(id)
          `)
          .eq('client_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setEvents(events || []);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your events. Please refresh the page.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

    // Set up real-time updates for applications
    const channel = supabase
      .channel('events-applications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications'
        },
        () => {
          // Refetch events when applications change
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const handleArchive = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: 'closed' })
        .eq('id', eventId);

      if (error) throw error;

      // Update local state
      setEvents(events.map(event => 
        event.id === eventId 
          ? { ...event, status: 'closed' as const }
          : event
      ));

      toast({
        title: "Event Archived",
        description: "Event has been successfully archived.",
      });
    } catch (error) {
      console.error('Error archiving event:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to archive event. Please try again.",
      });
    }
  };

  const handleView = (event: Event) => {
    setSelectedEvent(event);
    setIsViewModalOpen(true);
  };

  const handleEdit = (event: Event) => {
    setSelectedEvent(event);
    setIsEditModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
        Active
      </Badge>
    ) : (
      <Badge variant="secondary">
        Closed
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading your events...</div>
      </div>
    );
  }

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
              <h1 className="text-3xl font-bold text-foreground">My Events</h1>
              <p className="text-muted-foreground">Manage your posted events and applications</p>
            </div>
          </div>
          
          <Button onClick={() => navigate("/client/post-event")}>
            <Plus className="h-4 w-4 mr-2" />
            Post New Event
          </Button>
        </div>

        {/* Events Table */}
        <GlassCard>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Events Posted</h3>
              <p className="text-muted-foreground mb-4">
                You haven't posted any events yet. Create your first event to start finding talent.
              </p>
              <Button onClick={() => navigate("/client/post-event")}>
                <Plus className="h-4 w-4 mr-2" />
                Post Your First Event
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applications</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{event.title}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {event.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(event.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">
                            {event.applications?.length || 0}
                          </span>
                          <span className="text-muted-foreground text-sm">applications</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span>{event.views}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>{event.budget_total.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(event.end_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(event)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(event)}
                            disabled={event.status === 'closed'}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={event.status === 'closed'}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Archive Event</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to archive "{event.title}"? 
                                  This will close the event and stop accepting new applications.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleArchive(event.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Archive
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </GlassCard>

        {/* View Event Modal */}
        <GlassModal 
          isOpen={isViewModalOpen} 
          onClose={() => setIsViewModalOpen(false)}
          title="Event Details"
        >
          {selectedEvent && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {selectedEvent.title}
                </h3>
                <p className="text-muted-foreground">{selectedEvent.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Status</h4>
                  {getStatusBadge(selectedEvent.status)}
                </div>
                
                <div>
                  <h4 className="font-medium text-foreground mb-2">Applications</h4>
                  <p>{selectedEvent.applications?.length || 0} received</p>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2">Total Budget</h4>
                  <p>${selectedEvent.budget_total.toLocaleString()}</p>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2">Deadline</h4>
                  <p>{new Date(selectedEvent.end_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">Location</h4>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedEvent.location}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.keywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary">{keyword}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">Roles</h4>
                <div className="space-y-3">
                  {(selectedEvent.roles as Array<{role: string; budget: number; requirements: string}>).map((role, index) => (
                    <div key={index} className="border-l-2 border-primary pl-4">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium">{role.role}</h5>
                        <span className="text-sm text-muted-foreground">
                          ${role.budget.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {role.requirements}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </GlassModal>

        {/* Edit Event Modal */}
        <GlassModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Event"
        >
          {selectedEvent && (
            <div className="text-center py-8">
              <Edit className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Edit Event</h3>
              <p className="text-muted-foreground mb-4">
                Event editing functionality will be available soon. For now, you can archive 
                the event and create a new one with updated information.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)}
              >
                Close
              </Button>
            </div>
          )}
        </GlassModal>
      </div>
    </div>
  );
}