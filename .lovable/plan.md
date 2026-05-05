# Data Layer Fix — Bypass Supabase Auth Lock for Public Reads

## Root cause
`supabase.from().select()` internally awaits `getSession()`, which takes a `navigator.locks` mutex. When an expired token triggers a background refresh, that lock is held while the network call runs, so every other REST query (products, app_settings, etc.) queues in JS and never hits the network. Realtime works because it doesn't go through the same lock path.

## Fix
Introduce a second Supabase client (`publicSupabase`) configured with `autoRefreshToken: false` and `persistSession: false`. On that client `getSession()` returns `null` synchronously without touching the lock, so anon-keyed REST requests dispatch immediately. Use it only for queries already permitted by anon RLS (products + app_settings reads). Everything else — admin queries, mutations, realtime, auth — stays on the existing `supabase` client.

## Files to replace

### 1. `src/integrations/supabase/client.ts`
- Keep existing `supabase` client untouched (storage: localStorage, persistSession: true, autoRefreshToken: true).
- Add and export a new `publicSupabase` created from the same URL + publishable key with:
  ```ts
  auth: { autoRefreshToken: false, persistSession: false, storage: undefined }
  ```
- Both clients typed with `Database`.

### 2. `src/hooks/useProducts.ts`
- Import `publicSupabase` alongside `supabase`.
- `useProducts` queryFn → `publicSupabase.from('products').select(...)`.
- `useFeaturedProducts` queryFn → `publicSupabase`.
- `useAllProducts` (staff/admin) → keep on `supabase` (needs auth context for admin views).
- `useValidateCartItems` → keep on `supabase`.
- All realtime channel subscriptions (`products-realtime`, `all-products-realtime`) → keep on `supabase`.
- No other behavioural change (staleTime, retries, placeholderData, query keys all unchanged).

### 3. `src/hooks/useAppSettings.ts`
- Import `publicSupabase`.
- `useAppSettings` read queryFn → `publicSupabase.from('app_settings').select('*').eq('id',1).maybeSingle()`.
- `useUpdateAppSettings` mutation → keep on `supabase` (RLS requires staff/admin).
- Realtime channel `app-settings-changes` → keep on `supabase`.
- Hook signature, return shape, query key, invalidation logic all unchanged.

## Explicitly NOT touched
- `src/contexts/AuthContext.tsx` (INITIAL_SESSION fix retained)
- `src/App.tsx` (gcTime: 5min retained)
- `src/components/auth/AuthGuard.tsx`
- Any payment / checkout / cart / order / KDS / receipt / n8n / Viva / myPOS code
- RLS policies, edge functions, schema, secrets
- PWA kill-switch files

## Why this is safe
- `products` and `app_settings` already have `SELECT … USING (true)` RLS, so the anon key reads the same rows the authenticated client would for these queries.
- Mutations and admin-only reads still flow through the authenticated client, preserving RLS enforcement.
- Realtime stays on the authenticated client, so subscriptions and presence behave identically.
- No schema / RLS / edge function changes → trivial rollback by reverting the three files.

## Verification
- Network tab: REST calls to `/rest/v1/products` and `/rest/v1/app_settings` fire immediately on `/menu` even mid token-refresh.
- Logged-out `/menu` still loads (already did; should not regress).
- Logged-in refresh on `/menu`, `/`, `/cart`, `/profile`: no skeleton hang, no auth timeout.
- Staff stock manager still sees hidden products (uses authenticated client).
- Updating store-open / wait-time from staff UI still works and broadcasts via realtime.
