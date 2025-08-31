import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Users, MessageSquare, Calendar, MapPin, DollarSign } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  end_date: string;
  status: string;
  budget_total: number;
  created_at: string;
  event_roles: Array<{
    id: string;
    role_name: string;
    needed_count: number;
    role_budget: number;
  }>;
}

interface Application {
  id: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  applied_at: string;
  creator_id: string;
  event_role_id?: string;
  creator_profiles: {
    name: string;
    category: string;
  } | null;
  event_roles: {
    role_name: string;
  } | null;
}

interface Request {
  id: string;
  message: string;
  status: string;
  created_at: string;
  creator_id: string;
  event_role_id: string;
  creator_profiles: {
    name: string;
    category: string;
  };
  event_roles: {
    role_name: string;
  };
}

interface ClientMyPostsTabProps {
  userId: string;
}

export default function ClientMyPostsTab({ userId }: ClientMyPostsTabProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, [userId]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_roles (
            id,
            role_name,
            needed_count,
            role_budget
          )
        `)
        .eq('client_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load events",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEventDetails = async (eventId: string) => {
    setDetailsLoading(true);
    try {
      // Fetch applications
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('applications')
        .select(`
          *,
          creator_profiles (name, category),
          event_roles (role_name)
        `)
        .eq('event_id', eventId);

      if (applicationsError) throw applicationsError;

      // Fetch requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('requests')
        .select(`
          *,
          creator_profiles (name, category),
          event_roles (role_name)
        `)
        .eq('event_id', eventId);

      if (requestsError) throw requestsError;

      setApplications((applicationsData as any) || []);
      setRequests((requestsData as any) || []);
    } catch (error) {
      console.error('Error fetching event details:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load event details",
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, status: 'pending' | 'accepted' | 'rejected', note?: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ 
          status,
          ...(note && { notes: note })
        })
        .eq('id', applicationId);

      if (error) throw error;

      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === applicationId ? { ...app, status } as Application : app
      ));

      toast({
        title: "Success",
        description: `Application ${status}`,
      });
    } catch (error) {
      console.error('Error updating application:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update application",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading events...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Events</h2>
          <p className="text-muted-foreground">Manage your posted events and applications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <Card key={event.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                  <Badge variant={event.status === 'active' ? 'default' : 'secondary'}>
                    {event.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CardDescription className="line-clamp-3">
                {event.description}
              </CardDescription>

              <div className="space-y-2 text-sm">
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{event.location}</span>
                  </div>
                )}
                {event.end_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(event.end_date).toLocaleDateString()}</span>
                  </div>
                )}
                {event.budget_total && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>${event.budget_total}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{event.event_roles?.length || 0} roles</span>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      setSelectedEvent(event);
                      fetchEventDetails(event.id);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{selectedEvent?.title}</DialogTitle>
                    <DialogDescription>
                      Event details, applications, and invitations
                    </DialogDescription>
                  </DialogHeader>

                  {detailsLoading ? (
                    <div className="text-center py-8">Loading details...</div>
                  ) : (
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="applications">
                          Applications ({applications.length})
                        </TabsTrigger>
                        <TabsTrigger value="invitations">
                          Invitations ({requests.length})
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Event Information</h4>
                            <div className="space-y-2 text-sm">
                              <p><strong>Status:</strong> {selectedEvent?.status}</p>
                              <p><strong>Created:</strong> {selectedEvent?.created_at && new Date(selectedEvent.created_at).toLocaleDateString()}</p>
                              {selectedEvent?.location && <p><strong>Location:</strong> {selectedEvent.location}</p>}
                              {selectedEvent?.end_date && <p><strong>End Date:</strong> {new Date(selectedEvent.end_date).toLocaleDateString()}</p>}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Roles ({selectedEvent?.event_roles?.length || 0})</h4>
                            <div className="space-y-2">
                              {selectedEvent?.event_roles?.map((role) => (
                                <div key={role.id} className="p-2 border rounded">
                                  <p className="font-medium">{role.role_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Count: {role.needed_count}
                                    {role.role_budget && ` • Budget: $${role.role_budget}`}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="applications" className="space-y-4">
                        {applications.length > 0 ? (
                          <div className="space-y-4">
                            {applications.map((application) => (
                              <div key={application.id} className="p-4 border rounded-lg">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h4 className="font-medium">{application.creator_profiles.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      Applied for: {application.event_roles.role_name}
                                    </p>
                                    <Badge variant={
                                      application.status === 'accepted' ? 'default' :
                                      application.status === 'rejected' ? 'destructive' : 'secondary'
                                    }>
                                      {application.status}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {new Date(application.applied_at).toLocaleDateString()}
                                  </div>
                                </div>

                                {application.message && (
                                  <div className="mb-3">
                                    <p className="text-sm"><strong>Message:</strong></p>
                                    <p className="text-sm text-muted-foreground">{application.message}</p>
                                  </div>
                                )}

                                {application.status === 'pending' && (
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      onClick={() => updateApplicationStatus(application.id, 'accepted')}
                                    >
                                      Accept
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => updateApplicationStatus(application.id, 'rejected')}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-8">No applications yet</p>
                        )}
                      </TabsContent>

                      <TabsContent value="invitations" className="space-y-4">
                        <div className="flex justify-end mb-4">
                          <Button>
                            <Users className="h-4 w-4 mr-2" />
                            Invite Creators
                          </Button>
                        </div>

                        {requests.length > 0 ? (
                          <div className="space-y-4">
                            {requests.map((request) => (
                              <div key={request.id} className="p-4 border rounded-lg">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h4 className="font-medium">{request.creator_profiles.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      Invited for: {request.event_roles.role_name}
                                    </p>
                                    <Badge variant={
                                      request.status === 'accepted' ? 'default' :
                                      request.status === 'rejected' ? 'destructive' : 'secondary'
                                    }>
                                      {request.status}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {new Date(request.created_at).toLocaleDateString()}
                                  </div>
                                </div>

                                {request.message && (
                                  <div className="mb-3">
                                    <p className="text-sm"><strong>Your message:</strong></p>
                                    <p className="text-sm text-muted-foreground">{request.message}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-8">No invitations sent yet</p>
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">No events yet</h3>
          <p className="text-muted-foreground mb-4">Create your first event to get started</p>
          <Button>Create Event</Button>
        </div>
      )}
    </div>
  );
}