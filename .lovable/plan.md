# Fix: `payment_provider` Missing From Live KDS Terminal Webhook

## Root Cause

There are **two** files literally named `StaffCheckoutModal.tsx` plus a third payment modal — they are different components used by different flows. The previous patch updated only one of them. The live evidence payload (with `staff_id`, no `payment_provider`) was emitted by an unpatched file.


| Path                                             | Used by                                              | Patched previously?   |
| ------------------------------------------------ | ---------------------------------------------------- | --------------------- |
| `src/components/checkout/StaffCheckoutModal.tsx` | Staff POS Quick (`StaffPOSContent`, `StaffPOSQuick`) | ✅ Yes                 |
| `src/components/staff/StaffCheckoutModal.tsx`    | **KDS unpaid-order checkout** (KitchenDisplaySystem) | ❌ **No** ← live bug   |
| `src/components/staff/StaffPaymentModal.tsx`     | KDS Pickup tab payment                               | ❌ **No** ← latent bug |


The evidence payload signature (`staff_id`, `paymenttype: "terminal"`, no `email`) matches `src/components/staff/StaffCheckoutModal.tsx` `buildUnifiedPayload` (line 149-166).

## Files to Change (3, additive only)

### 1. `src/components/staff/StaffCheckoutModal.tsx`

- Add import: `import { getActivePaymentProvider } from '@/lib/paymentProvider';`
- In `handleTerminalPayment` (line 220), before building payload:
  ```ts
  const paymentProvider = await getActivePaymentProvider();
  const webhookPayload = { ...buildUnifiedPayload('card', 'terminal'), payment_provider: paymentProvider };
  ```
- In `handleCashPayment` (line 168), do the same for consistency (POSCash branch — harmless; n8n already routes by `paymenttype`):
  ```ts
  const paymentProvider = await getActivePaymentProvider();
  const webhookPayload = { ...buildUnifiedPayload('cash', 'POSCash'), payment_provider: paymentProvider };
  ```

### 2. `src/components/staff/StaffPaymentModal.tsx`

- Add same import.
- Same pattern in `handleTerminalPayment` and `handleCashPayment` — spread `buildUnifiedPayload(...)` and append `payment_provider`.

### 3. (Verification only — no code change needed)

Confirm the two already-patched files (`src/components/checkout/StaffCheckoutModal.tsx`, `src/components/checkout/CustomerCheckoutModal.tsx`) still include `payment_provider`. They do.

## What Stays Unchanged

- `buildUnifiedPayload` signature, all existing payload keys, all existing fetch logic, n8n endpoint, DB updates, cash flow behaviour, resend-link payload (not card-routed), `viva-wallet` Edge Function.

## Default Safety

`getActivePaymentProvider()` returns `'viva'` on any error or non-`mypos` value. Awaited before payload construction in every patched site.

## Verification

1. Place an unpaid customer order, then in KDS click **Charge Card** on it → inspect outgoing request to `/webhook/street-eatz-payment` → payload contains `"payment_provider":"viva"` (or `"mypos"` if toggled).
2. Toggle Command Center to MyPOS → repeat → payload contains `"payment_provider":"mypos"`.
3. Pickup tab card payment via `StaffPaymentModal` → same verification.
4. Cash flows still complete and update DB as before.
5. Customer online checkout payload still contains `payment_provider` (regression check).

## Rollback

Revert the 4 added lines (2 per file × 2 files). Zero schema/UX impact.  
  
Implement the fix exactly as diagnosed.

ROOT CAUSE

There are multiple staff payment modal components. The live KDS unpaid-order terminal checkout path uses:

- src/components/staff/StaffCheckoutModal.tsx

and that file was not patched previously, which is why the real n8n webhook payload still lacked `payment_provider`.

Also patch:

- src/components/staff/StaffPaymentModal.tsx

REQUIRED CHANGES

1. Add:

   import { getActivePaymentProvider } from '@/lib/paymentProvider';

2. In both files, inside handleTerminalPayment:

   - await getActivePaymentProvider()

   - merge payment_provider into the actual outgoing webhook payload

Pattern:

```ts

const paymentProvider = await getActivePaymentProvider();

const webhookPayload = {

  ...buildUnifiedPayload('card', 'terminal'),

  payment_provider: paymentProvider,

};