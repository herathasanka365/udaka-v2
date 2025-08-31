import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Clock, CheckCircle, XCircle, RotateCcw, Trash2 } from "lucide-react";

interface Request {
  id: string;
  message: string;
  status: string;
  created_at: string;
  creator_id: string;
  event_id: string;
  event_role_id?: string;
  type: 'outgoing' | 'incoming'; // outgoing = client sent invite, incoming = creator applied
  creator_profiles: {
    name: string;
    category: string;
  } | null;
  events: {
    title: string;
  } | null;
  event_roles?: {
    role_name: string;
  } | null;
}

interface ClientRequestsTabProps {
  userId: string;
}

export default function ClientRequestsTab({ userId }: ClientRequestsTabProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, [userId]);

  const fetchRequests = async () => {
    try {
      // Fetch outgoing requests (client sent invites)
      const { data: outgoingRequests, error: outgoingError } = await supabase
        .from('requests')
        .select('*')
        .eq('client_id', userId)
        .order('created_at', { ascending: false });

      if (outgoingError) throw outgoingError;

      // Fetch incoming applications (creators applied to client's events)
      // First get the client's events
      const { data: clientEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, title')
        .eq('client_id', userId);

      if (eventsError) throw eventsError;

      const eventIds = clientEvents?.map(event => event.id) || [];
      
      let incomingApplications: any[] = [];
      if (eventIds.length > 0) {
        const { data, error: incomingError } = await supabase
          .from('applications')
          .select('*')
          .in('event_id', eventIds)
          .order('created_at', { ascending: false });

        if (incomingError) throw incomingError;
        incomingApplications = data || [];
      }

      // Get all unique creator IDs
      const allCreatorIds = [
        ...(outgoingRequests || []).map(req => req.creator_id),
        ...(incomingApplications || []).map(app => app.creator_id)
      ].filter((id, index, arr) => arr.indexOf(id) === index);

      // Fetch creator profiles for all creators
      const { data: creatorProfiles, error: profilesError } = await supabase
        .from('creator_profiles')
        .select('id, name, category')
        .in('id', allCreatorIds);

      if (profilesError) throw profilesError;

      // Create a map for quick lookup
      const profilesMap = (creatorProfiles || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Create events map for applications
      const eventsMap = (clientEvents || []).reduce((acc, event) => {
        acc[event.id] = event;
        return acc;
      }, {} as Record<string, any>);

      // Fetch event details for outgoing requests
      const outgoingEventIds = (outgoingRequests || []).map(req => req.event_id);
      if (outgoingEventIds.length > 0) {
        const { data: outgoingEvents } = await supabase
          .from('events')
          .select('id, title')
          .in('id', outgoingEventIds);

        // Merge outgoing events into eventsMap
        (outgoingEvents || []).forEach(event => {
          eventsMap[event.id] = event;
        });
      }

      // Fetch event roles for outgoing requests
      const outgoingRoleIds = (outgoingRequests || []).filter(req => req.event_role_id).map(req => req.event_role_id);
      let rolesMap = {};
      if (outgoingRoleIds.length > 0) {
        const { data: eventRoles } = await supabase
          .from('event_roles')
          .select('id, role_name')
          .in('id', outgoingRoleIds);

        rolesMap = (eventRoles || []).reduce((acc, role) => {
          acc[role.id] = role;
          return acc;
        }, {} as Record<string, any>);
      }

      // Transform outgoing requests to match our interface
      const formattedOutgoing: Request[] = (outgoingRequests || []).map(req => ({
        id: req.id,
        message: req.message || '',
        status: req.status,
        created_at: req.created_at,
        creator_id: req.creator_id,
        event_id: req.event_id,
        event_role_id: req.event_role_id,
        type: 'outgoing' as const,
        creator_profiles: profilesMap[req.creator_id] ? {
          name: profilesMap[req.creator_id].name,
          category: profilesMap[req.creator_id].category
        } : null,
        events: eventsMap[req.event_id] ? {
          title: eventsMap[req.event_id].title
        } : null,
        event_roles: req.event_role_id && rolesMap[req.event_role_id] ? {
          role_name: rolesMap[req.event_role_id].role_name
        } : null,
      }));

      // Transform incoming applications to match our interface  
      const formattedIncoming: Request[] = (incomingApplications || []).map(app => ({
        id: app.id,
        message: app.message || '',
        status: app.status,
        created_at: app.created_at,
        creator_id: app.creator_id,
        event_id: app.event_id,
        event_role_id: undefined,
        type: 'incoming' as const,
        creator_profiles: profilesMap[app.creator_id] ? {
          name: profilesMap[app.creator_id].name,
          category: profilesMap[app.creator_id].category
        } : null,
        events: eventsMap[app.event_id] ? {
          title: eventsMap[app.event_id].title
        } : null,
        event_roles: null,
      }));

      const allRequests = [...formattedOutgoing, ...formattedIncoming]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRequests(allRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load requests",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: string, requestType: 'outgoing' | 'incoming') => {
    try {
      const table = requestType === 'outgoing' ? 'requests' : 'applications';
      const { error } = await supabase
        .from(table)
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;

      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status } : req
      ));

      const actionText = requestType === 'outgoing' ? 'Request' : 'Application';
      toast({
        title: "Success",
        description: `${actionText} ${status}`,
      });
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update request",
      });
    }
  };

  const resendRequest = async (requestId: string, requestType: 'outgoing' | 'incoming') => {
    await updateRequestStatus(requestId, 'pending', requestType);
  };

  const cancelRequest = async (requestId: string, requestType: 'outgoing' | 'incoming') => {
    await updateRequestStatus(requestId, 'cancelled', requestType);
  };

  const acceptApplication = async (requestId: string) => {
    try {
      console.log('Accepting application:', requestId);
      
      // Update application status to accepted
      const { error } = await supabase
        .from('applications')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) {
        console.error('Failed to update application:', error);
        throw error;
      }

      // Get application details from local state
      const application = requests.find(req => req.id === requestId && req.type === 'incoming');
      
      if (application) {
        // Get event roles for booking
        const { data: eventRoles } = await supabase
          .from('event_roles')
          .select('id')
          .eq('event_id', application.event_id)
          .limit(1)
          .maybeSingle();

        // Create booking
        const { error: bookingError } = await supabase
          .from('bookings')
          .insert({
            creator_id: application.creator_id,
            client_id: userId,
            event_id: application.event_id,
            event_role_id: eventRoles?.id || null,
            status: 'confirmed',
            notes: application.message || ''
          });

        if (bookingError) {
          console.error('Failed to create booking:', bookingError);
          throw bookingError;
        }
      }

      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'accepted' } : req
      ));

      toast({
        title: "Success",
        description: "Application accepted and booking created",
      });

      // Refresh requests
      fetchRequests();
    } catch (error: any) {
      console.error('Error accepting application:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to accept application",
      });
    }
  };

  const rejectApplication = async (requestId: string) => {
    await updateRequestStatus(requestId, 'rejected', 'incoming');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <Trash2 className="h-4 w-4 text-gray-500" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'accepted':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const filterRequestsByStatus = (status: string) => {
    return requests.filter(req => req.status === status);
  };

  if (loading) {
    return <div className="text-center py-8">Loading requests...</div>;
  }

  const pendingRequests = filterRequestsByStatus('pending');
  const acceptedRequests = filterRequestsByStatus('accepted');
  const rejectedRequests = filterRequestsByStatus('rejected');
  const cancelledRequests = filterRequestsByStatus('cancelled');

  const RequestCard = ({ request }: { request: Request }) => (
    <Card key={request.id}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(request.status)}
              {request.creator_profiles?.name || 'Unknown Creator'}
            </CardTitle>
            <CardDescription>
              {request.events?.title || 'Unknown Event'} 
              {request.event_roles?.role_name && ` • ${request.event_roles.role_name}`}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {request.type === 'outgoing' ? 'Sent Invite' : 'Application'}
              </Badge>
              <Badge variant={getStatusColor(request.status) as any}>
                {request.status}
              </Badge>
            </div>
            <span className="text-sm text-muted-foreground">
              {new Date(request.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">Creator Category:</p>
          <Badge variant="outline">{request.creator_profiles?.category || 'Unknown'}</Badge>
        </div>

        {request.message && (
          <div>
            <p className="text-sm font-medium mb-1">
              {request.type === 'outgoing' ? 'Your Message:' : 'Application Message:'}
            </p>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
              {request.message}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {/* Actions for outgoing requests (client sent invites) */}
          {request.type === 'outgoing' && request.status === 'pending' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => cancelRequest(request.id, request.type)}
            >
              Cancel
            </Button>
          )}
          
          {request.type === 'outgoing' && (request.status === 'rejected' || request.status === 'cancelled') && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => resendRequest(request.id, request.type)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Resend
            </Button>
          )}

          {/* Actions for incoming applications (creators applied) */}
          {request.type === 'incoming' && request.status === 'pending' && (
            <>
              <Button 
                size="sm" 
                onClick={() => acceptApplication(request.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => rejectApplication(request.id)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Requests & Applications</h2>
          <p className="text-muted-foreground">Track your sent invitations and received applications</p>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            All ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted ({acceptedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({cancelledRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {requests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No requests yet</h3>
              <p className="text-muted-foreground">
                Start exploring creators and send your first invitation
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No pending requests</h3>
              <p className="text-muted-foreground">
                All your invitations have been responded to
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-4">
          {acceptedRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {acceptedRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No accepted requests</h3>
              <p className="text-muted-foreground">
                When creators accept your invitations, they'll appear here
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rejectedRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No rejected requests</h3>
              <p className="text-muted-foreground">
                Rejected invitations will appear here
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {cancelledRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cancelledRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No cancelled requests</h3>
              <p className="text-muted-foreground">
                Cancelled invitations will appear here
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}