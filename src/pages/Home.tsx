import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Play, Star, Users, Calendar, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { GlassCard } from '@/components/ui/glass-card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import filmReelHero from '@/assets/film-reel-hero.jpg';

interface Event {
  id: string;
  title: string;
  description: string;
  roles: Array<{ role: string; budget: number; requirements: string }>;
  location: string;
  end_date: string;
  views: number;
}

const testimonials = [
  {
    name: "Sarah Lee",
    role: "Client",
    quote: "Found the perfect cinematographer in hours! The quality of talent on CineHubLK is exceptional.",
    rating: 5
  },
  {
    name: "Marcus Chen",
    role: "Director",
    quote: "As a creator, this platform connected me with amazing projects. The process is seamless and professional.",
    rating: 5
  },
  {
    name: "Jessica Rodriguez",
    role: "Producer",
    quote: "CineHubLK revolutionized how we cast for our productions. Highly recommend to all filmmakers.",
    rating: 5
  },
  {
    name: "David Kumar",
    role: "Actor",
    quote: "I've landed multiple roles through this platform. The opportunities are endless for creative professionals.",
    rating: 5
  }
];

const Home: React.FC = () => {
  const { data: featuredEvents, isLoading } = useQuery({
    queryKey: ['featured-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, description, roles, location, end_date, views')
        .eq('status', 'active')
        .order('views', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data as Event[];
    },
  });

  const navigateToRegister = (type: 'client' | 'creator') => {
    window.location.href = `/${type}s/register`;
  };

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <img 
              src={filmReelHero} 
              alt="Film industry background with reels and equipment"
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/30 to-background" />
          </div>

          {/* Glassmorphism Overlay Content */}
          <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
            <GlassCard className="p-8 md:p-12 max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Unite Filmmakers and Talent for{' '}
                <span className="text-primary">Cinematic Magic</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                Connect with industry professionals, discover exciting projects, and bring creative visions to life on Sri Lanka's premier film talent platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <PrimaryButton 
                  onClick={() => navigateToRegister('client')}
                  className="px-8 py-3 text-lg font-semibold group"
                >
                  Join as Client
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </PrimaryButton>
                
                <SecondaryButton 
                  onClick={() => navigateToRegister('creator')}
                  className="px-8 py-3 text-lg font-semibold group"
                >
                  Join as Creator
                  <Play className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                </SecondaryButton>
              </div>
            </GlassCard>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-muted-foreground rounded-full flex justify-center">
              <div className="w-1 h-3 bg-muted-foreground rounded-full mt-2 animate-pulse" />
            </div>
          </div>
        </section>

        {/* Featured Events Section */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Featured Events
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Discover exciting opportunities from top filmmakers and production houses
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <GlassCard key={i} className="p-6 animate-pulse">
                    <div className="h-6 bg-muted rounded mb-4" />
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                    <div className="flex gap-2 mb-4">
                      <div className="h-6 bg-muted rounded-full w-20" />
                      <div className="h-6 bg-muted rounded-full w-24" />
                    </div>
                    <div className="h-10 bg-muted rounded" />
                  </GlassCard>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredEvents?.map((event) => (
                  <GlassCard key={event.id} className="p-6 hover:shadow-xl transition-all duration-300 group">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">{event.views}</span>
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                      <Calendar className="w-4 h-4 ml-2" />
                      <span>{new Date(event.end_date).toLocaleDateString()}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {event.roles?.slice(0, 2).map((role, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary"
                          className="bg-primary/20 text-primary border-primary/30"
                        >
                          {role.role}
                        </Badge>
                      ))}
                      {event.roles?.length > 2 && (
                        <Badge variant="outline" className="border-border">
                          +{event.roles.length - 2} more
                        </Badge>
                      )}
                    </div>

                    <PrimaryButton className="w-full group">
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </PrimaryButton>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 px-4 bg-muted/5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                What Our Community Says
              </h2>
              <p className="text-lg text-muted-foreground">
                Trusted by filmmakers and talent across Sri Lanka
              </p>
            </div>

            <Carousel className="w-full max-w-5xl mx-auto">
              <CarouselContent>
                {testimonials.map((testimonial, index) => (
                  <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/2">
                    <GlassCard className="p-6 h-full">
                      <div className="flex items-center mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      
                      <blockquote className="text-foreground mb-6 leading-relaxed">
                        "{testimonial.quote}"
                      </blockquote>
                      
                      <footer className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                          {testimonial.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{testimonial.name}</p>
                          <p className="text-muted-foreground text-sm">{testimonial.role}</p>
                        </div>
                      </footer>
                    </GlassCard>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="backdrop-blur-glass bg-card/50 border-border hover:bg-card/70" />
              <CarouselNext className="backdrop-blur-glass bg-card/50 border-border hover:bg-card/70" />
            </Carousel>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <GlassCard className="p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Ready to Start Your Cinematic Journey?
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                Join thousands of filmmakers and talent who are already creating magic together. Your next great project is just a click away.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <PrimaryButton 
                  onClick={() => navigateToRegister('client')}
                  className="px-8 py-3 text-lg font-semibold"
                >
                  Get Started Now
                </PrimaryButton>
                
                <SecondaryButton className="px-8 py-3 text-lg font-semibold">
                  Learn More
                </SecondaryButton>
              </div>
            </GlassCard>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Home;