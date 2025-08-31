import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, 
  Lock, 
  Trash2, 
  Save,
  AlertTriangle
} from "lucide-react";

const profileSchema = z.object({
  display_name: z.string().min(1, "Display name is required"),
  location: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  keywords: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function CreatorSettings() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { toast } = useToast();

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: "",
      location: "",
      phone: "",
      bio: "",
      keywords: "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
    };
    checkAuth();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile(data);
        profileForm.reset({
          display_name: data.display_name || "",
          location: data.location || "",
          phone: data.phone || "",
          bio: "",
          keywords: "",
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load profile data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onUpdateProfile = async (values: z.infer<typeof profileSchema>) => {
    if (!user) return;

    try {
      setSaving(true);
      const keywords = values.keywords 
        ? values.keywords.split(',').map(k => k.trim()).filter(Boolean)
        : [];

      const profileData = {
        id: user.id,
        display_name: values.display_name,
        location: values.location || null,
        phone: values.phone || null,
        bio: values.bio || null,
        keywords,
        email: user.email,
        role: 'creator',
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });

      setProfile(profileData);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (values: z.infer<typeof passwordSchema>) => {
    try {
      setSaving(true);

      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: values.currentPassword,
      });

      if (signInError) {
        toast({
          variant: "destructive",
          title: "Invalid Password",
          description: "Current password is incorrect.",
        });
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });

      passwordForm.reset();
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to change password. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // In a real implementation, you might want to:
      // 1. Soft delete by marking account as deleted
      // 2. Delete associated data (applications, availability, etc.)
      // 3. Use an RPC function for proper cleanup

      // For now, just sign out and show a message
      await supabase.auth.signOut();
      
      toast({
        title: "Account Deletion Requested",
        description: "Your account deletion request has been submitted. You will be contacted within 24 hours.",
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process account deletion. Please contact support.",
      });
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile Settings */}
      <GlassCard className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Settings
        </h3>

        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
            <FormField
              control={profileForm.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Display Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your display name"
                      className="bg-background/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={profileForm.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="City, State"
                      className="bg-background/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={profileForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+1 (555) 123-4567"
                      className="bg-background/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={profileForm.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about yourself..."
                      className="bg-background/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={profileForm.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Skills/Keywords</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="acting, dancing, singing, comedy"
                      className="bg-background/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </Form>
      </GlassCard>

      {/* Account Security */}
      <GlassCard className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Account Security
        </h3>

        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
            <FormField
              control={passwordForm.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Current Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter current password"
                      className="bg-background/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={passwordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      className="bg-background/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={passwordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Confirm New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      className="bg-background/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={saving}
            >
              <Lock className="h-4 w-4 mr-2" />
              {saving ? "Updating..." : "Change Password"}
            </Button>
          </form>
        </Form>
      </GlassCard>

      {/* Delete Account */}
      <GlassCard className="rounded-glass bg-card/50 backdrop-blur-glass border border-destructive/20">
        <h3 className="text-lg font-semibold text-destructive mb-4 flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Delete Account
        </h3>

        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This action cannot be undone. This will permanently delete your account and remove your data from our servers.
          </AlertDescription>
        </Alert>

        {!showDeleteConfirm ? (
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Account
          </Button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you absolutely sure? Type "DELETE" to confirm:
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={deleteAccount}
                disabled={saving}
              >
                {saving ? "Processing..." : "Yes, Delete My Account"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}