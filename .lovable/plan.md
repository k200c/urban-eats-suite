# Duplicate Payment Callback Protection — Edge Function

## What this solves

Viva Wallet retries payment callbacks ~1 hour after initial success. Without idempotency protection, these retries trigger duplicate order ingestion and duplicate receipt printing. This new edge function acts as a gate that n8n calls before processing any payment callback.

## Implementation

### New file: `supabase/functions/check-payment-ingestion-lock/index.ts`

A single edge function that:

1. Validates `Authorization: Bearer <N8N_WEBHOOK_SECRET>` (same pattern as `confirm-payment`)
2. Validates `transaction_id` is present in the POST body
3. Attempts `INSERT` into existing `payment_ingestion_locks` table
4. On success → returns `{ success: true, duplicate: false }`
5. On unique constraint violation (Postgres 23505) → updates `retry_count` and `updated_at`, returns `{ success: true, duplicate: true }`
6. n8n checks the `duplicate` field and stops processing if `true`

### Config update: `supabase/config.toml`

Add `[functions.check-payment-ingestion-lock]` with `verify_jwt = false` (auth is handled via shared secret in code).

### No other changes

- No new tables
- No schema changes
- No modifications to existing functions
- Uses existing `N8N_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` secrets

## n8n integration

n8n adds this as the first step in the payment callback workflow:

```
POST /functions/v1/check-payment-ingestion-lock
Authorization: Bearer <N8N_WEBHOOK_SECRET>
Body: { "provider": "viva", "transaction_id": "...", "order_code": "...", "order_id": "...", "branch": "online" }
```

If response contains `"duplicate": true`, n8n skips all downstream processing.  
  
1. Make sure the function handles `OPTIONS`

This is minor, but it should include CORS preflight properly, same as your other functions.

### 2. Make sure duplicate handling does **not** fail the request

On duplicate:

- return `200`
- return JSON with `success: true`
- `duplicate: true`

That part is essential. We want “duplicate suppressed,” not “error thrown.”

### 3. Make sure it trims and validates values

At minimum:

- `provider`
- `transaction_id`

No blank strings slipping through.

### 4. Keep `verify_jwt = false`

Yes, that is correct here, since you are doing your own shared-secret auth inside the function.