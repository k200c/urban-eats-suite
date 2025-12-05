import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cartStore';

const navLinks = [
  { label: 'MENU', href: '#menu' },
  { label: 'ABOUT', href: '#about' },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const itemCount = useCartStore((state) => state.getItemCount());
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToSection = (sectionId: string) => {
    // If not on home page, navigate first
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const section = document.getElementById(sectionId);
        if (section) section.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const section = document.getElementById(sectionId);
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    }
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="font-heading text-xl font-bold text-foreground tracking-wider">
              STREET <span className="text-primary">EATZ</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollToSection(link.href.replace('#', ''))}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wider"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Staff Login */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/auth')}
              className="hidden sm:flex text-muted-foreground hover:text-foreground"
            >
              <User className="w-4 h-4 mr-1" />
              STAFF
            </Button>

            {/* Cart Icon */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate('/cart')}
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Button>

            {/* Order Now Button */}
            <Button
              onClick={() => scrollToSection('menu')}
              className="hidden sm:flex btn-glow"
            >
              ORDER NOW
            </Button>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-white/10 animate-fade-in">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollToSection(link.href.replace('#', ''))}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wider text-left"
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => { navigate('/auth'); setIsOpen(false); }}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wider text-left"
              >
                STAFF LOGIN
              </button>
              <Button onClick={() => scrollToSection('menu')} className="w-full btn-glow mt-2">
                ORDER NOW
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
