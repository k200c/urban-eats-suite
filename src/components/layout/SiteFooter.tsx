import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Info } from "lucide-react";
import { AllergenModal } from "@/components/ui/allergen-modal";
import { APP_VERSION } from "@/lib/pwa";
// SVG Payment Icons as components for clean rendering
const VisaIcon = () => (
  <svg viewBox="0 0 48 32" className="h-8 w-auto" aria-label="Visa">
    <rect width="48" height="32" rx="4" fill="#1A1F71" />
    <path
      d="M19.5 21H17.2L18.7 11H21L19.5 21ZM15.1 11L12.9 18L12.6 16.5L11.7 12.2C11.7 12.2 11.6 11 10 11H6.1L6 11.2C6 11.2 7.8 11.6 9.8 12.8L11.8 21H14.2L17.6 11H15.1ZM35.8 21H38L36.1 11H34.2C32.9 11 32.5 12 32.5 12L29 21H31.4L31.9 19.5H34.8L35.8 21ZM32.5 17.7L33.9 13.8L34.7 17.7H32.5ZM29.1 14.2L29.4 12.5C29.4 12.5 28 12 26.5 12C24.9 12 21.5 12.7 21.5 15.5C21.5 18.1 25.1 18.1 25.1 19.5C25.1 20.9 21.9 20.5 20.6 19.5L20.3 21.3C20.3 21.3 21.7 22 23.8 22C25.9 22 29.1 20.8 29.1 18.3C29.1 15.7 25.4 15.4 25.4 14.2C25.4 13 27.9 13.2 29.1 14.2Z"
      fill="white"
    />
  </svg>
);

const MastercardIcon = () => (
  <svg viewBox="0 0 48 32" className="h-8 w-auto" aria-label="Mastercard">
    <rect width="48" height="32" rx="4" fill="#000" />
    <circle cx="18" cy="16" r="8" fill="#EB001B" />
    <circle cx="30" cy="16" r="8" fill="#F79E1B" />
    <path
      d="M24 10.3C25.8 11.7 27 13.7 27 16C27 18.3 25.8 20.3 24 21.7C22.2 20.3 21 18.3 21 16C21 13.7 22.2 11.7 24 10.3Z"
      fill="#FF5F00"
    />
  </svg>
);

const VivaWalletIcon = () => (
  <svg viewBox="0 0 48 32" className="h-8 w-auto" aria-label="Viva Wallet">
    <rect width="48" height="32" rx="4" fill="#00A3E0" />
    <text
      x="24"
      y="18"
      textAnchor="middle"
      fill="white"
      fontSize="8"
      fontWeight="bold"
      fontFamily="Arial, sans-serif"
    >
      VIVA
    </text>
  </svg>
);

export function SiteFooter() {
  return (
    <footer className="bg-black/95 border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand & Contact */}
          <div>
            <h3 className="font-heading text-lg text-foreground mb-4">
              STREET EATZ WATERFORD
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Crystal Sports & Leisure Centre, Waterford</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <a href="tel:+353871234567" className="hover:text-primary transition-colors">
                  +353 87 123 4567
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <a href="mailto:hello@streeteatzwaterford.ie" className="hover:text-primary transition-colors">
                  hello@streeteatzwaterford.ie
                </a>
              </div>
            </div>
          </div>

          {/* Opening Hours */}
          <div>
            <h3 className="font-heading text-lg text-foreground mb-4">OPENING HOURS</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Thursday - Friday</span>
                <span className="text-foreground">12pm - 7pm</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday - Sunday</span>
                <span className="text-foreground">1pm - 7pm</span>
              </div>
              <div className="flex justify-between">
                <span>Monday - Wednesday</span>
                <span className="text-destructive">Closed</span>
              </div>
            </div>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-heading text-lg text-foreground mb-4">LEGAL</h3>
            <div className="space-y-2 text-sm">
              <Link
                to="/privacy-policy"
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms-and-conditions"
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                Terms & Conditions
              </Link>
              <AllergenModal
                trigger={
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                    <Info className="w-4 h-4" />
                    Allergen Information
                  </button>
                }
              />
            </div>
          </div>
        </div>

        {/* Payment methods divider */}
        <div className="border-t border-white/10 pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Payment trust signals */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground mr-2">Secure payments by:</span>
              <div className="flex items-center gap-3">
                <VisaIcon />
                <MastercardIcon />
                <VivaWalletIcon />
              </div>
            </div>

            {/* Copyright & Version */}
            <p className="text-xs text-muted-foreground text-center md:text-right">
              © {new Date().getFullYear()} Street Eatz Waterford. All rights reserved.
              <br />
              <span className="text-primary/70">Made with ❤️ in Ireland 🇮🇪</span>
              <br />
              <span className="text-muted-foreground/50 text-[10px]">v{APP_VERSION}</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
