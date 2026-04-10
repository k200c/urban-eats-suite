

# Review SMS Backend — Implementation Plan

## Overview
Add database fields, a trigger, and two Edge Functions to support a delayed Google review SMS system called by n8n.

## 1. Database Migration

Single migration adding:
- 4 columns to `public.orders`: `completed_at`, `review_sms_sent`, `review_sms_sent_at`, `review_sms_sid`
- Partial composite index `idx_orders_review_pending`
- Trigger function `set_completed_at()` — sets `completed_at = NOW()` only on first transition to `completed` and only if `completed_at IS NULL`
- Trigger `trg_set_completed_at` on `public.orders` BEFORE UPDATE

Exact SQL as provided in the request — no deviations.

## 2. Edge Function: `get-pending-review-orders`

**File**: `supabase/functions/get-pending-review-orders/index.ts`

- Auth: Bearer token validated against `N8N_WEBHOOK_SECRET`
- Query: `status = 'completed'`, `review_sms_sent = false`, `completed_at <= now() - 60min`, `customer_phone` not null/empty
- Limit 100, ordered by `completed_at ASC`
- Review link from `GOOGLE_REVIEW_LINK` env var with hardcoded fallback
- Returns `{ ok, count, orders }` structure

## 3. Edge Function: `mark-review-sms-sent`

**File**: `supabase/functions/mark-review-sms-sent/index.ts`

- Auth: same Bearer token pattern
- Accepts `{ order_id, review_sms_sid?, review_sms_body? }`
- Reads current `review_sms_sent` state first
- If already `true`, returns `{ ok: true, already_marked: true }`
- Otherwise updates `review_sms_sent = true`, `review_sms_sent_at = now()`, `review_sms_sid`
- Idempotent and retry-safe

## 4. Config

Append to `supabase/config.toml`:
```toml
[functions.get-pending-review-orders]
verify_jwt = false

[functions.mark-review-sms-sent]
verify_jwt = false
```

## Files Changed

| File | Action |
|------|--------|
| Migration SQL | New — schema changes + trigger |
| `supabase/functions/get-pending-review-orders/index.ts` | New |
| `supabase/functions/mark-review-sms-sent/index.ts` | New |
| `supabase/config.toml` | Append 2 blocks |

## What Is NOT Changed
- Existing order flows, KDS, payment, frontend — untouched
- Existing edge functions — untouched
- No field removals or renames

## Idempotency Guarantees
- `get-pending-review-orders` filters on `review_sms_sent = false` — already-processed orders never returned
- `mark-review-sms-sent` checks state before updating — safe to retry
- `completed_at` trigger only fires on first transition, guards against overwrite
- Partial index ensures fast query performance

