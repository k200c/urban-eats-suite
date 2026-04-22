ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS card_payment_provider text NOT NULL DEFAULT 'viva';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'card_payment_provider_check'
  ) THEN
    ALTER TABLE public.app_settings
      ADD CONSTRAINT card_payment_provider_check
      CHECK (card_payment_provider IN ('viva','mypos'));
  END IF;
END $$;