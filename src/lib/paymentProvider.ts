import { supabase } from '@/integrations/supabase/client';

export type PaymentProvider = 'viva' | 'mypos';

/**
 * Fetch the active card payment provider from app_settings.
 * Always defaults to 'viva' on any error or unexpected value to preserve
 * the live payment flow.
 */
export async function getActivePaymentProvider(): Promise<PaymentProvider> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('card_payment_provider')
      .eq('id', 1)
      .maybeSingle();
    const v = (data as { card_payment_provider?: string } | null)?.card_payment_provider;
    return v === 'mypos' ? 'mypos' : 'viva';
  } catch {
    return 'viva';
  }
}