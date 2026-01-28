-- Add is_sold_out column for dual-status inventory logic
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_sold_out BOOLEAN DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN products.is_sold_out IS 
  'When true, item is visible but grayed out and unclickable (temporary out of stock)';

COMMENT ON COLUMN products.is_available IS 
  'When false, item is completely hidden from all menus (discontinued/seasonal)';