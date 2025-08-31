import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Clock, CheckCircle, XCircle, MapPin, DollarSign, Calendar } from "lucide-react";

interface Invitation {
  id: string;
  message: string;
  status: string;
  created_at: string;
  event_id: string;
  event_role_id?: string;
  notes?: string;
  events: {
    title: string;
    description: string;
    location: string;
    budget_total: number;
    end_date: string;
    client_id: string;
  } | null;
  event_roles?: {
    role_name: string;
    role_budget: number;
  } | null;
  client_profiles: {
    company_name: string;
  } | null;
}

interface CreatorInvitationsTabProps {
  userId: string;
}

export default function CreatorInvitationsTab({ userId }: CreatorInvitationsTabProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;
    fetchInvitations();
  }, [userId]);

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          events (title, description, location, budget_total, end_date, client_id),
          event_roles (role_name, role_budget)
        `)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique client IDs
      const clientIds = [...new Set((data || []).map(req => req.events?.client_id).filter(Boolean))];

      // Fetch client profiles
      const { data: clientProfiles, error: profilesError } = await supabase
        .from('client_profiles')
        .select('id, company_name')
        .in('id', clientIds);

      if (profilesError) throw profilesError;

      // Create a map for quick lookup
      const profilesMap = (clientProfiles || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Add client profiles to invitations
      const formattedInvitations: Invitation[] = (data || []).map(invitation => ({
        ...invitation,
        client_profiles: invitation.events?.client_id ? profilesMap[invitation.events.client_id] : null,
      }));

      setInvitations(formattedInvitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load invitations",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateInvitationStatus = async (invitationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status })
        .eq('id', invitationId);

      if (error) throw error;

      // If accepted, create a booking
      if (status === 'accepted') {
        const invitation = invitations.find(inv => inv.id === invitationId);
        if (invitation) {
        const { error: bookingError } = await supabase
          .from('bookings')
          .insert({
            creator_id: userId,
            client_id: invitation.events?.client_id,
            event_id: invitation.event_id,
            event_role_id: invitation.event_role_id || null,
            status: 'confirmed',
            final_budget: invitation.event_roles?.role_budget || invitation.events?.budget_total,
            notes: invitation.message
          });

          if (bookingError) {
            console.error('Error creating booking:', bookingError);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to create booking after accepting invitation",
            });
            return;
          }
        }
      }

      // Update local state
      setInvitations(prev => prev.map(inv => 
        inv.id === invitationId ? { ...inv, status } : inv
      ));

      toast({
        title: "Success",
        description: `Invitation ${status}${status === 'accepted' ? ' and booking created' : ''}`,
      });
    } catch (error) {
      console.error('Error updating invitation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update invitation",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'accepted':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const filterInvitationsByStatus = (status: string) => {
    return invitations.filter(inv => inv.status === status);
  };

  if (loading) {
    return <div className="text-center py-8">Loading invitations...</div>;
  }

  const pendingInvitations = filterInvitationsByStatus('pending');
  const acceptedInvitations = filterInvitationsByStatus('accepted');
  const rejectedInvitations = filterInvitationsByStatus('rejected');

  const InvitationCard = ({ invitation }: { invitation: Invitation }) => (
    <Card key={invitation.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(invitation.status)}
              {invitation.events?.title || 'Unknown Event'}
            </CardTitle>
            <CardDescription>
              From {invitation.client_profiles?.company_name || 'Unknown Client'}
              {invitation.event_roles?.role_name && ` • ${invitation.event_roles.role_name}`}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={getStatusColor(invitation.status) as any}>
              {invitation.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(invitation.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          {invitation.events?.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{invitation.events.location}</span>
            </div>
          )}

          {(invitation.event_roles?.role_budget || invitation.events?.budget_total) && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>
                ${(invitation.event_roles?.role_budget || invitation.events?.budget_total)?.toLocaleString()}
              </span>
            </div>
          )}

          {invitation.events?.end_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Event Date: {new Date(invitation.events.end_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {invitation.events?.description && (
          <div>
            <p className="text-sm font-medium mb-1">Event Description:</p>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
              {invitation.events.description}
            </p>
          </div>
        )}

        {invitation.message && (
          <div>
            <p className="text-sm font-medium mb-1">Client Message:</p>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
              {invitation.message}
            </p>
          </div>
        )}

        {invitation.status === 'pending' && (
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => updateInvitationStatus(invitation.id, 'accepted')}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Accept
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => updateInvitationStatus(invitation.id, 'rejected')}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invitations</h2>
          <p className="text-muted-foreground">Manage invitations from clients</p>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({invitations.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingInvitations.length})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted ({acceptedInvitations.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Declined ({rejectedInvitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {invitations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invitations.map((invitation) => (
                <InvitationCard key={invitation.id} invitation={invitation} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No invitations yet</h3>
              <p className="text-muted-foreground">
                When clients invite you to events, they'll appear here
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingInvitations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingInvitations.map((invitation) => (
                <InvitationCard key={invitation.id} invitation={invitation} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No pending invitations</h3>
              <p className="text-muted-foreground">
                All invitations have been responded to
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-4">
          {acceptedInvitations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {acceptedInvitations.map((invitation) => (
                <InvitationCard key={invitation.id} invitation={invitation} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No accepted invitations</h3>
              <p className="text-muted-foreground">
                Accepted invitations will appear here
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedInvitations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rejectedInvitations.map((invitation) => (
                <InvitationCard key={invitation.id} invitation={invitation} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No declined invitations</h3>
              <p className="text-muted-foreground">
                Declined invitations will appear here
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}