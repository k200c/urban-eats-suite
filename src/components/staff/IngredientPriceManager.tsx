import { useState, useMemo, useCallback } from 'react';
import { Search, X, ChevronDown, ChevronUp, Loader2, Save, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAllIngredients } from '@/hooks/useIngredients';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const INGREDIENT_TYPES = ['meat', 'cheese', 'sauce', 'other'] as const;
const TYPE_SORT_ORDER: Record<string, number> = { meat: 0, cheese: 1, sauce: 2, other: 3 };

interface EditedValues {
  name?: string;
  ingredient_type?: string;
  addon_price?: string;
  addon_price_kids?: string;
}

export function IngredientPriceManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [edits, setEdits] = useState<Record<string, EditedValues>>({});
  const { data: ingredients, isLoading } = useAllIngredients();
  const queryClient = useQueryClient();

  const filtered = useMemo(() => {
    if (!ingredients) return [];
    const list = search
      ? ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
      : [...ingredients];
    return list.sort((a, b) => {
      const ta = TYPE_SORT_ORDER[a.ingredient_type] ?? 3;
      const tb = TYPE_SORT_ORDER[b.ingredient_type] ?? 3;
      return ta !== tb ? ta - tb : a.name.localeCompare(b.name);
    });
  }, [ingredients, search]);

  const dirtyIds = useMemo(() => {
    if (!ingredients) return [];
    return Object.entries(edits)
      .filter(([id, vals]) => {
        const orig = ingredients.find(i => i.id === id);
        if (!orig) return false;
        if (vals.name !== undefined && vals.name !== orig.name) return true;
        if (vals.ingredient_type !== undefined && vals.ingredient_type !== orig.ingredient_type) return true;
        if (vals.addon_price !== undefined && vals.addon_price !== orig.addon_price.toFixed(2)) return true;
        if (vals.addon_price_kids !== undefined && vals.addon_price_kids !== orig.addon_price_kids.toFixed(2)) return true;
        return false;
      })
      .map(([id]) => id);
  }, [edits, ingredients]);

  const dirtyCount = dirtyIds.length;

  const updateEdit = useCallback((id: string, field: keyof EditedValues, value: string) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }, []);

  const handleReset = useCallback(() => {
    setEdits({});
  }, []);

  const handleSave = useCallback(async () => {
    if (!ingredients || dirtyIds.length === 0) return;

    // Validate
    for (const id of dirtyIds) {
      const vals = edits[id];
      if (vals?.addon_price !== undefined) {
        const p = parseFloat(vals.addon_price);
        if (isNaN(p) || p < 0) {
          toast.error('Invalid price — must be a number >= 0');
          return;
        }
      }
      if (vals?.addon_price_kids !== undefined) {
        const p = parseFloat(vals.addon_price_kids);
        if (isNaN(p) || p < 0) {
          toast.error('Invalid kids price — must be a number >= 0');
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      const updates = dirtyIds.map(id => {
        const vals = edits[id];
        const payload: Record<string, string | number> = {};
        if (vals?.name !== undefined) payload.name = vals.name.trim();
        if (vals?.ingredient_type !== undefined) payload.ingredient_type = vals.ingredient_type;
        if (vals?.addon_price !== undefined) payload.addon_price = Number(parseFloat(vals.addon_price).toFixed(2));
        if (vals?.addon_price_kids !== undefined) payload.addon_price_kids = Number(parseFloat(vals.addon_price_kids).toFixed(2));
        return supabase.from('ingredients').update(payload).eq('id', id);
      });

      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;

      toast.success(`${dirtyIds.length} ingredient price${dirtyIds.length > 1 ? 's' : ''} updated`);
      setEdits({});
      queryClient.invalidateQueries({ queryKey: ['all-ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['product-ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['product-ingredients-admin'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [ingredients, dirtyIds, edits, queryClient]);

  const getVal = (id: string, field: keyof EditedValues, original: string) => {
    return edits[id]?.[field] ?? original;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border border-border rounded-lg mt-4">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/30 transition-colors rounded-t-lg">
          <div className="flex items-center gap-2">
            <Label className="cursor-pointer font-medium text-sm">Ingredient Prices</Label>
            <Badge variant="secondary" className="text-xs">{ingredients?.length || 0}</Badge>
            {dirtyCount > 0 && (
              <Badge variant="destructive" className="text-xs">{dirtyCount} unsaved</Badge>
            )}
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-border">
        <div className="p-3 space-y-3">
          {/* Search + Actions */}
          <div className="flex gap-2">
            <div className="relative flex-1">
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
            <Button size="sm" variant="outline" onClick={handleReset} disabled={dirtyCount === 0} className="h-8 text-xs gap-1">
              <RotateCcw className="w-3 h-3" /> Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={dirtyCount === 0 || isSaving} className="h-8 text-xs gap-1">
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              <div className="grid grid-cols-[1fr_80px_60px_60px] gap-1.5 px-1 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                <span>Name</span>
                <span>Type</span>
                <span>Price</span>
                <span>Kids</span>
              </div>

              {filtered.map(ing => {
                const isDirty = dirtyIds.includes(ing.id);
                return (
                  <div key={ing.id} className={`grid grid-cols-[1fr_80px_60px_60px] gap-1.5 items-center p-1.5 rounded border ${isDirty ? 'bg-primary/10 border-primary/30' : 'bg-secondary/20 border-border/30'}`}>
                    <Input
                      value={getVal(ing.id, 'name', ing.name)}
                      className="h-7 text-xs bg-background/50 border-border/50"
                      onChange={e => updateEdit(ing.id, 'name', e.target.value)}
                    />
                    <Select
                      value={getVal(ing.id, 'ingredient_type', ing.ingredient_type)}
                      onValueChange={v => updateEdit(ing.id, 'ingredient_type', v)}
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
                      value={getVal(ing.id, 'addon_price', ing.addon_price.toFixed(2))}
                      className="h-7 text-xs bg-background/50 border-border/50 px-1.5"
                      onChange={e => updateEdit(ing.id, 'addon_price', e.target.value)}
                    />
                    <Input
                      type="number"
                      step="0.10"
                      min="0"
                      value={getVal(ing.id, 'addon_price_kids', ing.addon_price_kids.toFixed(2))}
                      className="h-7 text-xs bg-background/50 border-border/50 px-1.5"
                      onChange={e => updateEdit(ing.id, 'addon_price_kids', e.target.value)}
                    />
                  </div>
                );
              })}
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
