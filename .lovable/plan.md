

# Fix: Stock Manager 409 Conflict Error

## Root Cause

The `products` table has a **`UNIQUE (name)` constraint** (`products_name_unique`). When staff attempt to add a product with a name that already exists, PostgREST returns a `409 Conflict`. The current error handling shows a generic "Failed to add product" instead of surfacing the actual duplicate name issue.

## Changes

### 1. `src/components/staff/AddProductDialog.tsx` — Better error handling + duplicate check

**Before insert**, query the DB to check if a product with the same name already exists. If it does, show a clear toast ("A product named X already exists") and abort.

Also improve the `catch` block to surface Supabase error details (code, message, hint, details) in both console and toast.

```typescript
// In onSubmit, before the insert:
const trimmedName = values.name.trim();

// Check for duplicate name
const { data: existing } = await supabase
  .from('products')
  .select('id, name')
  .ilike('name', trimmedName)
  .maybeSingle();

if (existing) {
  toast.error(`A product named "${existing.name}" already exists.`);
  setIsSubmitting(false);
  return;
}

// Then proceed with insert...
```

And in the catch block:
```typescript
catch (error: any) {
  console.error('Failed to add product:', {
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
  });
  
  if (error?.code === '23505') {
    toast.error(`A product with this name already exists.`);
  } else {
    toast.error(error?.message || 'Failed to add product. Please try again.');
  }
}
```

### 2. `src/components/staff/EditProductDialog.tsx` — Same error handling improvement

Add the same structured error logging in the catch block, and check for `23505` (unique violation) when updating a product name to one that already exists.

### 3. `src/components/staff/OperationsContent.tsx` — No changes needed

The operations content uses direct `update` calls for `is_sold_out` and `is_available` toggles, which don't touch the `name` field and can't trigger the unique constraint. These are fine as-is.

---

## Summary of Changes

| # | File | Change |
|---|------|--------|
| 1 | `src/components/staff/AddProductDialog.tsx` | Add pre-insert duplicate name check via `ilike` query; improve error handling to surface Supabase error code/message/details/hint; show human-readable toast for duplicate names (code `23505`) |
| 2 | `src/components/staff/EditProductDialog.tsx` | Add structured error logging with code/message/details/hint; handle `23505` unique violation on name update |

No database migrations needed. No RLS changes needed (staff already has INSERT + UPDATE on products). The `products_name_unique` constraint is correct and should stay — it prevents data integrity issues. The fix is purely in the application layer: check before insert and surface clear errors.

---

## Verification Checklist

| # | Test | Expected |
|---|------|----------|
| 1 | Add a new product with a unique name | Inserts successfully, toast shows success |
| 2 | Add a product with the same name as an existing one | Blocked before insert, toast shows "A product named X already exists" |
| 3 | Add a product with same name different casing (e.g., "handcut chips" vs "Handcut Chips") | Caught by `ilike` check, blocked with clear message |
| 4 | Edit a product and change its name to an existing product's name | `23505` caught, toast shows duplicate message |
| 5 | Edit a product without changing the name | Updates normally, no conflict |
| 6 | Toggle sold out / visibility in Quick Stock | Works as before, no regression |
| 7 | Console shows full error object (code, message, details, hint) on any failure | Structured logging present |

