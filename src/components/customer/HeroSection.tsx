import { useState, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ExternalLink } from 'lucide-react';
import streetEatzLogo from '@/assets/street-eatz-logo-new.jpeg';

const DeliveryOptionsModal = lazy(() => import('./DeliveryOptionsModal').then(m => ({ default: m.DeliveryOptionsModal })));

export function HeroSection() {
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const scrollToMenu = () => {
    const menuSection = document.getElementById('menu');
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section 
      className="min-h-[26vh] sm:min-h-[50vh] md:min-h-screen flex flex-col items-center justify-start sm:justify-center text-center px-4 pb-3 sm:pb-16 relative overflow-x-hidden"
      style={{ scrollMarginTop: 'var(--header-offset)', paddingTop: 'calc(var(--header-offset) + 0.5rem)' }}
    >
      {/* Background with Vignette */}
      <div className="absolute inset-0 bg-[#0A0A0A] pointer-events-none" />
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.8) 100%)',
        }}
      />
      
      {/* Subtle noise texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo — no entrance animation, instant paint for LCP */}
        <div className="mb-0.5 sm:mb-6 relative overflow-visible">
          {/* Pulsing Glow Background */}
          <div
            className="absolute -inset-x-4 -inset-y-2 animate-pulse"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(255, 107, 0, 0.4) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />
          
          {/* Logo — compact on mobile, explicit dimensions to prevent CLS */}
          <img
            src={streetEatzLogo}
            alt="StreetEatz Logo"
            width={80}
            height={80}
            className="w-20 sm:w-48 md:w-56 lg:w-64 h-auto relative z-10 drop-shadow-[0_0_30px_rgba(255,107,0,0.5)]"
            fetchPriority="high"
          />
        </div>

        {/* Text — visible immediately, no layout shift */}
        <div className="space-y-0.5 sm:space-y-2 mb-1 sm:mb-6">
          <h1
            className="font-heading font-extrabold text-primary tracking-tight"
            style={{
              fontSize: 'clamp(1.75rem, 6vw, 3rem)',
              lineHeight: 1.1,
              textShadow: '0 0 40px rgba(255, 107, 0, 0.5), 0 0 80px rgba(255, 107, 0, 0.3)',
            }}
          >
            StreetEatz Waterford
          </h1>
          
          <h2
            className="font-heading font-extrabold text-foreground tracking-tight hidden sm:block"
            style={{
              fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
              lineHeight: 1.1,
            }}
          >
            GOURMET STREET FOOD
          </h2>
        </div>

        {/* Tagline */}
        <p className="text-muted-foreground text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-2 sm:mb-8">
          Fresh · Bold · Waterford
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-row flex-wrap justify-center gap-2 sm:gap-4">
          <Button
            size="lg"
            onClick={scrollToMenu}
            className="btn-glow text-xs sm:text-base px-3 py-2 sm:px-8 sm:py-6 font-semibold tracking-wider"
          >
            ORDER NOW
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={scrollToMenu}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs sm:text-base px-3 py-2 sm:px-8 sm:py-6 font-semibold tracking-wider"
          >
            VIEW MENU
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setIsDeliveryModalOpen(true)}
            className="border-green-500 text-green-400 hover:bg-green-500 hover:text-white text-xs sm:text-base px-3 py-2 sm:px-8 sm:py-6 font-semibold tracking-wider gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            DELIVERY
          </Button>
        </div>
      </div>

      {/* Scroll Indicator — hidden on small mobile */}
      <div className="absolute bottom-6 sm:bottom-24 left-1/2 -translate-x-1/2 animate-bounce opacity-70 hidden sm:block">
        <ChevronDown className="w-8 h-8 text-muted-foreground" />
      </div>

      {/* Delivery Options Modal — lazy loaded */}
      {isDeliveryModalOpen && (
        <Suspense fallback={null}>
          <DeliveryOptionsModal open={isDeliveryModalOpen} onOpenChange={setIsDeliveryModalOpen} />
        </Suspense>
      )}
    </section>
  );
}
