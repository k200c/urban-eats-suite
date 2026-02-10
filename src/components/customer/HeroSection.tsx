import { Button } from '@/components/ui/button';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import streetEatzLogo from '@/assets/street-eatz-logo.png';

export function HeroSection() {
  const scrollToMenu = () => {
    const menuSection = document.getElementById('menu');
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section 
      className="min-h-[50vh] sm:min-h-[70vh] md:min-h-screen flex flex-col items-center justify-center text-center px-4 pt-12 sm:pt-16 pb-12 sm:pb-20 relative overflow-hidden"
      style={{ scrollMarginTop: 'var(--header-offset)' }}
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
        {/* Logo with entrance animation only */}
        <motion.div
          className="mb-6 relative"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 15,
            duration: 1.2,
          }}
        >
          {/* Pulsing Glow Background - CSS animation */}
          <div
            className="absolute inset-0 -inset-x-8 -inset-y-8 animate-pulse"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(255, 107, 0, 0.4) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />
          
          {/* Logo - static after entrance */}
          <img
            src={streetEatzLogo}
            alt="Street Eatz Logo"
            className="w-32 sm:w-48 md:w-56 lg:w-64 h-auto relative z-10 drop-shadow-[0_0_30px_rgba(255,107,0,0.5)]"
          />
        </motion.div>

        {/* Text Animations - Staggered Entrance */}
        <div className="space-y-1 sm:space-y-2 mb-4 sm:mb-6">
          <motion.h1
            className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-extrabold text-primary tracking-tight"
            style={{
              textShadow: '0 0 40px rgba(255, 107, 0, 0.5), 0 0 80px rgba(255, 107, 0, 0.3)',
            }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.8,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            GOURMET
          </motion.h1>
          
          <motion.h2
            className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold text-foreground tracking-tight"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 1.0,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            STREET FOOD
          </motion.h2>
        </div>

        {/* Tagline */}
        <motion.p
          className="text-muted-foreground text-xs sm:text-sm md:text-base tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-6 sm:mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.8,
            delay: 1.2,
          }}
        >
          Fresh · Bold · Waterford
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 1.4,
          }}
        >
          <Button
            size="lg"
            onClick={scrollToMenu}
            className="btn-glow text-sm sm:text-base px-6 py-4 sm:px-8 sm:py-6 font-semibold tracking-wider"
          >
            ORDER NOW
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={scrollToMenu}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground text-sm sm:text-base px-6 py-4 sm:px-8 sm:py-6 font-semibold tracking-wider"
          >
            VIEW MENU
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => window.open('https://www.just-eat.ie/restaurants-street-eatz-waterford-waterford/menu', '_blank', 'noopener,noreferrer')}
            className="border-green-500 text-green-400 hover:bg-green-500 hover:text-white text-sm sm:text-base px-6 py-4 sm:px-8 sm:py-6 font-semibold tracking-wider gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            DELIVERY (Just Eat)
          </Button>
        </motion.div>
      </div>

      {/* Scroll Indicator - CSS animation */}
      <div className="absolute bottom-16 sm:bottom-24 left-1/2 -translate-x-1/2 animate-bounce opacity-70">
        <ChevronDown className="w-8 h-8 text-muted-foreground" />
      </div>
    </section>
  );
}
