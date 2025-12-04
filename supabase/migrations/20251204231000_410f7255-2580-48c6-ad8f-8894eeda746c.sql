-- Create customers table for CRM tracking
CREATE TABLE public.customers (
  phone_number TEXT PRIMARY KEY,
  name TEXT,
  total_spend NUMERIC NOT NULL DEFAULT 0,
  last_order_date TIMESTAMP WITH TIME ZONE,
  visit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Staff can view all customers
CREATE POLICY "Staff can view all customers"
ON public.customers
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Staff can update customers
CREATE POLICY "Staff can update customers"
ON public.customers
FOR UPDATE
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- System can insert/update customers (via trigger)
CREATE POLICY "System can manage customers"
ON public.customers
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger function to update customers on new order
CREATE OR REPLACE FUNCTION public.update_customer_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process if customer_phone is provided
  IF NEW.customer_phone IS NOT NULL AND NEW.customer_phone != '' THEN
    INSERT INTO public.customers (phone_number, name, total_spend, last_order_date, visit_count)
    VALUES (
      NEW.customer_phone,
      COALESCE(NEW.customer_name, 'Unknown'),
      NEW.total,
      NEW.created_at,
      1
    )
    ON CONFLICT (phone_number) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, customers.name),
      total_spend = customers.total_spend + EXCLUDED.total_spend,
      last_order_date = EXCLUDED.last_order_date,
      visit_count = customers.visit_count + 1,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
CREATE TRIGGER on_order_created_update_customer
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_on_order();

-- Add updated_at trigger for customers table
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();