-- Grant admin role to user kcodee20@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('e4eccd3f-dca4-4970-80a3-68f7d4f52a7f', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;