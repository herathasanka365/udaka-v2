import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, User, MapPin, DollarSign, CheckCircle, Clock, XCircle } from "lucide-react";

interface Booking {
  id: string;
  status: string;
  notes: string;
  final_budget: number;
  start_date: string;
  end_date: string;
  created_at: string;
  events: {
    title: string;
    location: string;
    description: string;
  } | null;
  event_roles: {
    role_name: string;
  } | null;
  client_profiles: {
    company_name: string;
  } | null;
}

interface Application {
  id: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  applied_at: string;
  events: {
    title: string;
    location: string;
    budget_total: number;
    end_date: string;
  } | null;
  event_roles: {
    role_name: string;
  } | null;
}

interface CreatorBookedEventsTabProps {
  userId: string;
}

export default function CreatorBookedEventsTab({ userId }: CreatorBookedEventsTabProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;
    fetchBookings();
    fetchApplications();
  }, [userId]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          events (title, location, description)
        `)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings((data as any) || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load bookings",
      });
    }
  };

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          events (title, location, budget_total, end_date)
        `)
        .eq('creator_id', userId)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      setApplications((data as any) || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load applications",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;

      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId ? { ...booking, status } : booking
      ));

      toast({
        title: "Success",
        description: `Booking marked as ${status}`,
      });
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update booking",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'accepted':
        return 'default';
      case 'completed':
        return 'default';
      case 'cancelled':
      case 'rejected':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading bookings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Bookings & Applications</h2>
        <p className="text-muted-foreground">
          Track your confirmed bookings and application status
        </p>
      </div>

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bookings">
            Bookings ({bookings.length})
          </TabsTrigger>
          <TabsTrigger value="applications">
            Applications ({applications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bookings.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {bookings.filter(b => b.status === 'confirmed').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {bookings.filter(b => b.status === 'completed').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${bookings
                    .filter(b => b.status === 'completed')
                    .reduce((sum, booking) => sum + (booking.final_budget || 0), 0)
                    .toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bookings List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bookings.length > 0 ? (
              bookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {getStatusIcon(booking.status)}
                          {booking.events?.title || 'Unknown Event'}
                        </CardTitle>
                        <CardDescription>
                          Applied on {new Date(booking.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge variant={getStatusColor(booking.status) as any}>
                        {booking.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      {booking.events?.description && (
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span className="text-sm">{booking.events.description.substring(0, 100)}...</span>
                        </div>
                      )}
                      
                      {booking.events?.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{booking.events.location}</span>
                        </div>
                      )}

                      {booking.final_budget && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>${booking.final_budget.toLocaleString()}</span>
                        </div>
                      )}

                      {(booking.start_date || booking.end_date) && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {booking.start_date && new Date(booking.start_date).toLocaleDateString()}
                            {booking.start_date && booking.end_date && " - "}
                            {booking.end_date && new Date(booking.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {booking.notes && (
                      <div className="p-3 bg-muted rounded text-sm">
                        <p className="font-medium mb-1">Notes:</p>
                        <p className="text-muted-foreground">{booking.notes}</p>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      Booked: {new Date(booking.created_at).toLocaleDateString()}
                    </div>

                    {booking.status === 'confirmed' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => updateBookingStatus(booking.id, 'completed')}
                        >
                          Mark Completed
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No bookings yet</h3>
                <p className="text-muted-foreground">
                  When you get accepted for events, they'll appear here
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          {/* Applications Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {applications.filter(a => a.status === 'pending').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Accepted</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {applications.filter(a => a.status === 'accepted').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {applications.length > 0 
                    ? Math.round((applications.filter(a => a.status === 'accepted').length / applications.length) * 100)
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Applications List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {applications.length > 0 ? (
              applications.map((application) => (
                <Card key={application.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {getStatusIcon(application.status)}
                          {application.events?.title || 'Unknown Event'}
                        </CardTitle>
                        <CardDescription>
                          Applied on {new Date(application.applied_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge variant={getStatusColor(application.status) as any}>
                        {application.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      {application.events?.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{application.events.location}</span>
                        </div>
                      )}

                      {application.events?.budget_total && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>Budget: ${application.events.budget_total.toLocaleString()}</span>
                        </div>
                      )}

                      {application.events?.end_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Deadline: {new Date(application.events.end_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {application.message && (
                      <div className="p-3 bg-muted rounded text-sm">
                        <p className="font-medium mb-1">Your application:</p>
                        <p className="text-muted-foreground line-clamp-3">{application.message}</p>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      Applied: {new Date(application.applied_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No applications yet</h3>
                <p className="text-muted-foreground">
                  Start exploring events to submit your first application
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}