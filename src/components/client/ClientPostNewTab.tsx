import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EventRole {
  role_name: string;
  needed_count: number;
  role_budget?: number;
  notes?: string;
}

interface ClientPostNewTabProps {
  userId: string;
  onSuccess: () => void;
}

export default function ClientPostNewTab({ userId, onSuccess }: ClientPostNewTabProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [activePostsCount, setActivePostsCount] = useState(0);
  const [accountTier, setAccountTier] = useState('free');
  const { toast } = useToast();

  // Event form data
  const [eventData, setEventData] = useState({
    title: "",
    type: "",
    description: "",
    location: "",
    keywords: [] as string[],
    budget_min: "",
    budget_max: "",
    end_date: "",
  });

  // Roles data
  const [roles, setRoles] = useState<EventRole[]>([{
    role_name: "",
    needed_count: 1,
    role_budget: undefined,
    notes: "",
  }]);

  const [newKeyword, setNewKeyword] = useState("");

  useEffect(() => {
    if (!userId) return;

    const fetchUserData = async () => {
      // Check current active posts count
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('client_id', userId)
        .eq('status', 'active');

      setActivePostsCount(events?.length || 0);

      // Get account tier
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_tier')
        .eq('id', userId)
        .single();

      if (profile) {
        setAccountTier(profile.account_tier || 'free');
      }
    };

    fetchUserData();
  }, [userId]);

  const addKeyword = () => {
    if (newKeyword.trim() && !eventData.keywords.includes(newKeyword.trim())) {
      setEventData(prev => ({
        ...prev,
        keywords: [...prev.keywords, newKeyword.trim()]
      }));
      setNewKeyword("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setEventData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const addRole = () => {
    setRoles(prev => [...prev, {
      role_name: "",
      needed_count: 1,
      role_budget: undefined,
      notes: "",
    }]);
  };

  const removeRole = (index: number) => {
    if (roles.length > 1) {
      setRoles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateRole = (index: number, field: keyof EventRole, value: any) => {
    setRoles(prev => prev.map((role, i) => 
      i === index ? { ...role, [field]: value } : role
    ));
  };

  const handleNext = () => {
    // Validate event data
    if (!eventData.title || !eventData.type || !eventData.description) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      });
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    // Check free tier limit
    if (accountTier === 'free' && activePostsCount >= 1000) {
      toast({
        variant: "destructive",
        title: "Free Tier Limit Reached",
        description: "Free accounts can have maximum 1000 active posts. Upgrade to post more.",
      });
      return;
    }

    // Validate roles
    if (roles.some(role => !role.role_name)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all role names",
      });
      return;
    }

    setLoading(true);

    try {
      // Create event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          client_id: userId,
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          keywords: eventData.keywords,
          budget_total: eventData.budget_max ? parseFloat(eventData.budget_max) : null,
          end_date: eventData.end_date || null,
          status: 'active',
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create event roles
      const rolePromises = roles.map(role => 
        supabase
          .from('event_roles')
          .insert({
            event_id: event.id,
            role_name: role.role_name,
            needed_count: role.needed_count,
            role_budget: role.role_budget || null,
            notes: role.notes || null,
          })
      );

      await Promise.all(rolePromises);

      toast({
        title: "Success!",
        description: "Event created successfully",
      });

      onSuccess();

    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create event. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Free tier warning
  const showFreeTierWarning = accountTier === 'free' && activePostsCount >= 950;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {showFreeTierWarning && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {activePostsCount >= 1000 
              ? "You've reached the free tier limit of 1000 active posts. Upgrade to post more."
              : `You have ${activePostsCount}/1000 active posts on the free tier.`
            }
          </AlertDescription>
        </Alert>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Event - Step 1</CardTitle>
            <CardDescription>Basic event information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={eventData.title}
                  onChange={(e) => setEventData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter event title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Event Type *</Label>
                <Select onValueChange={(value) => setEventData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={eventData.description}
                onChange={(e) => setEventData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your event"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={eventData.location}
                  onChange={(e) => setEventData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Event location"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={eventData.end_date}
                  onChange={(e) => setEventData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget_min">Budget Min</Label>
                <Input
                  id="budget_min"
                  type="number"
                  value={eventData.budget_min}
                  onChange={(e) => setEventData(prev => ({ ...prev, budget_min: e.target.value }))}
                  placeholder="Minimum budget"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget_max">Budget Max</Label>
                <Input
                  id="budget_max"
                  type="number"
                  value={eventData.budget_max}
                  onChange={(e) => setEventData(prev => ({ ...prev, budget_max: e.target.value }))}
                  placeholder="Maximum budget"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Keywords</Label>
              <div className="flex gap-2">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Add keyword"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                />
                <Button type="button" onClick={addKeyword}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {eventData.keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                    {keyword}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeKeyword(keyword)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleNext}>
                Next: Add Roles
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Event - Step 2</CardTitle>
            <CardDescription>Define roles needed for your event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {roles.map((role, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Role {index + 1}</h4>
                  {roles.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeRole(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Role Name *</Label>
                    <Input
                      value={role.role_name}
                      onChange={(e) => updateRole(index, 'role_name', e.target.value)}
                      placeholder="e.g., Photographer, Videographer"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Needed Count</Label>
                    <Input
                      type="number"
                      min="1"
                      value={role.needed_count}
                      onChange={(e) => updateRole(index, 'needed_count', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Role Budget</Label>
                    <Input
                      type="number"
                      value={role.role_budget || ""}
                      onChange={(e) => updateRole(index, 'role_budget', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="Budget for this role"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={role.notes}
                    onChange={(e) => updateRole(index, 'notes', e.target.value)}
                    placeholder="Additional requirements or notes for this role"
                    rows={2}
                  />
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={addRole}>
                <Plus className="h-4 w-4 mr-2" />
                Add Another Role
              </Button>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}