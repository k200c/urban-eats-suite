# Audit: myPOS Online (Hosted Form-Post) Frontend Support

## 1. Executive Summary

- **Real frontend payment path (online card):** `CustomerCheckoutModal.handlePayCard` → `submitOrder()` (DB insert) → `fetch('https://kyle2000.app.n8n.cloud/webhook/street-eatz-payment', POST JSON)` → expects `{ success: true, paymentUrl }` → `window.location.href = paymentUrl`.
- **Most likely missing piece for myPOS:** no branch in the frontend for a `paymentMode: "form-post"` response shape. The current handler only knows how to redirect via `window.location.href` to a `paymentUrl`. There is **no dynamic HTML form builder/submitter** anywhere in the codebase (confirmed: zero matches for `document.createElement('form')`, `form.submit()`, `action_url`, `paymentMode`, `form-post`).
- **Risk to Viva:** zero, if the change is purely additive — branch on `data.paymentMode === 'form-post'` BEFORE the existing `paymentUrl` redirect. Viva's response shape (`{ success, paymentUrl }`) is untouched.

## 2. Files Identified


| File                                                                                   | Role                                                                                                                           | Customer/Staff/Shared     |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| `src/components/checkout/CustomerCheckoutModal.tsx`                                    | **Renders the card-payment button**, runs `handlePayCard`, calls n8n webhook, parses response, redirects                       | Customer (online)         |
| `src/hooks/useCheckout.ts`                                                             | `submitOrder()` — direct DB insert of order + items before payment call                                                        | Shared (customer + staff) |
| `src/lib/paymentProvider.ts`                                                           | Resolves active provider from `app_settings`, defaults `'viva'`                                                                | Shared                    |
| `src/components/checkout/StaffCheckoutModal.tsx`                                       | Staff POS Quick — already includes `payment_provider`, but does NOT initiate a hosted-checkout redirect (cash + terminal only) | Staff (in-store)          |
| `src/components/staff/StaffCheckoutModal.tsx`                                          | KDS unpaid-order checkout — terminal/cash only, no hosted redirect                                                             | Staff (KDS)               |
| `src/components/staff/StaffPaymentModal.tsx`                                           | KDS Pickup tab payment — terminal/cash only                                                                                    | Staff                     |
| `supabase/functions/viva-wallet/index.ts`                                              | Legacy Edge Function path (not used by live customer flow today; customer bypasses it)                                         | Backend                   |
| `src/pages/Processing.tsx`, `src/pages/OrderSuccess.tsx`, `src/pages/PaymentError.tsx` | Read `viva_order_code` (URL param `s`) on return                                                                               | Customer return URLs      |


**Only the customer online card flow needs frontend changes for myPOS hosted checkout.** Staff terminal flows do not perform browser redirects — they only POST to n8n which talks to physical terminals.

## 3. Payment Flow Map (current Viva, online card)

```text
[Pay with Card button] (CustomerCheckoutModal line 561-565)
        │
        ▼
handlePayCard()  (line 124)
        │  validates name/phone/email/total
        │  setStep('connecting')
        ▼
submitOrder({ paymentMethod:'card', ... })  → useCheckout
        │  inserts orders + order_items rows (special_notes persisted)
        ▼
500ms wait + verify order row visible
        │
        ▼
build payload  (line 231-247)
  { order_id, display_id, total_amount, user_id, payment_method:'card',
    paymenttype:'online', payment_status:'pending',
    customer_*, items, timestamp, order_source:'web',
    special_notes, payment_provider }
        │
        ▼
fetch POST  https://kyle2000.app.n8n.cloud/webhook/street-eatz-payment
  (15s AbortController timeout)
        │
        ▼
parse JSON  →  expects { success:true, paymentUrl, orderCode?, viva_order_code? }
        │
        ▼
window.location.href = paymentUrl   ← single redirect path, no branching
```

**On return:** Viva redirects browser to `/processing?s=<orderCode>` → `Processing.tsx` polls `orders` by `viva_order_code` → routes to `/order-success` or `/payment-error`.

## 4. Response Contract Audit

**What frontend currently expects (Viva, working):**

```ts
{
  success: true,
  paymentUrl: string,     // OR `url` (fallback at line 306)
  orderCode?: string,     // logged only
  viva_order_code?: string // logged only
}
```

Code: `data.paymentUrl || data.url` then `window.location.href = paymentUrl`.

**myPOS hosted-checkout shape (per your spec):**

```ts
{
  success: true,
  provider: "mypos",
  paymentMode: "form-post",
  action_url: string,        // myPOS hosted checkout endpoint
  fields: Record<string,string>,  // hidden form fields incl. signature
  orderCode: string
}
```

**What happens TODAY if n8n returns the myPOS shape:**

- `data.success === true` ✅ passes the success check (line 302)
- `data.paymentUrl || data.url` → **both undefined** → falls into `if (!paymentUrl)` block (line 308)
- Throws `'No payment URL received'` → toast error → user stranded on payment step
- Order row exists in DB (`payment_status: 'pending'`), but no redirect happens

**Result: silent-fail for the customer; n8n side believes it dispatched correctly.**

## 5. Gap Analysis


| Capability                                                                       | Status                                                                                                                                                |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payment_provider` sent in payload                                               | ✅ correct (line 246)                                                                                                                                  |
| Frontend branches on `provider` / `paymentMode`                                  | ❌ missing                                                                                                                                             |
| Handles `paymentUrl` redirect (Viva GET)                                         | ✅ correct                                                                                                                                             |
| Handles `action_url` + `fields` (myPOS POST)                                     | ❌ missing                                                                                                                                             |
| Dynamic form-post helper utility                                                 | ❌ missing (no createElement('form') anywhere)                                                                                                         |
| Persists `orderCode` to `viva_order_code` (or equivalent) for return-flow lookup | ⚠️ partial — n8n does this server-side for Viva via Edge Function update; for myPOS this needs to be confirmed (likely done by n8n before responding) |
| Return-page logic (`/processing?s=...`) provider-agnostic                        | ⚠️ partial — looks up by `viva_order_code` column. If myPOS uses the same column it works; otherwise risky                                            |
| Staff terminal flows                                                             | ✅ correct (no hosted redirect needed)                                                                                                                 |


## 6. Smallest Safe Implementation Plan (no code yet)

Single surgical change in `src/components/checkout/CustomerCheckoutModal.tsx`, additive only:

1. After parsing `data` (line 298), **before** the existing `paymentUrl` block, add a branch:
  ```ts
   if (data.paymentMode === 'form-post' && data.action_url && data.fields) {
     postFormToUrl(data.action_url, data.fields);  // new helper, then return
     return;
   }
  ```
2. Create one tiny helper file `src/lib/postFormToUrl.ts` (~15 lines) that:
  - Creates a hidden `<form method="POST" action={action_url}>`
  - Appends one hidden `<input>` per `fields` entry
  - Appends to `document.body` and calls `form.submit()`
3. Leave the existing `data.paymentUrl || data.url` Viva path **completely unchanged** below the new branch.

**No changes to:** Viva flow, payload, `submitOrder`, staff modals, Edge Functions, return pages (assuming n8n stores myPOS reference into the same `viva_order_code` column — to confirm with n8n side; if not, a separate audit is needed for the return URL handler).

**Default safety:** if `paymentMode` is anything other than `'form-post'`, code falls through to today's Viva behaviour. If `provider` is `'mypos'` but n8n forgets to set `paymentMode`, behaviour is identical to today (error: no payment URL) — no worse than current.

## 7. Exact Files That Would Need Changes


| File                                                | Change                                                                  | Lines added (est.) |
| --------------------------------------------------- | ----------------------------------------------------------------------- | ------------------ |
| `src/components/checkout/CustomerCheckoutModal.tsx` | Add 4-line branch after `const data = await response.json()` (line 298) | ~5                 |
| `src/lib/postFormToUrl.ts`                          | **New** helper — dynamic hidden form POST                               | ~20                |


**Open questions before implementation (worth confirming with the n8n owner):**

- Does the myPOS branch in n8n write its order reference into `orders.viva_order_code` (so `Processing.tsx` lookup works) or a different column?
- Where does myPOS redirect the browser back to after hosted checkout (`/processing?s=...` or different URL)? If different, `Processing.tsx` may also need a tiny additive lookup branch.

These two answers determine whether the implementation is truly 2 files or also touches `Processing.tsx`.  
  
You are a senior frontend payments engineer working in a LIVE Street Eatz production app.

This is a surgical, additive fix.
Do NOT refactor.
Do NOT redesign checkout.
Do NOT break the current live Viva payment flow.

================================================================================
OBJECTIVE
================================================================================

Implement frontend support for myPOS hosted checkout in the customer online card-payment flow.

Current reality:
- Viva works today
- The frontend already sends `payment_provider`
- The backend/n8n already returns a structured myPOS hosted-checkout response
- The missing piece is frontend handling of `paymentMode: "form-post"`

The real current online payment path has already been audited.

Current live customer flow:
- `CustomerCheckoutModal.handlePayCard`
- `submitOrder()`
- POST to `https://kyle2000.app.n8n.cloud/webhook/street-eatz-payment`
- parse JSON response
- expect `paymentUrl`
- redirect with `window.location.href = paymentUrl`

Current problem:
If backend returns this myPOS shape:

```ts
{
  success: true,
  provider: "mypos",
  paymentMode: "form-post",
  action_url: string,
  fields: Record<string, string>,
  orderCode: string
}

the frontend fails because it only knows how to read `paymentUrl` and redirect by URL.

# ================================================================================  
  
NON-NEGOTIABLES

-   
Do NOT break Viva  

-   
Do NOT change the existing Viva redirect logic except to place the new myPOS branch above it  

-   
Do NOT touch staff terminal flows  

-   
Do NOT refactor `submitOrder`  

-   
Do NOT redesign the UI  

-   
Prefer the smallest additive change possible  


# ================================================================================  
  
IMPLEMENTATION PLAN

1.   
Create a new helper file:  
  
`src/lib/postFormToUrl.ts`  

2.   
In that helper, implement a production-safe function that:  

  -   
  accepts `actionUrl: string`  

  -   
  accepts `fields: Record<string, string>`  

  -   
  creates a hidden `<form method="POST">`  

  -   
  sets `form.action = actionUrl`  

  -   
  appends one hidden `<input>` per field entry  

  -   
  appends the form to `document.body`  

  -   
  submits the form  

3.   
Update:  
  
`src/components/checkout/CustomerCheckoutModal.tsx`  

4. In `handlePayCard`, immediately after:
  ```
  const data = await response.json();
  ```
  add a new additive branch BEFORE the current `paymentUrl` logic:
  ```
  if (
    data?.success &&
    data?.paymentMode === 'form-post' &&
    data?.action_url &&
    data?.fields
  ) {
    postFormToUrl(data.action_url, data.fields);
    return;
  }
  ```
5. Leave the existing Viva logic intact below that branch:
  ```
  const paymentUrl = data.paymentUrl || data.url;
  ...
  window.location.href = paymentUrl;
  ```

# ================================================================================  
  
REQUIRED QUALITY

The helper must:

-   
validate that `actionUrl` is a non-empty string  

-   
validate that `fields` is an object  

-   
stringify values safely  

-   
avoid throwing cryptic DOM errors where possible  

-   
be simple, clean, and production-safe  


The CustomerCheckoutModal change must:

-   
be minimal  

-   
preserve all current loading/error behavior  

-   
preserve existing Viva flow exactly  


# ================================================================================  
  
DELIVERABLES

Return:

1.   
Exact files changed  

2.   
Full code for `src/lib/postFormToUrl.ts`  

3.   
Exact before/after snippet for `CustomerCheckoutModal.tsx`  

4.   
Confirmation that Viva flow is unchanged  

5.   
Manual test plan for:  

  -   
  Viva response with `paymentUrl`  

  -   
  myPOS response with `paymentMode: "form-post"`  

  -   
  malformed myPOS response  

  -   
  user cancellation path  


# ================================================================================  
  
IMPORTANT FINAL CHECK

Before finishing, confirm whether any current return-page code depends on `viva_order_code` and whether this implementation requires changes to `Processing.tsx`.

If no change is required there, say so explicitly.  
  
If a change might be required, explain exactly why, but do NOT make speculative edits unless you find clear code evidence.