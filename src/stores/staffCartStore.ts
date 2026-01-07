import { create } from 'zustand';
import { CartItem, Product, SelectedModifier, RemovedIngredient } from '@/types/database';

/**
 * Staff-specific cart store that is completely isolated from the customer cart.
 * Uses a separate localStorage key and has no Supabase sync.
 */
interface StaffCartStore {
  items: CartItem[];
  addItem: (product: Product, quantity: number, modifiers: SelectedModifier[], removedIngredients: RemovedIngredient[]) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

const STAFF_CART_KEY = 'street-eats-staff-cart';

// Helper to load staff cart from localStorage
const loadStaffCart = (): CartItem[] => {
  try {
    const stored = localStorage.getItem(STAFF_CART_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load staff cart:', e);
  }
  return [];
};

// Helper to save staff cart to localStorage
const saveStaffCart = (items: CartItem[]) => {
  try {
    localStorage.setItem(STAFF_CART_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save staff cart:', e);
  }
};

export const useStaffCartStore = create<StaffCartStore>()((set, get) => ({
  items: loadStaffCart(),

  addItem: (product, quantity, modifiers, removedIngredients) => {
    const modifiersTotal = modifiers.reduce((sum, m) => sum + m.price_adjustment, 0);
    const totalPrice = (product.price + modifiersTotal) * quantity;

    const newItem: CartItem = {
      product,
      quantity,
      selectedModifiers: modifiers,
      removedIngredients,
      totalPrice,
    };

    set((state) => {
      const newItems = [...state.items, newItem];
      saveStaffCart(newItems);
      return { items: newItems };
    });
  },

  removeItem: (index) => {
    set((state) => {
      const newItems = state.items.filter((_, i) => i !== index);
      saveStaffCart(newItems);
      return { items: newItems };
    });
  },

  updateQuantity: (index, quantity) => {
    set((state) => {
      const newItems = state.items.map((item, i) => {
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
      });
      saveStaffCart(newItems);
      return { items: newItems };
    });
  },

  clearCart: () => {
    localStorage.removeItem(STAFF_CART_KEY);
    set({ items: [] });
  },

  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.totalPrice, 0);
  },

  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));
