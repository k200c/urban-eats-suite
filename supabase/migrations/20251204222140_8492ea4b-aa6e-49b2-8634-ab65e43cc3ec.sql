-- Create app_settings table (singleton pattern)
CREATE TABLE public.app_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_store_open boolean NOT NULL DEFAULT true,
  current_wait_time text NOT NULL DEFAULT '20 mins',
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view settings (needed for customer app)
CREATE POLICY "Anyone can view app settings"
ON public.app_settings
FOR SELECT
USING (true);

-- Staff can update settings
CREATE POLICY "Staff can update app settings"
ON public.app_settings
FOR UPDATE
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- Seed the initial row
INSERT INTO public.app_settings (id, is_store_open, current_wait_time)
VALUES (1, true, '20 mins')
ON CONFLICT (id) DO NOTHING;

-- Enable realtime for instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;