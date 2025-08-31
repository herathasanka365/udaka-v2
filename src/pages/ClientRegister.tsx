import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/ui/glass-card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().min(2, "Location is required"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function ClientRegister() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      location: "",
    },
  });

  const password = form.watch("password");

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password || "");
  const getStrengthColor = (strength: number) => {
    if (strength < 50) return "bg-destructive";
    if (strength < 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthText = (strength: number) => {
    if (strength < 25) return "Very Weak";
    if (strength < 50) return "Weak";
    if (strength < 75) return "Good";
    return "Strong";
  };

  const onSubmit = async (values: RegisterForm) => {
    setIsLoading(true);
    
    try {
      // Create auth user
      const { data, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: values.name,
            location: values.location,
            role: 'client'
          }
        }
      });

      if (authError) {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: authError.message,
        });
        return;
      }

      if (data.user) {
        // Insert user data into users table
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: values.email,
            name: values.name,
            location: values.location,
            role: 'client',
            age: 25, // Default age - clients might not need age validation
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Still show success as auth user was created
        }

        toast({
          title: "Account created!",
          description: "Please verify your email to complete registration.",
        });

        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          navigate("/client/dashboard");
        }, 2000);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Join as a Client</h1>
          <p className="text-muted-foreground">Create your account to post events and find talent</p>
        </div>

        {/* Registration Form */}
        <GlassCard>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="john.smith@example.com"
                        type="email"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Create a strong password"
                        type="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    {password && (
                      <div className="space-y-2">
                        <Progress 
                          value={passwordStrength} 
                          className="h-2"
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)'
                          }}
                        />
                        <p className={`text-sm ${getStrengthColor(passwordStrength).replace('bg-', 'text-')}`}>
                          Password strength: {getStrengthText(passwordStrength)}
                        </p>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Smith"
                        autoComplete="name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="New York, NY"
                        autoComplete="address-level1"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <PrimaryButton
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </PrimaryButton>
            </form>
          </Form>
        </GlassCard>

        {/* Login Link */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/clients/login"
              className="text-primary hover:text-primary-hover font-medium transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>

        {/* Creator Link */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Looking to offer your services?{" "}
            <Link
              to="/creators/register"
              className="text-primary hover:text-primary-hover font-medium transition-colors"
            >
              Join as a Creator
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}