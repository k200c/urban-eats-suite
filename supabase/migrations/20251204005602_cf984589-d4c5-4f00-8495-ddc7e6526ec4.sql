-- Create a trigger to automatically assign staff role to specific email on signup
CREATE OR REPLACE FUNCTION public.assign_staff_role_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign staff role to specific email
  IF NEW.email = 'streeteatzwaterford@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'staff')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_assign_staff ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_staff
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_staff_role_on_signup();