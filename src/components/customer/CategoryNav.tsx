import { ProductCategory } from '@/types/database';
import { cn } from '@/lib/utils';
import { Beef, Pizza, Salad, GlassWater, Sparkles } from 'lucide-react';

const categories: { value: ProductCategory | 'All'; label: string; icon: typeof Beef }[] = [
  { value: 'All', label: 'All', icon: Sparkles },
  { value: 'Burgers', label: 'Burgers', icon: Beef },
  { value: 'Flatbreads', label: 'Flatbreads', icon: Pizza },
  { value: 'Fries', label: 'Fries', icon: Salad },
  { value: 'Drinks', label: 'Drinks', icon: GlassWater },
  { value: 'Specials', label: 'Specials', icon: Sparkles },
];

interface CategoryNavProps {
  selected: ProductCategory | 'All';
  onSelect: (category: ProductCategory | 'All') => void;
}

export function CategoryNav({ selected, onSelect }: CategoryNavProps) {
  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg py-3 -mx-4 px-4">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {categories.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className={cn(
              'category-pill flex items-center gap-2 whitespace-nowrap',
              selected === value && 'active'
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
