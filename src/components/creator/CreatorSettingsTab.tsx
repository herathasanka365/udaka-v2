import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { User, Save, Award } from "lucide-react";

interface Profile {
  id: string;
  display_name: string;
  email: string;
  location: string;
  phone: string;
}

interface CreatorProfile {
  name: string;
  category: string;
  bio: string;
  age: number;
}

interface CreatorSettingsTabProps {
  userId: string;
}

const CATEGORIES = [
  "Actor", "Director", "Producer", "Cinematographer", "Editor", 
  "Sound Engineer", "Makeup Artist", "Costume Designer", "Writer", 
  "Voice Actor", "Musician", "Dancer", "Photographer"
];

export default function CreatorSettingsTab({ userId }: CreatorSettingsTabProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
  }, [userId]);

  const fetchProfiles = async () => {
    try {
      // Fetch main profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Fetch creator profile
      const { data: creatorData, error: creatorError } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (creatorError && creatorError.code !== 'PGRST116') {
        throw creatorError;
      }

      setProfile(profileData);
      setCreatorProfile(creatorData);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load profile",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfiles = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      // Update main profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          display_name: profile.display_name,
          email: profile.email,
          location: profile.location,
          phone: profile.phone,
          role: 'creator',
        });

      if (profileError) throw profileError;

      // Update creator profile
      if (creatorProfile) {
        const { error: creatorError } = await supabase
          .from('creator_profiles')
          .upsert({
            id: userId,
            name: creatorProfile.name,
            category: creatorProfile.category,
            bio: creatorProfile.bio,
            age: creatorProfile.age || null,
          });

        if (creatorError) throw creatorError;
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating profiles:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Account Settings</h2>
        <p className="text-muted-foreground">Manage your account and profile settings</p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>Your basic account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={profile?.display_name || ""}
                onChange={(e) => setProfile(prev => prev ? { ...prev, display_name: e.target.value } : null)}
                placeholder="Your display name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile?.email || ""}
                onChange={(e) => setProfile(prev => prev ? { ...prev, email: e.target.value } : null)}
                placeholder="your.email@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={profile?.location || ""}
                onChange={(e) => setProfile(prev => prev ? { ...prev, location: e.target.value } : null)}
                placeholder="Your location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={profile?.phone || ""}
                onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                placeholder="Your phone number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Professional Information
          </CardTitle>
          <CardDescription>Your creator profile and professional details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="creator_name">Professional Name</Label>
              <Input
                id="creator_name"
                value={creatorProfile?.name || ""}
                onChange={(e) => setCreatorProfile(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your professional name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={creatorProfile?.age || ""}
                onChange={(e) => setCreatorProfile(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                placeholder="Your age"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Primary Category</Label>
            <Select
              value={creatorProfile?.category || ""}
              onValueChange={(value) => setCreatorProfile(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your primary category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Professional Bio</Label>
            <Textarea
              id="bio"
              value={creatorProfile?.bio || ""}
              onChange={(e) => setCreatorProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell clients about your experience and expertise..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Account Statistics</CardTitle>
          <CardDescription>Your account performance and activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <h3 className="text-2xl font-bold">0</h3>
              <p className="text-sm text-muted-foreground">Profile Views</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <h3 className="text-2xl font-bold">0</h3>
              <p className="text-sm text-muted-foreground">Applications Sent</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <h3 className="text-2xl font-bold">0</h3>
              <p className="text-sm text-muted-foreground">Projects Completed</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <h3 className="text-2xl font-bold">
                {profile?.display_name && creatorProfile?.name && creatorProfile?.category ? "75%" : "25%"}
              </h3>
              <p className="text-sm text-muted-foreground">Profile Complete</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Choose what notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Email Notifications</h4>
                <p className="text-sm text-muted-foreground">
                  Get notified about new opportunities and applications
                </p>
              </div>
              <Button variant="outline" disabled>
                Coming Soon
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Push Notifications</h4>
                <p className="text-sm text-muted-foreground">
                  Real-time notifications for urgent updates
                </p>
              </div>
              <Button variant="outline" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
          <CardDescription>Control your profile visibility and data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Profile Visibility</h4>
                <p className="text-sm text-muted-foreground">
                  Control who can see your profile
                </p>
              </div>
              <Button variant="outline" disabled>
                Public (Coming Soon)
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Contact Information</h4>
                <p className="text-sm text-muted-foreground">
                  Show contact details to potential clients
                </p>
              </div>
              <Button variant="outline" disabled>
                Visible (Coming Soon)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={updateProfiles} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}