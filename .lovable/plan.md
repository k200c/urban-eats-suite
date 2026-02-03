
# Add ADMIN_KEY Secret for n8n Authentication

## Overview

Add a new secret `ADMIN_KEY` with value `Kyle2000` to enable the `get-customers` Edge Function to authenticate requests from n8n workflows using the `X-Admin-Key` header.

---

## Current State

The project has 6 existing secrets configured:
- LOVABLE_API_KEY (system-managed)
- N8N_ORDER_WEBHOOK_URL
- N8N_STATUS_WEBHOOK_URL
- N8N_WEBHOOK_SECRET
- VIVA_WALLET_API_KEY
- VIVA_WALLET_MERCHANT_ID

The `ADMIN_KEY` secret does not yet exist.

---

## Implementation

### Add Secret

| Secret Name | Value |
|-------------|-------|
| ADMIN_KEY | Kyle2000 |

This secret will be used by the `get-customers` Edge Function to authenticate service-to-service calls from n8n when the `X-Admin-Key` header matches this value.

---

## Usage After Implementation

**n8n Workflow Configuration:**
```text
HTTP Request Node:
  URL: https://ftzinsesuiuqcjfpbaur.supabase.co/functions/v1/get-customers
  Method: GET
  Headers:
    X-Admin-Key: Kyle2000
```

**Example curl:**
```bash
curl -X GET \
  "https://ftzinsesuiuqcjfpbaur.supabase.co/functions/v1/get-customers?audience=customers&channel=sms" \
  -H "X-Admin-Key: Kyle2000"
```

---

## Security Note

While functional, `Kyle2000` is a relatively simple password. For production use, consider using a longer, randomly generated key (32+ characters) for better security against brute-force attacks.
