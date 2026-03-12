import { format } from 'date-fns';
import { RefreshCw, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cartStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface OrderHistoryCardProps {
  order: {
    id: string;
    total: number;
    created_at: string;
    items: {
      id: string;
      product_name: string | null;
      quantity: number | null;
      unit_price: number;
      selected_modifiers: any;
    }[];
  };
}

export function OrderHistoryCard({ order }: OrderHistoryCardProps) {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clearCart);
  
  const orderNumber = order.id.slice(-4).toUpperCase();
  const orderDate = format(new Date(order.created_at), 'MMM d, yyyy');
  const orderTime = format(new Date(order.created_at), 'h:mm a');

  const handleReorder = async () => {
    try {
      // Clear existing cart
      clearCart();
      
      // Fetch current product data for each item
      for (const item of order.items) {
        if (!item.product_name) continue;
        
        // Try to find the product by name
        const { data: product } = await supabase
          .from('products')
          .select('*')
          .ilike('name', item.product_name)
          .maybeSingle();
        
        if (product) {
          // Parse modifiers from the saved order
          const modifiers = Array.isArray(item.selected_modifiers) 
            ? item.selected_modifiers.map((m: any) => ({
                id: m.id || crypto.randomUUID(),
                name: m.name || '',
                price_adjustment: m.price_adjustment || 0,
              }))
            : [];
          
          addItem(
            {
              id: product.id,
              name: product.name,
              description: product.description,
              price: product.price,
              category: product.category,
              image_url: product.image_url,
              is_available: product.is_available ?? true,
              is_visible: true,
              is_sold_out: product.is_sold_out ?? false,
              is_featured: product.is_featured ?? false,
              stock_count: product.stock_count ?? 100,
              created_at: product.created_at ?? '',
              updated_at: product.updated_at ?? '',
            },
            item.quantity || 1,
            modifiers,
            [] // No removed ingredients info saved
          );
        }
      }
      
      toast.success('Items added to cart!');
      navigate('/cart');
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Failed to add items. Please try again.');
    }
  };

  // Get items summary
  const itemsSummary = order.items
    .slice(0, 2)
    .map(item => `${item.quantity || 1}x ${item.product_name}`)
    .join(', ');
  const remainingCount = order.items.length - 2;

  return (
    <div className="glass-card p-4 hover:bg-secondary/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        {/* Order Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-4 h-4 text-primary" />
            <span className="font-heading text-foreground">#{orderNumber}</span>
            <span className="text-xs text-muted-foreground">• {orderDate}</span>
          </div>
          
          <p className="text-sm text-muted-foreground truncate">
            {itemsSummary}
            {remainingCount > 0 && ` +${remainingCount} more`}
          </p>
          
          <p className="text-sm font-semibold text-primary mt-1">
            €{order.total.toFixed(2)}
          </p>
        </div>

        {/* Re-order Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleReorder}
          className="shrink-0 gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
        >
          <RefreshCw className="w-4 h-4" />
          Re-order
        </Button>
      </div>
    </div>
  );
}
