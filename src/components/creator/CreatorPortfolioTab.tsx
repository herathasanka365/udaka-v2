import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Plus, X, Save, Upload } from "lucide-react";

interface CreatorProfile {
  id: string;
  name: string;
  category: string;
  bio: string;
  age: number;
  keywords: string[];
}

interface CreatorPortfolioTabProps {
  userId: string;
}

const CATEGORIES = [
  "Actor", "Director", "Producer", "Cinematographer", "Editor", 
  "Sound Engineer", "Makeup Artist", "Costume Designer", "Writer", 
  "Voice Actor", "Musician", "Dancer", "Photographer"
];

export default function CreatorPortfolioTab({ userId }: CreatorPortfolioTabProps) {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setProfile(data || {
        id: userId,
        name: "",
        category: "",
        bio: "",
        age: 0,
        keywords: []
      });
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
      const { error } = await supabase
        .from('creator_profiles')
        .upsert({
          id: userId,
          name: profile.name,
          category: profile.category,
          bio: profile.bio,
          age: profile.age || null,
          keywords: profile.keywords || []
        });

      if (error) throw error;

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

  const addKeyword = () => {
    if (!profile || !newKeyword.trim()) return;
    
    if (!profile.keywords.includes(newKeyword.trim())) {
      setProfile({
        ...profile,
        keywords: [...profile.keywords, newKeyword.trim()]
      });
      setNewKeyword("");
    }
  };

  const removeKeyword = (keyword: string) => {
    if (!profile) return;
    
    setProfile({
      ...profile,
      keywords: profile.keywords.filter(k => k !== keyword)
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Creator Portfolio</h2>
        <p className="text-muted-foreground">Manage your professional profile and showcase your skills</p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>Your basic profile details that clients will see</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={profile?.name || ""}
                onChange={(e) => setProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={profile?.age || ""}
                onChange={(e) => setProfile(prev => prev ? { ...prev, age: parseInt(e.target.value) || 0 } : null)}
                placeholder="Your age"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Primary Category *</Label>
            <Select
              value={profile?.category || ""}
              onValueChange={(value) => setProfile(prev => prev ? { ...prev, category: value } : null)}
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
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={profile?.bio || ""}
              onChange={(e) => setProfile(prev => prev ? { ...prev, bio: e.target.value } : null)}
              placeholder="Tell clients about yourself, your experience, and what makes you unique..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Skills & Keywords */}
      <Card>
        <CardHeader>
          <CardTitle>Skills & Keywords</CardTitle>
          <CardDescription>
            Add keywords that describe your skills and expertise. This helps clients find you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Add a skill or keyword"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            />
            <Button type="button" onClick={addKeyword}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {profile?.keywords?.map((keyword) => (
              <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                {keyword}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeKeyword(keyword)}
                />
              </Badge>
            ))}
          </div>

          {profile?.keywords?.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No keywords added yet. Add some to help clients find you!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Items */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio & Work Samples</CardTitle>
          <CardDescription>
            Upload your best work to showcase your skills (Coming Soon)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Portfolio Upload</h3>
            <p className="text-muted-foreground text-sm mb-4">
              This feature is coming soon! You'll be able to upload images, videos, and documents to showcase your work.
            </p>
            <Button variant="outline" disabled>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Statistics</CardTitle>
          <CardDescription>Your profile performance and visibility</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <h3 className="text-2xl font-bold">0</h3>
              <p className="text-sm text-muted-foreground">Profile Views</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <h3 className="text-2xl font-bold">{profile?.keywords?.length || 0}</h3>
              <p className="text-sm text-muted-foreground">Skills Listed</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <h3 className="text-2xl font-bold">
                {profile?.name && profile?.category && profile?.bio ? "85%" : "25%"}
              </h3>
              <p className="text-sm text-muted-foreground">Profile Complete</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={updateProfile} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}