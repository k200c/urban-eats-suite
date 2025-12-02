import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { Product } from '@/types/database';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import heroBurger from '@/assets/hero-burger.jpg';
import loadedFries from '@/assets/loaded-fries.jpg';
import flatbread from '@/assets/flatbread.jpg';

interface HeroCarouselProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

const fallbackImages = [heroBurger, flatbread, loadedFries];

export function HeroCarousel({ products, onProductClick }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const featuredProducts = products.length > 0 ? products : [];

  useEffect(() => {
    if (featuredProducts.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredProducts.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [featuredProducts.length]);

  const goTo = (index: number) => {
    setCurrentIndex(index);
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredProducts.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length);
  };

  if (featuredProducts.length === 0) {
    return (
      <div className="relative h-72 bg-gradient-to-br from-secondary to-background rounded-2xl overflow-hidden">
        <img
          src={heroBurger}
          alt="Street Eats"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-primary" />
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Featured</span>
          </div>
          <h2 className="font-heading text-3xl text-foreground mb-1">Street Eats</h2>
          <p className="text-muted-foreground text-sm">Gourmet food truck experience</p>
        </div>
      </div>
    );
  }

  const currentProduct = featuredProducts[currentIndex];
  const imageUrl = currentProduct?.image_url || fallbackImages[currentIndex % fallbackImages.length];

  return (
    <div className="relative h-72 rounded-2xl overflow-hidden">
      {/* Image */}
      <div className="absolute inset-0 transition-opacity duration-500">
        <img
          src={imageUrl}
          alt={currentProduct?.name || 'Featured item'}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-5 h-5 text-primary animate-pulse" />
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Featured</span>
        </div>
        <h2 className="font-heading text-3xl text-foreground mb-1">{currentProduct?.name}</h2>
        <p className="text-muted-foreground text-sm mb-3 line-clamp-1">{currentProduct?.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-heading text-primary">€{currentProduct?.price?.toFixed(2)}</span>
          <Button
            variant="glow"
            size="sm"
            onClick={() => onProductClick(currentProduct)}
          >
            Order Now
          </Button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {featuredProducts.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/50 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background/70 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/50 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background/70 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {featuredProducts.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2">
          {featuredProducts.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                index === currentIndex
                  ? 'w-6 bg-primary'
                  : 'bg-foreground/30 hover:bg-foreground/50'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
