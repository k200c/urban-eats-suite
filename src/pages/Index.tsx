import { Navbar } from "@/components/layout/Navbar";
import { FooterInfoBar } from "@/components/layout/FooterInfoBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HeroSection } from "@/components/customer/HeroSection";
import { MenuSection } from "@/components/customer/MenuSection";
import { FloatingCartButton } from "@/components/customer/FloatingCartButton";

function AboutSection() {
  return (
    <section id="about" className="py-16 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-6">ABOUT US</h2>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Welcome to Street Eats. Born in Waterford, we believe in bold flavors, fresh ingredients, and the perfect
          smash burger. Whether you're grabbing a quick lunch or a late-night feast, we bring the gourmet street food
          experience straight to your hands.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
          <div className="street-card p-4">
            <p className="font-heading text-primary mb-1">THU - FRI</p>
            <p className="text-foreground">12pm - 7pm</p>
          </div>
          <div className="street-card p-4">
            <p className="font-heading text-primary mb-1">SAT - SUN</p>
            <p className="text-foreground">1pm - 7pm</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Index() {
  return (
    <div className="min-h-screen relative flex flex-col">
      <Navbar />
      <HeroSection />
      <MenuSection />
      <AboutSection />
      <SiteFooter />
      <FloatingCartButton />
      <FooterInfoBar />
    </div>
  );
}
