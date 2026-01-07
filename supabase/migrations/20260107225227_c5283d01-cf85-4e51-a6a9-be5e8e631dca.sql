-- Create promotions table for discount/coupon management
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expiry_date TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  max_uses INTEGER,
  min_order_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add email column to customers table
ALTER TABLE public.customers ADD COLUMN email TEXT;

-- Add marketing banner fields to app_settings
ALTER TABLE public.app_settings 
ADD COLUMN marketing_banner_text TEXT,
ADD COLUMN marketing_banner_enabled BOOLEAN DEFAULT false;

-- Enable RLS on promotions
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Staff can manage all promotions
CREATE POLICY "Staff can manage promotions"
ON public.promotions
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active promotions (for checkout validation)
CREATE POLICY "Anyone can view active promotions"
ON public.promotions
FOR SELECT
USING (is_active = true);

-- Enable real-time on customers table
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;

-- Create trigger for updated_at on promotions
CREATE TRIGGER update_promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();