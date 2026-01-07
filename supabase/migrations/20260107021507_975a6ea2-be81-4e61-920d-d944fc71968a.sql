-- Add display_id for simple order numbering (auto-incrementing)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS display_id SERIAL;

-- Create a unique index on display_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_display_id ON public.orders(display_id);

-- Add 'pending_payment' to the order_status enum for pay-on-collection orders
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pending_payment';