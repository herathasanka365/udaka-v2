import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, User, MapPin, DollarSign, CheckCircle, XCircle, Clock } from "lucide-react";

interface Booking {
  id: string;
  status: string;
  notes: string;
  final_budget: number;
  start_date: string;
  end_date: string;
  created_at: string;
  creator_profiles: {
    name: string;
    category: string;
  } | null;
  events: {
    title: string;
    location: string;
  } | null;
  event_roles: {
    role_name: string;
  } | null;
}

interface ClientBookingsTabProps {
  userId: string;
}

export default function ClientBookingsTab({ userId }: ClientBookingsTabProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, [userId]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          creator_profiles (name, category),
          events (title, location),
          event_roles (role_name)
        `)
        .eq('client_id', userId)
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
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const filteredBookings = filterStatus === "all" 
    ? bookings 
    : bookings.filter(booking => booking.status === filterStatus);

  if (loading) {
    return <div className="text-center py-8">Loading bookings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bookings</h2>
          <p className="text-muted-foreground">Manage your confirmed bookings and collaborations</p>
        </div>
        
        <div className="w-48">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${bookings.reduce((sum, booking) => sum + (booking.final_budget || 0), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredBookings.map((booking) => (
          <Card key={booking.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(booking.status)}
                    {booking.creator_profiles?.name || 'Unknown Creator'}
                  </CardTitle>
                  <CardDescription>
                    {booking.events?.title || 'Unknown Event'} • {booking.event_roles?.role_name || 'Unknown Role'}
                  </CardDescription>
                </div>
                <Badge variant={getStatusColor(booking.status) as any}>
                  {booking.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.creator_profiles?.category || 'Unknown Category'}</span>
                </div>
                
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
        ))}
      </div>

      {filteredBookings.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {filterStatus === "all" ? "No bookings yet" : `No ${filterStatus} bookings`}
          </h3>
          <p className="text-muted-foreground">
            {filterStatus === "all" 
              ? "When creators accept your invitations, confirmed bookings will appear here"
              : `You don't have any ${filterStatus} bookings at the moment`
            }
          </p>
        </div>
      )}
    </div>
  );
}