-- Allow staff/admin to delete products
CREATE POLICY "Staff can delete products"
ON public.products
FOR DELETE
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));