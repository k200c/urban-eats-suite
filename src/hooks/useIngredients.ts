import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Ingredient {
  id: string;
  name: string;
  ingredient_type: string;
  addon_price: number;
  addon_price_kids: number;
  created_at: string;
}

export interface ProductIngredient {
  id: string;
  product_id: string;
  ingredient_id: string;
  is_default: boolean;
  is_removable: boolean;
  created_at: string;
}

export interface ProductIngredientWithDetails extends ProductIngredient {
  ingredient: Ingredient;
}

// Fetch all available ingredients
export function useAllIngredients() {
  return useQuery({
    queryKey: ['all-ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Ingredient[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Fetch ingredients for a specific product
export function useProductIngredientsAdmin(productId?: string) {
  return useQuery({
    queryKey: ['product-ingredients-admin', productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('product_ingredients')
        .select(`
          id,
          product_id,
          ingredient_id,
          is_default,
          is_removable,
          created_at,
          ingredients:ingredient_id (
            id,
            name,
            ingredient_type,
            addon_price,
            addon_price_kids,
            created_at
          )
        `)
        .eq('product_id', productId);

      if (error) throw error;
      if (!data) return [];

      // Transform the data
      return data
        .filter((item) => item.ingredients)
        .map((item) => ({
          id: item.id,
          product_id: item.product_id,
          ingredient_id: item.ingredient_id,
          is_default: item.is_default,
          is_removable: (item as any).is_removable ?? true,
          created_at: item.created_at,
          ingredient: item.ingredients as unknown as Ingredient,
        })) as ProductIngredientWithDetails[];
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 2,
  });
}

// Add a new ingredient to the global list
export function useAddIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('ingredients')
        .insert({ name: name.trim() })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-ingredients'] });
    },
  });
}

// Add an ingredient to a product
export function useAddProductIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      ingredientId,
      isDefault = true,
      isRemovable = true,
    }: {
      productId: string;
      ingredientId: string;
      isDefault?: boolean;
      isRemovable?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('product_ingredients')
        .insert({
          product_id: productId,
          ingredient_id: ingredientId,
          is_default: isDefault,
          is_removable: isRemovable,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-ingredients-admin', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['product-ingredients', variables.productId] });
    },
  });
}

// Update a product ingredient
export function useUpdateProductIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      productId,
      isDefault,
      isRemovable,
    }: {
      id: string;
      productId: string;
      isDefault?: boolean;
      isRemovable?: boolean;
    }) => {
      const updates: Record<string, boolean> = {};
      if (isDefault !== undefined) updates.is_default = isDefault;
      if (isRemovable !== undefined) updates.is_removable = isRemovable;

      const { error } = await supabase
        .from('product_ingredients')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-ingredients-admin', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['product-ingredients', variables.productId] });
    },
  });
}

// Remove an ingredient from a product
export function useRemoveProductIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase
        .from('product_ingredients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-ingredients-admin', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['product-ingredients', variables.productId] });
    },
  });
}
