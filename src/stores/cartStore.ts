import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product, SelectedModifier, RemovedIngredient } from '@/types/database';

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity: number, modifiers: SelectedModifier[], removedIngredients: RemovedIngredient[]) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity, modifiers, removedIngredients) => {
        const modifiersTotal = modifiers.reduce((sum, m) => sum + m.price_adjustment, 0);
        const totalPrice = (product.price + modifiersTotal) * quantity;

        set((state) => ({
          items: [
            ...state.items,
            {
              product,
              quantity,
              selectedModifiers: modifiers,
              removedIngredients,
              totalPrice,
            },
          ],
        }));
      },

      removeItem: (index) => {
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
        }));
      },

      updateQuantity: (index, quantity) => {
        set((state) => ({
          items: state.items.map((item, i) => {
            if (i !== index) return item;
            const modifiersTotal = item.selectedModifiers.reduce(
              (sum, m) => sum + m.price_adjustment,
              0
            );
            return {
              ...item,
              quantity,
              totalPrice: (item.product.price + modifiersTotal) * quantity,
            };
          }),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => {
        return get().items.reduce((sum, item) => sum + item.totalPrice, 0);
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'street-eats-cart',
    }
  )
);
