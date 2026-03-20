import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Product } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Upload, X } from 'lucide-react';
import { ProductIngredientManager } from './ProductIngredientManager';
import { optimizeImageBeforeUpload } from '@/lib/imageOptimization';

interface EditProductDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductUpdated: () => void;
}

export function EditProductDialog({ product, open, onOpenChange, onProductUpdated }: EditProductDialogProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  // Sync form with product data when dialog opens
  useEffect(() => {
    if (product && open) {
      setName(product.name);
      setPrice(product.price.toFixed(2));
      setDescription(product.description || '');
      setIsAvailable(product.is_available ?? true);
      setIsFeatured(product.is_featured ?? false);
      setCurrentImageUrl(product.image_url || null);
      setImageFile(null);
      setImagePreview(null);
      setRemoveImage(false);
    }
  }, [product, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image is too large (max 10 MB).');
      return;
    }

    setImageFile(file);
    setRemoveImage(false);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const optimized = await optimizeImageBeforeUpload(file);
    const fileExt = optimized.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filePath, optimized);

    if (uploadError) throw new Error('Failed to upload image');

    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSave = async () => {
    if (!product || !name.trim()) {
      toast.error('Product name is required');
      return;
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setIsSaving(true);

    try {
      let imageUrl: string | null | undefined = undefined; // undefined = no change

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      } else if (removeImage) {
        imageUrl = null;
      }

      const updateData: Record<string, any> = {
        name: name.trim(),
        price: priceValue,
        description: description.trim() || null,
        is_available: isAvailable,
        is_featured: isFeatured,
        updated_at: new Date().toISOString(),
      };

      if (imageUrl !== undefined) {
        updateData.image_url = imageUrl;
      }

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', product.id);

      if (error) throw error;

      toast.success('Menu Updated Successfully', {
        description: `${name} has been updated.`,
      });
      onProductUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to update product:', {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      });
      if (error?.code === '23505') {
        toast.error('A product with this name already exists.');
      } else {
        toast.error(error?.message || 'Failed to update product. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Menu Item</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update product details. Changes reflect instantly on the customer menu.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Classic Smash Burger"
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (€) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="9.50"
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the item (e.g., Two smashed beef patties with American cheese, pickles, and house sauce)"
                className="bg-background/50 min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                This description is visible to customers on the menu
              </p>
            </div>

            {/* Product Image */}
            <div className="space-y-2">
              <Label>Product Image</Label>
              <div className="flex items-center gap-4">
                {imagePreview || (!removeImage && currentImageUrl) ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                    <img
                      src={imagePreview || currentImageUrl!}
                      alt="Product"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        setRemoveImage(true);
                      }}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/20 transition-colors">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
                {(imagePreview || (!removeImage && currentImageUrl)) && (
                  <label className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
                      <span>
                        <Upload className="w-3.5 h-3.5" />
                        Change
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </span>
                    </Button>
                  </label>
                )}
              </div>
            </div>
            {product && (
              <ProductIngredientManager productId={product.id} />
            )}

            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <div>
                <Label>In Stock</Label>
                <p className="text-xs text-muted-foreground">Toggle availability</p>
              </div>
              <Switch
                checked={isAvailable}
                onCheckedChange={setIsAvailable}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <div>
                <Label>Featured</Label>
                <p className="text-xs text-muted-foreground">Show "HOT" badge</p>
              </div>
              <Switch
                checked={isFeatured}
                onCheckedChange={setIsFeatured}
              />
            </div>
          </div>
        </ScrollArea>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
