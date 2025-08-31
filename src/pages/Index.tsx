import { Layout } from "@/components/layout/Layout"
import { GlassCard } from "@/components/ui/glass-card"
import { PrimaryButton } from "@/components/ui/primary-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import heroImage from "@/assets/hero-banner.jpg"

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-background/60"></div>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <GlassCard className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 font-sans">
              Connect <span className="text-primary">Creators</span>
              <br />
              with <span className="text-primary">Clients</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto font-sans">
              The ultimate platform for discovering exceptional talent and bringing creative visions to life
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <PrimaryButton size="lg" className="text-lg px-8 py-6">
                Find Talent
              </PrimaryButton>
              <SecondaryButton size="lg" className="text-lg px-8 py-6">
                Join as Creator
              </SecondaryButton>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-sans">
              Why Choose <span className="text-primary">Cinehublk</span>?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-sans">
              We bridge the gap between creative talent and visionary clients
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <GlassCard className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-8 h-8 bg-primary rounded-full"></div>
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-4 font-sans">
                Vetted Professionals
              </h3>
              <p className="text-muted-foreground font-sans">
                Access a curated network of verified creators with proven track records
              </p>
            </GlassCard>

            <GlassCard className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-8 h-8 bg-primary rounded-full"></div>
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-4 font-sans">
                Seamless Collaboration
              </h3>
              <p className="text-muted-foreground font-sans">
                Tools and features designed to streamline your creative projects
              </p>
            </GlassCard>

            <GlassCard className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-8 h-8 bg-primary rounded-full"></div>
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-4 font-sans">
                Secure Payments
              </h3>
              <p className="text-muted-foreground font-sans">
                Protected transactions with milestone-based payment systems
              </p>
            </GlassCard>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
