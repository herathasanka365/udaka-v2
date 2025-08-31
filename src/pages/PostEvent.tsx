import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlassModal } from "@/components/ui/glass-modal";
import { GlassCard } from "@/components/ui/glass-card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const roleSchema = z.object({
  role: z.string().min(1, "Role is required"),
  budget: z.number().min(0, "Budget must be positive"),
  requirements: z.string().min(1, "Requirements are required"),
});

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  keywords: z.array(z.string()).min(1, "At least one keyword is required"),
  roles: z.array(roleSchema).min(1, "At least one role is required"),
  budget_total: z.number().min(0, "Total budget must be positive"),
  end_date: z.date({
    required_error: "End date is required",
  }),
  location: z.string().min(1, "Location is required"),
});

type EventForm = z.infer<typeof eventSchema>;

const CATEGORIES = [
  "Actor", "Cinematographer", "Director", "Editor", "Producer", 
  "Sound Engineer", "Makeup Artist", "Costume Designer", "Writer", "Voice Actor"
];

export default function PostEvent() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [keywordInput, setKeywordInput] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      keywords: [],
      roles: [{ role: "", budget: 0, requirements: "" }],
      budget_total: 0,
      end_date: undefined,
      location: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "roles",
  });

  const keywords = form.watch("keywords");
  const roles = form.watch("roles");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/clients/login");
        return;
      }
      setUser(session.user);
    };
    
    checkAuth();
  }, [navigate]);

  const addKeyword = (keyword: string) => {
    if (keyword.trim() && !keywords.includes(keyword.trim())) {
      form.setValue("keywords", [...keywords, keyword.trim()]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (index: number) => {
    const newKeywords = keywords.filter((_, i) => i !== index);
    form.setValue("keywords", newKeywords);
  };

  const addRole = () => {
    append({ role: "", budget: 0, requirements: "" });
  };

  const nextStep = async () => {
    let isValid = false;
    
    switch (currentStep) {
      case 1:
        isValid = await form.trigger(["title", "description", "keywords"]);
        break;
      case 2:
        isValid = await form.trigger("roles");
        break;
      case 3:
        isValid = await form.trigger(["budget_total", "end_date", "location"]);
        break;
    }

    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (values: EventForm) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Insert event into database
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          client_id: user.id,
          title: values.title,
          description: values.description,
          keywords: values.keywords,
          roles: values.roles,
          budget_total: values.budget_total,
          end_date: format(values.end_date, "yyyy-MM-dd"),
          location: values.location,
          status: 'active'
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create notifications for matching creators
      const { data: creators, error: creatorsError } = await supabase
        .from('users')
        .select('id, keywords, location')
        .eq('role', 'creator');

      if (creatorsError) throw creatorsError;

      // Find creators with matching keywords or location
      const matchingCreators = creators?.filter(creator => {
        const keywordMatch = creator.keywords?.some(keyword => 
          values.keywords.includes(keyword)
        );
        const locationMatch = creator.location?.toLowerCase().includes(
          values.location.toLowerCase()
        );
        return keywordMatch || locationMatch;
      });

      // Send notifications to matching creators
      if (matchingCreators && matchingCreators.length > 0) {
        const notifications = matchingCreators.map(creator => ({
          user_id: creator.id,
          type: 'new_event' as const,
          message: `New event "${values.title}" matches your profile! Check it out.`,
        }));

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notificationError) {
          console.error('Error sending notifications:', notificationError);
        }
      }

      toast({
        title: "Event Posted Successfully!",
        description: `Your event "${values.title}" has been posted and creators have been notified.`,
      });

      navigate("/client/dashboard");

    } catch (error) {
      console.error('Error posting event:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to post event. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSteps = 4;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <GlassCard>
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Post New Event</h1>
              <p className="text-muted-foreground">Create a new project and find the perfect talent</p>
              
              {/* Progress Indicator */}
              <div className="flex justify-center mt-6">
                <div className="flex items-center space-x-2">
                  {Array.from({ length: totalSteps }, (_, i) => (
                    <div key={i} className="flex items-center">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                          i + 1 <= currentStep
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {i + 1}
                      </div>
                      {i < totalSteps - 1 && (
                        <div
                          className={cn(
                            "w-12 h-1 mx-2",
                            i + 1 < currentStep ? "bg-primary" : "bg-muted"
                          )}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Step 1: Basic Information */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Basic Information</h2>
                    
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Indie Sci-Fi Film" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Casting for a futuristic thriller..." 
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <Label>Keywords</Label>
                      <div className="flex gap-2 mt-2 mb-3">
                        <Input
                          placeholder="Add keyword..."
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addKeyword(keywordInput);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addKeyword(keywordInput)}
                        >
                          Add
                        </Button>
                      </div>
                      
                      {/* Suggested Keywords */}
                      <div className="mb-3">
                        <p className="text-sm text-muted-foreground mb-2">Suggested:</p>
                        <div className="flex flex-wrap gap-2">
                          {CATEGORIES.map((category) => (
                            <Button
                              key={category}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addKeyword(category.toLowerCase())}
                              disabled={keywords.includes(category.toLowerCase())}
                            >
                              {category}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Current Keywords */}
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((keyword, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {keyword}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => removeKeyword(index)}
                            >
                              ×
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Roles */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-foreground">Project Roles</h2>
                      <Button type="button" variant="outline" onClick={addRole}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Role
                      </Button>
                    </div>

                    {fields.map((field, index) => (
                      <GlassCard key={field.id}>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-foreground">Role #{index + 1}</h3>
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`roles.${index}.role`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Role Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Lead Actor" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`roles.${index}.budget`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Budget ($)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="1000"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name={`roles.${index}.requirements`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Requirements</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Age 25-35, previous experience required..."
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}

                {/* Step 3: Budget and Timeline */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Budget & Timeline</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="budget_total"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Budget ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="5000"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="end_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Application Deadline</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="New York, NY" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 4: Preview */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Review & Submit</h2>
                    
                    <GlassCard>
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-foreground">Event Details</h3>
                          <p className="text-lg">{form.getValues("title")}</p>
                          <p className="text-muted-foreground">{form.getValues("description")}</p>
                        </div>

                        <div>
                          <h4 className="font-medium text-foreground">Keywords</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {form.getValues("keywords").map((keyword, index) => (
                              <Badge key={index} variant="secondary">{keyword}</Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-foreground">Roles ({roles.length})</h4>
                          {roles.map((role, index) => (
                            <div key={index} className="border-l-2 border-primary pl-4 mt-2">
                              <p className="font-medium">{role.role} - ${role.budget}</p>
                              <p className="text-sm text-muted-foreground">{role.requirements}</p>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-foreground">Total Budget</h4>
                            <p>${form.getValues("budget_total")}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">Deadline</h4>
                            <p>{form.getValues("end_date") ? format(form.getValues("end_date"), "PPP") : "Not set"}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-foreground">Location</h4>
                          <p>{form.getValues("location")}</p>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  {currentStep < 4 ? (
                    <Button type="button" onClick={nextStep}>
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <PrimaryButton type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Posting..." : "Post Event"}
                    </PrimaryButton>
                  )}
                </div>
              </form>
            </Form>

            {/* Back to Dashboard */}
            <div className="text-center mt-6">
              <Button variant="link" onClick={() => navigate("/client/dashboard")}>
                ← Back to Dashboard
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}