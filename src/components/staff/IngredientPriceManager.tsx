import { useState, useMemo, useCallback, useRef } from 'react';
import { Search, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAllIngredients } from '@/hooks/useIngredients';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const INGREDIENT_TYPES = ['meat', 'cheese', 'sauce', 'other'] as const;

const TYPE_SORT_ORDER: Record<string, number> = { meat: 0, cheese: 1, sauce: 2, other: 3 };

export function IngredientPriceManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: ingredients, isLoading, refetch } = useAllIngredients();
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const filtered = useMemo(() => {
    if (!ingredients) return [];
    const list = search
      ? ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
      : [...ingredients];
    return list.sort((a, b) => {
      const ta = TYPE_SORT_ORDER[a.ingredient_type] ?? 3;
      const tb = TYPE_SORT_ORDER[b.ingredient_type] ?? 3;
      if (ta !== tb) return ta - tb;
      return a.name.localeCompare(b.name);
    });
  }, [ingredients, search]);

  const saveField = useCallback((id: string, field: string, value: string | number) => {
    const key = `${id}-${field}`;
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(async () => {
      const { error } = await supabase
        .from('ingredients')
        .update({ [field]: value })
        .eq('id', id);
      if (error) {
        toast.error(`Failed to save: ${error.message}`);
      } else {
        refetch();
      }
    }, 600);
  }, [refetch]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border border-border rounded-lg mt-4">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/30 transition-colors rounded-t-lg">
          <div className="flex items-center gap-2">
            <Label className="cursor-pointer font-medium text-sm">Ingredient Prices</Label>
            <Badge variant="secondary" className="text-xs">{ingredients?.length || 0}</Badge>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-border">
        <div className="p-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search ingredients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-secondary/30 border-border/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {/* Header */}
              <div className="grid grid-cols-[1fr_80px_60px_60px] gap-1.5 px-1 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                <span>Name</span>
                <span>Type</span>
                <span>Price</span>
                <span>Kids</span>
              </div>

              {filtered.map(ing => (
                <div key={ing.id} className="grid grid-cols-[1fr_80px_60px_60px] gap-1.5 items-center p-1.5 rounded bg-secondary/20 border border-border/30">
                  <Input
                    defaultValue={ing.name}
                    className="h-7 text-xs bg-background/50 border-border/50"
                    onBlur={e => {
                      if (e.target.value !== ing.name) saveField(ing.id, 'name', e.target.value);
                    }}
                  />
                  <Select
                    defaultValue={ing.ingredient_type}
                    onValueChange={v => saveField(ing.id, 'ingredient_type', v)}
                  >
                    <SelectTrigger className="h-7 text-[10px] px-1.5 bg-background/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {INGREDIENT_TYPES.map(t => (
                        <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.10"
                    min="0"
                    defaultValue={ing.addon_price?.toFixed(2) ?? '0.50'}
                    className="h-7 text-xs bg-background/50 border-border/50 px-1.5"
                    onBlur={e => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) saveField(ing.id, 'addon_price', val);
                    }}
                  />
                  <Input
                    type="number"
                    step="0.10"
                    min="0"
                    defaultValue={ing.addon_price_kids?.toFixed(2) ?? '0.50'}
                    className="h-7 text-xs bg-background/50 border-border/50 px-1.5"
                    onBlur={e => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) saveField(ing.id, 'addon_price_kids', val);
                    }}
                  />
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">No ingredients found</p>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
