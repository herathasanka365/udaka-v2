import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Star, Send, User } from "lucide-react";

interface Creator {
  id: string;
  name: string;
  category: string;
  bio: string;
  age: number;
  keywords: string[];
  profiles: {
    location: string;
  };
}

interface Event {
  id: string;
  title: string;
  event_roles: Array<{
    id: string;
    role_name: string;
  }>;
}

interface ClientExploreCreatorsTabProps {
  userId: string;
}

export default function ClientExploreCreatorsTab({ userId }: ClientExploreCreatorsTabProps) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [inviteForm, setInviteForm] = useState({
    eventId: "",
    roleId: "",
    message: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCreators();
    fetchUserEvents();
  }, [userId]);

  useEffect(() => {
    filterCreators();
  }, [creators, searchTerm, categoryFilter, locationFilter]);

  const fetchCreators = async () => {
    try {
      const { data, error } = await supabase
        .from('creator_profiles')
        .select(`
          *,
          profiles (location)
        `);

      if (error) throw error;
      setCreators(data || []);
    } catch (error) {
      console.error('Error fetching creators:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load creators",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          event_roles (id, role_name)
        `)
        .eq('client_id', userId)
        .eq('status', 'active');

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const filterCreators = () => {
    let filtered = creators;

    if (searchTerm) {
      filtered = filtered.filter(creator =>
        creator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creator.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creator.keywords?.some(keyword => 
          keyword.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter(creator => creator.category === categoryFilter);
    }

    if (locationFilter) {
      filtered = filtered.filter(creator => 
        creator.profiles?.location?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    setFilteredCreators(filtered);
  };

  const sendInvite = async () => {
    if (!inviteForm.eventId || !inviteForm.roleId || !selectedCreator) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('requests')
        .insert({
          client_id: userId,
          creator_id: selectedCreator.id,
          event_id: inviteForm.eventId,
          event_role_id: inviteForm.roleId,
          message: inviteForm.message,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invitation sent successfully",
      });

      setInviteForm({ eventId: "", roleId: "", message: "" });
      setSelectedCreator(null);
    } catch (error) {
      console.error('Error sending invite:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send invitation",
      });
    }
  };

  const getUniqueCategories = () => {
    return [...new Set(creators.map(creator => creator.category))];
  };

  if (loading) {
    return <div className="text-center py-8">Loading creators...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Find Creators</CardTitle>
          <CardDescription>Search and filter creators by skills and location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, category, keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {getUniqueCategories().map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="Filter by location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCreators.map((creator) => (
          <Card key={creator.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {creator.name}
                  </CardTitle>
                  <Badge variant="secondary">{creator.category}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {creator.bio && (
                <CardDescription className="line-clamp-3">
                  {creator.bio}
                </CardDescription>
              )}

              <div className="space-y-2 text-sm">
                {creator.age && (
                  <p><strong>Age:</strong> {creator.age}</p>
                )}
                {creator.profiles?.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{creator.profiles.location}</span>
                  </div>
                )}
              </div>

              {creator.keywords && creator.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {creator.keywords.slice(0, 3).map((keyword) => (
                    <Badge key={keyword} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                  {creator.keywords.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{creator.keywords.length - 3} more
                    </Badge>
                  )}
                </div>
              )}

              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full"
                    onClick={() => setSelectedCreator(creator)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Invite to Project
                  </Button>
                </DialogTrigger>
                {selectedCreator?.id === creator.id && (
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite {selectedCreator?.name}</DialogTitle>
                      <DialogDescription>
                        Send an invitation to this creator for one of your events
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Select Event *</Label>
                        <Select 
                          value={inviteForm.eventId} 
                          onValueChange={(value) => {
                            setInviteForm(prev => ({ ...prev, eventId: value, roleId: "" }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose an event" />
                          </SelectTrigger>
                          <SelectContent>
                            {events.map((event) => (
                              <SelectItem key={event.id} value={event.id}>
                                {event.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Select Role *</Label>
                        <Select 
                          value={inviteForm.roleId} 
                          onValueChange={(value) => setInviteForm(prev => ({ ...prev, roleId: value }))}
                          disabled={!inviteForm.eventId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a role" />
                          </SelectTrigger>
                          <SelectContent>
                            {events
                              .find(e => e.id === inviteForm.eventId)
                              ?.event_roles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.role_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Personal Message</Label>
                        <Textarea
                          value={inviteForm.message}
                          onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Add a personal message to your invitation..."
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setSelectedCreator(null);
                            setInviteForm({ eventId: "", roleId: "", message: "" });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button onClick={sendInvite}>
                          Send Invitation
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                )}
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCreators.length === 0 && !loading && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">No creators found</h3>
          <p className="text-muted-foreground">Try adjusting your search filters</p>
        </div>
      )}

      {events.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-medium mb-2">No active events</h3>
            <p className="text-muted-foreground mb-4">
              You need to create an event before you can invite creators
            </p>
            <Button>Create Your First Event</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}