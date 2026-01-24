export type ProductCategory = 'Burgers' | 'Flatbreads' | 'Fries' | 'Drinks' | 'Specials' | 'Sauces';
export type UserRole = 'customer' | 'staff' | 'admin';
export type OrderStatus = 'pending' | 'cooking' | 'ready' | 'completed' | 'pending_payment';
export type PaymentMethod = 'card' | 'cash' | 'split';
export type PostPlatform = 'Instagram' | 'SMS';
export type PostStatus = 'draft' | 'published';

export interface Profile {
  id: string;
  phone: string | null;
  full_name: string | null;
  role: UserRole;
  loyalty_points: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: ProductCategory;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  stock_count: number;
  created_at: string;
  updated_at: string;
}

export interface ModifierGroup {
  id: string;
  name: string;
  min_selection: number;
  max_selection: number;
  created_at: string;
}

export interface Modifier {
  id: string;
  group_id: string;
  name: string;
  price_adjustment: number;
  created_at: string;
}

export interface ProductModifier {
  id: string;
  product_id: string;
  group_id: string;
}

export interface Ingredient {
  id: string;
  name: string;
  created_at: string;
}

export interface ProductIngredient {
  id: string;
  product_id: string;
  ingredient_id: string;
  is_default: boolean;
  created_at: string;
}

export interface RemovedIngredient {
  id: string;
  name: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  total: number;
  cash_tendered: number | null;
  change_due: number | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  selected_modifiers: SelectedModifier[];
  created_at: string;
}

export interface SelectedModifier {
  id: string;
  name: string;
  price_adjustment: number;
}

export interface MarketingPost {
  id: string;
  content: string;
  platform: PostPlatform;
  status: PostStatus;
  image_generated_url: string | null;
  product_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedModifiers: SelectedModifier[];
  removedIngredients: RemovedIngredient[];
  totalPrice: number;
  dbId?: string; // Database ID for Supabase cart items
}
