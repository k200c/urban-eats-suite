# Disable PWA / Service Worker — Production Incident Fix

## Root Cause
The Workbox service worker (registered with `skipWaiting` + `clientsClaim` and `NetworkOnly` handlers for all `*.supabase.co/{rest,auth,functions}` URLs) is intercepting Supabase auth/REST calls during boot. Result: `getSession()` never resolves, profile/menu/orders queries hang, `[Auth] Safety timeout` fires after 15s, users appear logged out, skeletons never resolve. Old SWs from prior deploys persist on installed devices.

## Fix Strategy
Remove the PWA layer entirely from the customer app. Ship a kill-switch `/sw.js` so already-installed clients self-unregister and clear caches on next visit. No changes to auth, payments, checkout, KDS, Supabase client, or any business logic.

## Exact Changes

### 1. `vite.config.ts` — replace entire file
Remove `vite-plugin-pwa` import and the `VitePWA({...})` plugin block. Keep React, componentTagger, alias, server, and `__APP_VERSION__` define.

### 2. `src/main.tsx` — replace entire file
- Drop `registerSW()` call.
- On boot, unregister any existing service workers and delete all Cache Storage entries (one-shot cleanup, no reload, no loop).
- Keep `APP_VERSION` console log and `createRoot(...).render(<App />)`.

### 3. `src/lib/pwa.ts` — replace entire file
Reduce to a no-op module that still exports `APP_VERSION`, `registerSW`, `checkForUpdates`, `applyUpdate`, `onNeedRefresh`, `getRegistration` so existing imports (e.g. `UpdateToast.tsx`) keep compiling but do nothing.

### 4. `public/sw.js` — new file (kill-switch)
Static SW that on activate: claims clients, deletes all caches, unregisters itself. `fetch` handler is a no-op (pass-through). This overrides whatever Workbox SW devices have cached at `/sw.js`.

### 5. `package.json` — remove `vite-plugin-pwa` dependency line
Only that one line. No other dependency changes.

## Files NOT Touched
`AuthContext.tsx`, `AuthGuard.tsx`, `supabase/client.ts`, `resetApp.ts`, `UpdateToast.tsx`, all payment/checkout/order/cart/KDS/receipt/n8n code, `public/offline.html`, `index.html`, DB schema, edge functions, RLS.

## Blast Radius
- Customer app reverts to standard SPA behavior; menu, login, profile, admin, cart, checkout, Viva flow all start working again because nothing intercepts their requests.
- Installed PWA clients: on next open, kill-switch SW activates, wipes caches, unregisters. Subsequent loads are clean.
- "Add to Home Screen" shortcuts still launch the site as a normal web page (no offline mode, no install prompt).

## Verification (post-deploy)
1. Hard refresh `/menu` while logged in → items render, no permanent skeleton.
2. Refresh `/profile` → session persists, orders or empty state render.
3. `/auth` login completes quickly, no 30s hang.
4. `/admin` and KDS load for admin user.
5. Cart add/remove + checkout opens; Viva start redirects.
6. DevTools → Application → Service Workers shows kill-switch briefly then unregistered; Cache Storage empty.
7. No `[Auth] Safety timeout`, no false offline screen, no reload loop.

## Rollback
Revert the four code files and restore the `vite-plugin-pwa` line in `package.json`. No backend state to revert.

## Remaining Risk
Devices that never reopen the app keep the old broken SW until they do — inherent SW limitation, handled on next visit by the kill-switch.
