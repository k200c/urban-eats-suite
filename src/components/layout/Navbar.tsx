import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Menu, X, User, LogOut, Settings, History, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cartStore';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const navLinks = [
  { label: 'MENU', href: '#menu' },
  { label: 'DETAILS', href: '/details', isRoute: true },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const itemCount = useCartStore((state) => state.getItemCount());
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, profile, signOut, isAdmin } = useAuth();

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

  const handleSignOut = async () => {
    try {
      // Cancel all queries first to prevent hanging
      queryClient.cancelQueries();
      queryClient.clear();
      
      await signOut();
      
      toast.success('Signed out successfully');
      
      // HARD REDIRECT - destroys ALL React state
      window.location.href = '/';
    } catch (error) {
      console.error("Sign out error:", error);
      // Nuclear fallback - clear everything and redirect
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/auth';
    }
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Account';
  const initials = displayName.charAt(0).toUpperCase();

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
              link.isRoute ? (
                <button
                  key={link.label}
                  onClick={() => { navigate(link.href); setIsOpen(false); }}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wider"
                >
                  {link.label}
                </button>
              ) : (
                <button
                  key={link.label}
                  onClick={() => scrollToSection(link.href.replace('#', ''))}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wider"
                >
                  {link.label}
                </button>
              )
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* User Profile / Auth - Desktop */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary-foreground">{initials}</span>
                    </div>
                    <span className="max-w-[100px] truncate">{displayName}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <History className="w-4 h-4 mr-2" />
                    Order History
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/admin/pos')}>
                        <Settings className="w-4 h-4 mr-2" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/auth')}
                className="hidden sm:flex text-muted-foreground hover:text-foreground"
              >
                <User className="w-4 h-4 mr-1" />
                LOGIN
              </Button>
            )}

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
              className="md:hidden touch-manipulation relative z-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu - Full Height Overlay */}
        {isOpen && (
          <div 
            className="fixed inset-0 top-16 z-40 md:hidden bg-black/95 backdrop-blur-lg animate-fade-in overflow-y-auto"
            onClick={() => setIsOpen(false)}
          >
            <div 
              className="flex flex-col gap-6 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {navLinks.map((link) => (
                link.isRoute ? (
                  <button
                    key={link.label}
                    onClick={() => { navigate(link.href); setIsOpen(false); }}
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors tracking-wider text-left py-2"
                  >
                    {link.label}
                  </button>
                ) : (
                  <button
                    key={link.label}
                    onClick={() => scrollToSection(link.href.replace('#', ''))}
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors tracking-wider text-left py-2"
                  >
                    {link.label}
                  </button>
                )
              ))}
              
              <div className="border-t border-white/10 pt-4">
                {user ? (
                  <>
                    <button
                      onClick={() => { navigate('/profile'); setIsOpen(false); }}
                      className="w-full text-lg font-medium text-foreground hover:text-primary transition-colors tracking-wider text-left py-3 flex items-center gap-3"
                    >
                      <User className="w-5 h-5" />
                      PROFILE
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { navigate('/admin/pos'); setIsOpen(false); }}
                        className="w-full text-lg font-medium text-primary hover:text-primary/80 transition-colors tracking-wider text-left py-3"
                      >
                        ADMIN DASHBOARD
                      </button>
                    )}
                    <button
                      onClick={() => { handleSignOut(); setIsOpen(false); }}
                      className="w-full text-lg font-medium text-destructive hover:text-destructive/80 transition-colors tracking-wider text-left py-3"
                    >
                      SIGN OUT
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { navigate('/auth'); setIsOpen(false); }}
                    className="w-full text-lg font-medium text-foreground hover:text-primary transition-colors tracking-wider text-left py-3"
                  >
                    LOGIN / SIGN UP
                  </button>
                )}
              </div>
              
              <Button onClick={() => scrollToSection('menu')} className="w-full btn-glow mt-4 h-14 text-lg">
                ORDER NOW
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
