import { Navbar } from "@/components/layout/Navbar";
import { FooterInfoBar } from "@/components/layout/FooterInfoBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HeroSection } from "@/components/customer/HeroSection";
import { MenuSection } from "@/components/customer/MenuSection";
import { FloatingCartButton } from "@/components/customer/FloatingCartButton";

function AboutSection() {
  return (
    <section id="about" className="py-10 sm:py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-6 text-center">
          ABOUT STREETEATZ
        </h2>
        <p className="text-muted-foreground text-lg leading-relaxed text-center mb-10">
          Welcome to StreetEatz. Born in Waterford, we believe in bold flavors,
          fresh ingredients, and the perfect smash burger. Whether you're grabbing
          a quick lunch or a late-night feast, we bring the gourmet street food
          experience straight to your hands.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div>
            <h3 className="font-heading text-xl text-primary mb-2">Smash Burgers</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Our signature smash burgers are hand-pressed on the griddle and
              loaded with fresh toppings. The best burgers in Waterford, made
              the way street food should be.
            </p>
          </div>
          <div>
            <h3 className="font-heading text-xl text-primary mb-2">Gourmet Flatbreads</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Freshly grilled flatbreads packed with bold fillings and house sauces.
              A Waterford food truck favourite you won't find anywhere else.
            </p>
          </div>
          <div>
            <h3 className="font-heading text-xl text-primary mb-2">Loaded Fries</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Handcut chips and loaded fries piled high with toppings. From truffle
              parmesan to sloppy fries — the best loaded fries in Waterford.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="street-card p-4 text-center">
            <p className="font-heading text-primary mb-1">THU - FRI</p>
            <p className="text-foreground">12pm - 7pm</p>
          </div>
          <div className="street-card p-4 text-center">
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
    <div className="relative flex flex-col" style={{ minHeight: '100dvh', paddingBottom: 'calc(var(--bottom-offset, 56px) + 3rem)' }}>
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
