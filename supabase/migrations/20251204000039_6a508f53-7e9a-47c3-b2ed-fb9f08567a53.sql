-- Create a security definer function to check user role without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Drop the recursive staff policy
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;

-- Recreate the staff policy using the security definer function
CREATE POLICY "Staff can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = id 
  OR public.get_user_role(auth.uid()) IN ('staff', 'admin')
);