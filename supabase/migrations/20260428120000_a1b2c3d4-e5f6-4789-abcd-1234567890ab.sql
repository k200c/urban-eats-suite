-- Customer Message Contexts: durable conversation context for SMS reply flows (Google review ratings, etc.)
CREATE TABLE IF NOT EXISTS public.customer_message_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL,
  context_type text NOT NULL,
  context_id text NOT NULL,
  order_id uuid NULL,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  completed_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_message_context_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('active','completed','expired','cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_message_context_status ON public.customer_message_contexts;
CREATE TRIGGER trg_validate_message_context_status
  BEFORE INSERT OR UPDATE ON public.customer_message_contexts
  FOR EACH ROW EXECUTE FUNCTION public.validate_message_context_status();

CREATE INDEX IF NOT EXISTS idx_cmc_phone_type_status_expires
  ON public.customer_message_contexts (phone_e164, context_type, status, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_cmc_order_id
  ON public.customer_message_contexts (order_id);

ALTER TABLE public.customer_message_contexts ENABLE ROW LEVEL SECURITY;

-- Google Review Ratings
CREATE TABLE IF NOT EXISTS public.google_review_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  context_id uuid NULL,
  phone_e164 text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  raw_body text NULL,
  twilio_message_sid text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_grr_order_id
  ON public.google_review_ratings (order_id);

CREATE INDEX IF NOT EXISTS idx_grr_phone
  ON public.google_review_ratings (phone_e164);

ALTER TABLE public.google_review_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view review ratings"
  ON public.google_review_ratings
  FOR SELECT
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
