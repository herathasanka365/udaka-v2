import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Target, Lightbulb, Star, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { GlassCard } from '@/components/ui/glass-card';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo_url?: string;
}

const About: React.FC = () => {
  // Fetch team data from Supabase
  const { data: teamMembers, isLoading: isTeamLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team')
        .select('id, name, role, bio, photo_url')
        .order('name');

      if (error) throw error;
      return data as TeamMember[];
    },
  });

  const clientSteps = [
    {
      step: "1",
      title: "Post Your Project",
      description: "Create a detailed project listing with your requirements, budget, and timeline. Include the specific roles you need and project details.",
      icon: Target,
    },
    {
      step: "2", 
      title: "Browse Talent Applications",
      description: "Review applications from qualified creators. View their portfolios, experience, and previous work to find the perfect match.",
      icon: Users,
    },
    {
      step: "3",
      title: "Hire and Collaborate", 
      description: "Select your ideal team members and start collaborating. Use our platform to manage communications and project milestones.",
      icon: Star,
    },
  ];

  const creatorSteps = [
    {
      step: "1",
      title: "Build a Stunning Portfolio",
      description: "Showcase your best work, skills, and experience. Upload high-quality samples that demonstrate your creative abilities and expertise.",
      icon: Lightbulb,
    },
    {
      step: "2",
      title: "Apply to Exciting Projects", 
      description: "Browse available projects that match your skills and interests. Submit compelling applications with relevant work samples.",
      icon: Target,
    },
    {
      step: "3",
      title: "Get Booked and Create",
      description: "Connect with clients, negotiate terms, and bring creative visions to life. Build your reputation through successful collaborations.",
      icon: Star,
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen py-12">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              About <span className="text-primary">CineHubLK</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Connecting Sri Lanka's creative community and empowering the next generation of filmmakers
            </p>
          </div>

          {/* Mission Section */}
          <section className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Our Mission
              </h2>
            </div>
            
            <GlassCard className="p-8 md:p-12 text-center max-w-4xl mx-auto">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-6">
                  <Lightbulb className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              
              <blockquote className="text-2xl md:text-3xl lg:text-4xl font-semibold text-foreground leading-relaxed mb-8">
                "Empowering filmmakers and creatives to collaborate and create unforgettable stories"
              </blockquote>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                We believe every great story deserves to be told. CineHubLK bridges the gap between visionary storytellers 
                and talented creators, fostering a vibrant ecosystem where cinematic dreams become reality.
              </p>
            </GlassCard>
          </section>

          {/* How It Works Section */}
          <section className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Whether you're looking to hire talent or showcase your skills, we've made it simple
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <Accordion type="multiple" className="space-y-4">
                {/* For Clients */}
                <AccordionItem value="clients" className="border-none">
                  <GlassCard className="overflow-hidden">
                    <AccordionTrigger 
                      className="px-8 py-6 hover:no-underline hover:bg-muted/20 transition-colors"
                      aria-label="How it works for clients"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-xl font-semibold text-foreground">For Clients</h3>
                          <p className="text-muted-foreground">Find and hire the perfect creative team</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-8 pb-8">
                      <div className="space-y-6">
                        {clientSteps.map((step, index) => {
                          const Icon = step.icon;
                          return (
                            <div key={index} className="flex gap-4">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                  <span className="text-primary font-semibold">{step.step}</span>
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Icon className="w-5 h-5 text-primary" />
                                  <h4 className="font-semibold text-foreground">{step.title}</h4>
                                </div>
                                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </GlassCard>
                </AccordionItem>

                {/* For Creators */}
                <AccordionItem value="creators" className="border-none">
                  <GlassCard className="overflow-hidden">
                    <AccordionTrigger 
                      className="px-8 py-6 hover:no-underline hover:bg-muted/20 transition-colors"
                      aria-label="How it works for creators"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <Lightbulb className="w-6 h-6 text-primary" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-xl font-semibold text-foreground">For Creators</h3>
                          <p className="text-muted-foreground">Showcase your talent and get hired</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-8 pb-8">
                      <div className="space-y-6">
                        {creatorSteps.map((step, index) => {
                          const Icon = step.icon;
                          return (
                            <div key={index} className="flex gap-4">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                  <span className="text-primary font-semibold">{step.step}</span>
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Icon className="w-5 h-5 text-primary" />
                                  <h4 className="font-semibold text-foreground">{step.title}</h4>
                                </div>
                                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </GlassCard>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Team Section */}
          <section className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Meet Our Team
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                The passionate individuals behind CineHubLK's mission to revolutionize film collaboration
              </p>
            </div>

            {isTeamLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <GlassCard key={i} className="p-6 animate-pulse">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-24 h-24 bg-muted rounded-full mb-4" />
                      <div className="h-6 bg-muted rounded mb-2 w-32" />
                      <div className="h-4 bg-muted rounded mb-4 w-24" />
                      <div className="space-y-2 w-full">
                        <div className="h-3 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded w-3/4 mx-auto" />
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            ) : teamMembers && teamMembers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamMembers.map((member) => {
                  const initials = member.name
                    .split(' ')
                    .map(word => word[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <GlassCard key={member.id} className="p-6 hover:shadow-xl transition-all duration-300 group">
                      <div className="flex flex-col items-center text-center">
                        <Avatar className="w-24 h-24 mb-4 ring-2 ring-border group-hover:ring-primary/50 transition-all">
                          <AvatarImage src={member.photo_url} alt={`${member.name}'s photo`} />
                          <AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        
                        <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                          {member.name}
                        </h3>
                        
                        <Badge 
                          variant="secondary" 
                          className="mb-4 bg-primary/20 text-primary border-primary/30"
                        >
                          {member.role}
                        </Badge>
                        
                        <p className="text-muted-foreground leading-relaxed">
                          {member.bio}
                        </p>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            ) : (
              <GlassCard className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Team Information Coming Soon</h3>
                <p className="text-muted-foreground">
                  We're building an amazing team to serve the film community. Check back soon!
                </p>
              </GlassCard>
            )}
          </section>

          {/* Call to Action */}
          <section className="text-center">
            <GlassCard className="p-8 md:p-12 max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Ready to Join Our Community?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                Whether you're a filmmaker with a vision or a creative looking for your next opportunity, 
                CineHubLK is here to help you succeed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="/explore-talent"
                  className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold rounded-glass bg-primary text-primary-foreground hover:bg-primary-hover transition-colors group"
                >
                  Explore Talent
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <a 
                  href="/home"
                  className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold rounded-glass border border-border backdrop-blur-glass bg-card/50 text-foreground hover:bg-card/70 transition-colors"
                >
                  Learn More
                </a>
              </div>
            </GlassCard>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default About;