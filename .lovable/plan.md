

# Implementation Plan: Kids Menu, Numerical Allergen System, and Specials Pricing

## Overview

This plan addresses four interconnected requirements:
1. **Kids Menu** - New category with specific products and simplified "Make It Epic" options
2. **Numerical Allergen System** - Display allergen numbers (1-14) on product cards with a legend modal
3. **Specials Pricing** - Loaded fries at €3.50 instead of €6.50 for Specials category
4. **UI Consistency** - Kids Menu uses the same grid layout as other categories

---

## Part 1: Kids Menu Implementation

### 1.1 Database Changes

**Add new category enum value:**
```sql
ALTER TYPE product_category ADD VALUE 'Kids Menu';
```

**Insert Kids Menu products:**
```sql
INSERT INTO products (name, description, price, category, is_available, is_featured) VALUES
  ('Smash Burger Plain', 'Kids plain smash burger - 100% Irish beef', 5.50, 'Kids Menu', true, false),
  ('Cheeseburger', 'Kids cheeseburger with American cheese', 6.00, 'Kids Menu', true, false),
  ('Chicken Goujons & Chips', 'Golden chicken goujons served with chips', 6.50, 'Kids Menu', true, false);
```

### 1.2 Type Updates

**File: `src/types/database.ts`**
- Add `'Kids Menu'` to the `ProductCategory` type union

### 1.3 UI Updates

**File: `src/components/customer/MenuSection.tsx`**
- Add `'Kids Menu'` to the categories array

**File: `src/components/staff/StaffPOSContent.tsx`**
- Add `'Kids Menu'` to the staff POS categories array

**File: `src/components/staff/OperationsContent.tsx`**
- Add `'Kids Menu'` to the allCategories array

**File: `src/components/customer/ProductSheet.tsx`**
- Add category-specific logic for Kids Menu:
  - Replace standard "Make It Epic" add-ons with only two options:
    - "Add Chips" (€2.00)
    - "Capri Sun" (€1.50)
  - Hide loaded fries, drinks, and sauces dropdowns for Kids Menu

**File: `src/components/customer/ProductCardHorizontal.tsx`**
- Add fallback image mapping for Kids Menu category

---

## Part 2: Numerical Allergen System

### 2.1 Database Schema

**New table: `product_allergens`**
```sql
CREATE TABLE product_allergens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  allergen_numbers INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE product_allergens ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read access" ON product_allergens
  FOR SELECT USING (true);

-- Admin/Staff write access  
CREATE POLICY "Allow staff to manage allergens" ON product_allergens
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'staff'))
  );
```

**Seed allergen data based on the provided chart:**
```sql
-- Example entries from the Food Allergen Chart
INSERT INTO product_allergens (product_id, allergen_numbers) VALUES
  ((SELECT id FROM products WHERE name = 'The Urban Legend'), ARRAY[1, 3, 7, 10, 12]),
  ((SELECT id FROM products WHERE name = 'Street Heat'), ARRAY[1, 3, 7, 10, 12]),
  -- ... (additional entries for all menu items)
```

### 2.2 Allergen Key Reference

Based on the uploaded chart, the numerical allergen key is:

| # | Allergen |
|---|----------|
| 1 | Gluten |
| 2 | Crustaceans |
| 3 | Eggs |
| 4 | Fish |
| 5 | Peanuts |
| 6 | Soy |
| 7 | Milk |
| 8 | Nuts |
| 9 | Celery |
| 10 | Mustard |
| 11 | Sesame |
| 12 | Sulphites/Sulphur |
| 13 | Lupins |
| 14 | Molluscs |

### 2.3 New Hook

**File: `src/hooks/useProductAllergens.ts`**
```typescript
// Fetch allergen numbers for a product
export function useProductAllergens(productId: string | null)

// Fetch allergens for multiple products (for list views)
export function useAllProductAllergens()
```

### 2.4 UI Components

**New Component: `src/components/customer/AllergenBadges.tsx`**
- Display small numbered badges (e.g., "1", "3", "7") in a row
- Styling: Small, circular badges with primary/muted colors
- Compact design to fit on product cards

**New Component: `src/components/ui/allergen-modal.tsx`**
- Modal/dialog showing the full allergen key legend
- Triggered by "Allergen Key" link in footer or product sheet

**Update: `src/components/customer/ProductCardHorizontal.tsx`**
- Add `AllergenBadges` below product name/description
- Small, elegant display of numbered allergens

**Update: `src/components/customer/ProductSheet.tsx`**
- Display allergen badges in the product detail view
- Add tooltip or "View Allergen Key" button

**Update: `src/components/layout/SiteFooter.tsx`**
- Add "Allergen Information" link that opens the allergen modal

---

## Part 3: Specials Pricing Logic

### 3.1 Pricing Constant Update

**File: `src/components/customer/ProductSheet.tsx`**

Add category-aware pricing for loaded fries:

```typescript
// Current fixed price for small loaded fries
const LOADED_FRIES_SMALL_PRICE = 6.50;

// New: Specials category gets discounted upgrade (already includes chips)
const LOADED_FRIES_UPGRADE_PRICE = 3.50;

// Determine price based on category
const getLoadedFriesPrice = (category: ProductCategory) => {
  return category === 'Specials' ? LOADED_FRIES_UPGRADE_PRICE : LOADED_FRIES_SMALL_PRICE;
};
```

### 3.2 UI Updates

**File: `src/components/customer/ProductSheet.tsx`**
- Update the loaded fries dropdown label for Specials:
  - Standard: "Add Small Loaded Fries (+€6.50)"
  - Specials: "Upgrade to Loaded Fries (+€3.50)"
- Update price calculation to use category-aware pricing
- Update buildAllModifiers() to apply the correct price

---

## Part 4: UI Consistency

### 4.1 Kids Menu Display

**File: `src/components/customer/ProductCardHorizontal.tsx`**
- Add `'Kids Menu'` to categoryImages with an appropriate fallback image

**File: `src/components/customer/ProductSheet.tsx`**
- Add `'Kids Menu'` to categoryImages mapping

---

## Summary of File Changes

| File | Changes |
|------|---------|
| **Database** | Add `Kids Menu` to product_category enum; Create `product_allergens` table; Insert 3 kids products; Seed allergen data |
| `src/types/database.ts` | Add `'Kids Menu'` to ProductCategory type |
| `src/hooks/useProductAllergens.ts` | New hook for fetching allergen data |
| `src/components/customer/AllergenBadges.tsx` | New component for displaying allergen numbers |
| `src/components/ui/allergen-modal.tsx` | New modal component showing allergen key legend |
| `src/components/customer/ProductCardHorizontal.tsx` | Add allergen badges, Kids Menu category image |
| `src/components/customer/ProductSheet.tsx` | Kids Menu add-ons logic, Specials pricing, allergen display |
| `src/components/customer/MenuSection.tsx` | Add Kids Menu to categories array |
| `src/components/staff/StaffPOSContent.tsx` | Add Kids Menu to POS categories |
| `src/components/staff/OperationsContent.tsx` | Add Kids Menu to stock manager categories |
| `src/components/layout/SiteFooter.tsx` | Add Allergen Information link |
| `src/lib/pricingRules.ts` | Add Specials upgrade pricing constant |

---

## Technical Diagram: Allergen Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCT CARD                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  The Urban Legend                           €10.50    │  │
│  │  Beef burger with bacon, cheese...                    │  │
│  │                                                       │  │
│  │  [1] [3] [7] [10] [12]  ← AllergenBadges             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   ALLERGEN MODAL                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ALLERGEN KEY                                         │  │
│  │  ─────────────────────────────────────────────────── │  │
│  │   1  Gluten           8  Nuts                        │  │
│  │   2  Crustaceans      9  Celery                      │  │
│  │   3  Eggs            10  Mustard                     │  │
│  │   4  Fish            11  Sesame                      │  │
│  │   5  Peanuts         12  Sulphites                   │  │
│  │   6  Soy             13  Lupins                      │  │
│  │   7  Milk            14  Molluscs                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Kids Menu "Make It Epic" Logic

```text
┌─────────────────────────────────────────────────────────────┐
│  PRODUCT SHEET - KIDS MENU ITEM                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  🔥 Make it Epic                                      │  │
│  │  ─────────────────────────────────────────────────── │  │
│  │  ☐ Add Chips ..............................  +€2.00 │  │
│  │  ☐ Capri Sun ...............................  +€1.50 │  │
│  │                                                       │  │
│  │  (No loaded fries/drinks/sauces dropdowns)           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Specials Pricing Logic

```text
Category Check:
├── Specials → Loaded Fries = €3.50 (upgrade from included chips)
├── Burgers → Loaded Fries = €6.50 (full small portion)
├── Flatbreads → Loaded Fries = €6.50 (full small portion)
└── Kids Menu → No loaded fries option (only Add Chips €2.00)
```

---

## Implementation Order

1. **Database Migration**: Add Kids Menu enum value, create product_allergens table
2. **Type Updates**: Update ProductCategory in database.ts
3. **Data Seeding**: Insert Kids Menu products, seed allergen data for existing products
4. **Hooks**: Create useProductAllergens hook
5. **Components**: Create AllergenBadges and AllergenModal components
6. **UI Updates**: Update ProductSheet, ProductCardHorizontal, MenuSection, StaffPOSContent, OperationsContent, SiteFooter
7. **Testing**: Verify Kids Menu displays correctly, allergens show on cards, Specials pricing works

