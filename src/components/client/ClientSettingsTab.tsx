import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Building, Globe, CreditCard, Crown, AlertCircle } from "lucide-react";

interface Profile {
  id: string;
  display_name: string;
  email: string;
  location: string;
  phone: string;
  account_tier: string;
}

interface ClientProfile {
  company_name: string;
  website: string;
}

interface ClientSettingsTabProps {
  userId: string;
}

export default function ClientSettingsTab({ userId }: ClientSettingsTabProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
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

      // Fetch client-specific profile
      const { data: clientData, error: clientError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (clientError && clientError.code !== 'PGRST116') {
        throw clientError;
      }

      setProfile(profileData);
      setClientProfile(clientData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load profile",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
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
          role: 'client',
        });

      if (profileError) throw profileError;

      // Update client profile
      if (clientProfile) {
        const { error: clientError } = await supabase
          .from('client_profiles')
          .upsert({
            id: userId,
            company_name: clientProfile.company_name,
            website: clientProfile.website,
          });

        if (clientError) throw clientError;
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile",
      });
    } finally {
      setSaving(false);
    }
  };

  const upgradeAccount = () => {
    toast({
      title: "Coming Soon",
      description: "Account upgrades will be available soon!",
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Account Settings</h2>
        <p className="text-muted-foreground">Manage your profile and account preferences</p>
      </div>

      {/* Account Tier */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Account Plan
          </CardTitle>
          <CardDescription>Your current subscription plan and limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {profile?.account_tier === 'free' ? (
                <User className="h-8 w-8 text-muted-foreground" />
              ) : (
                <Crown className="h-8 w-8 text-yellow-500" />
              )}
              <div>
                <h3 className="font-medium">
                  {profile?.account_tier === 'free' ? 'Free Plan' : 'Premium Plan'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {profile?.account_tier === 'free' 
                    ? 'Basic features with limited posts' 
                    : 'Full access to all features'
                  }
                </p>
              </div>
            </div>
            <Badge variant={profile?.account_tier === 'free' ? 'secondary' : 'default'}>
              {profile?.account_tier === 'free' ? 'Free' : 'Premium'}
            </Badge>
          </div>

          {profile?.account_tier === 'free' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Free accounts are limited to 2 active event posts. Upgrade for unlimited posts and premium features.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            {profile?.account_tier === 'free' && (
              <Button onClick={upgradeAccount}>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>Your basic profile information</CardDescription>
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

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>Details about your company or organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={clientProfile?.company_name || ""}
                onChange={(e) => setClientProfile(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="Your company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <div className="flex">
                <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground">
                  <Globe className="h-4 w-4" />
                </div>
                <Input
                  id="website"
                  value={clientProfile?.website || ""}
                  onChange={(e) => setClientProfile(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="www.yourcompany.com"
                  className="rounded-l-none"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={updateProfile} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}