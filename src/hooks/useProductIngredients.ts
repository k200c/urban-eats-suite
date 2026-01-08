import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Ingredient } from '@/types/database';

export interface ProductIngredientWithDetails extends Ingredient {
  is_default: boolean;
  is_removable: boolean;
  is_addable: boolean;
}

export function useProductIngredients(productId?: string) {
  return useQuery({
    queryKey: ['product-ingredients', productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('product_ingredients')
        .select(`
          is_default,
          is_removable,
          is_addable,
          ingredients:ingredient_id (
            id,
            name,
            created_at
          )
        `)
        .eq('product_id', productId);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Transform the data
      const ingredients: ProductIngredientWithDetails[] = data
        .filter((item) => item.ingredients)
        .map((item) => ({
          ...(item.ingredients as unknown as Ingredient),
          is_default: item.is_default,
          is_removable: item.is_removable,
          is_addable: item.is_addable,
        }));

      return ingredients;
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 5,
  });
}
