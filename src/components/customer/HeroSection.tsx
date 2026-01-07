import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
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
    <section className="min-h-screen flex flex-col items-center justify-center text-center px-4 pt-16 pb-20 relative overflow-hidden">
      {/* Background with Vignette */}
      <div className="absolute inset-0 bg-[#0A0A0A]" />
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.8) 100%)',
        }}
      />
      
      {/* Smoke/Steam Effect Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Rising Steam Animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-64 opacity-[0.03]"
            style={{
              left: `${15 + i * 18}%`,
              bottom: '-20%',
              background: 'linear-gradient(to top, transparent, hsl(var(--primary) / 0.3), transparent)',
              filter: 'blur(20px)',
            }}
            animate={{
              y: [0, -400, -800],
              opacity: [0, 0.05, 0],
              scaleX: [1, 1.5, 2],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              delay: i * 1.5,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center" style={{ opacity: 1 }}>
        {/* Logo with Levitation Animation */}
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
          {/* Pulsing Glow Background */}
          <motion.div
            className="absolute inset-0 -inset-x-8 -inset-y-8"
            animate={{
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              background: 'radial-gradient(ellipse at center, rgba(255, 107, 0, 0.3) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />
          
          {/* Levitating Logo */}
          <motion.img
            src={streetEatzLogo}
            alt="Street Eatz Logo"
            className="w-48 sm:w-56 md:w-64 h-auto relative z-10 drop-shadow-[0_0_30px_rgba(255,107,0,0.5)]"
            animate={{
              y: [-10, 10, -10],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>

        {/* Text Animations - Staggered Entrance */}
        <div className="space-y-2 mb-6">
          <motion.h1
            className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-primary tracking-tight"
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
            className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground tracking-tight"
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
          className="text-muted-foreground text-sm sm:text-base tracking-[0.3em] uppercase mb-10"
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
            className="btn-glow text-base px-8 py-6 font-semibold tracking-wider"
          >
            ORDER NOW
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={scrollToMenu}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground text-base px-8 py-6 font-semibold tracking-wider"
          >
            VIEW MENU
          </Button>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-24 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{
          opacity: { delay: 1.8, duration: 0.5 },
          y: { delay: 1.8, duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <ChevronDown className="w-8 h-8 text-muted-foreground" />
      </motion.div>
    </section>
  );
}
