-- Add Viva Wallet payment tracking columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS viva_order_code text,
ADD COLUMN IF NOT EXISTS viva_transaction_id text,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- Add index for quick lookups by viva_order_code
CREATE INDEX IF NOT EXISTS idx_orders_viva_order_code ON public.orders(viva_order_code);

-- Add comment for documentation
COMMENT ON COLUMN public.orders.viva_order_code IS 'Viva Wallet order code for payment tracking';
COMMENT ON COLUMN public.orders.viva_transaction_id IS 'Viva Wallet transaction ID after successful payment';
COMMENT ON COLUMN public.orders.payment_status IS 'Payment status: pending, processing, completed, failed';