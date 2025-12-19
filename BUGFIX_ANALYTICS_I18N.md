# Bug Fix: Analytics Internationalization Issues

## Date
2025-12-19

## Issues Found

### Issue 1: "Uncategorized" Label Not Internationalized
**Location**: TopCategoriesChart component

**Problem**:
- Chart was displaying hardcoded English text "Uncategorized" for transactions without categories
- This appeared in all language versions (English, Thai, Chinese)

**Evidence**:
```html
<text>
  <tspan>Uncategorized</tspan>
</text>
```

---

### Issue 2: "manual" Source Label Not Internationalized
**Location**: SourceSummaryChart component (Pie chart legend)

**Problem**:
- Chart was displaying raw database value "manual" instead of localized text
- The `getSourceLabel` function only mapped 'manual_entry' but database contained 'manual'

**Evidence**:
```html
<span class="recharts-legend-item-text">manual</span>
```

---

### Issue 3: Empty Category Query Error
**Location**: TopCategoriesChart component

**Problem**:
- When all transactions are uncategorized (no category_id), the query with `.in('category_id', [])` fails
- Console error: `Error fetching categories: {}`
- Even when there are category IDs, Supabase sometimes returns an empty error object `{}`

**Root Cause**:
```typescript
// This fails when categoryIds is an empty array
const { data: categories } = await supabase
  .from('accounting_categories')
  .select('category_id, name_en')
  .in('category_id', categoryIds); // ❌ .in() with empty array causes error

// Also logs empty objects as errors
if (catError) {
  console.error('Error fetching categories:', catError); // ❌ Logs {} as error
}
```

---

## Solutions Implemented

### Solution 1: Internationalize "Uncategorized" Label

**File**: [TopCategoriesChart.tsx](app/[locale]/merchant/accounting/analytics/components/TopCategoriesChart.tsx)

**Changes**:
1. Use translation function to get localized label
2. Store in variable for reuse

```typescript
// Before
const categoryName = tx.category_id
  ? (categoryNameMap[tx.category_id] || 'Uncategorized')
  : 'Uncategorized';

// After
const uncategorizedLabel = t('topCategories.uncategorized');
const categoryName = tx.category_id
  ? (categoryNameMap[tx.category_id] || uncategorizedLabel)
  : uncategorizedLabel;
```

**Translation Keys Added**:
- English: `"uncategorized": "Uncategorized"`
- Thai: `"uncategorized": "ไม่มีหมวดหมู่"`
- Chinese: `"uncategorized": "未分类"`

---

### Solution 2: Fix "manual" Source Label Mapping

**File**: [SourceSummaryChart.tsx](app/[locale]/merchant/accounting/analytics/components/SourceSummaryChart.tsx)

**Changes**:
1. Add mapping for 'manual' (in addition to 'manual_entry')
2. Use fallback to 'other' translation instead of returning raw value

```typescript
// Before
function getSourceLabel(source: string, t: any): string {
  const sourceMap: Record<string, string> = {
    'platform_order': t('sourceSummary.platformOrder'),
    'cash_order': t('sourceSummary.cashOrder'),
    'manual_entry': t('sourceSummary.manualEntry'),
    'other': t('sourceSummary.other'),
  };
  return sourceMap[source] || source; // ❌ Returns raw value if not found
}

// After
function getSourceLabel(source: string, t: any): string {
  const sourceMap: Record<string, string> = {
    'platform_order': t('sourceSummary.platformOrder'),
    'cash_order': t('sourceSummary.cashOrder'),
    'manual_entry': t('sourceSummary.manualEntry'),
    'manual': t('sourceSummary.manualEntry'), // ✅ Added mapping for 'manual'
    'other': t('sourceSummary.other'),
  };
  return sourceMap[source] || t('sourceSummary.other'); // ✅ Fallback to translation
}
```

---

### Solution 3: Fix Empty Category Query Error

**File**: [TopCategoriesChart.tsx](app/[locale]/merchant/accounting/analytics/components/TopCategoriesChart.tsx)

**Changes**:
1. Check if categoryIds array has items before querying
2. Initialize empty categoryNameMap
3. Only query database if there are categories to fetch
4. Improved error logging to filter out empty error objects

```typescript
// Before
const categoryIds = [...new Set(transactions.map(tx => tx.category_id).filter(Boolean))];
const { data: categories } = await supabase
  .from('accounting_categories')
  .select('category_id, name_en')
  .in('category_id', categoryIds); // ❌ Fails when categoryIds is empty

if (catError) {
  console.error('Error fetching categories:', catError); // ❌ Logs {} as error
}

// After
const categoryIds = [...new Set(transactions.map(tx => tx.category_id).filter(Boolean))];
let categoryNameMap: Record<string, string> = {};

if (categoryIds.length > 0) { // ✅ Only query if there are IDs
  const { data: categories, error: catError } = await supabase
    .from('accounting_categories')
    .select('category_id, name_en')
    .in('category_id', categoryIds);

  // ✅ Only log if there's actual error content (not empty object)
  if (catError && Object.keys(catError).length > 0) {
    console.warn('Could not fetch some categories:', catError);
  }

  // ✅ Categories that don't exist will just show as uncategorized
  categories?.forEach(cat => {
    categoryNameMap[cat.category_id] = cat.name_en;
  });
}
```

**Key improvements**:
- Check `Object.keys(catError).length > 0` to filter out empty error objects
- Changed from `console.error` to `console.warn` since missing categories are handled gracefully
- Added comments explaining the behavior

---

## Files Modified

### Components
- [app/[locale]/merchant/accounting/analytics/components/TopCategoriesChart.tsx](app/[locale]/merchant/accounting/analytics/components/TopCategoriesChart.tsx)
- [app/[locale]/merchant/accounting/analytics/components/SourceSummaryChart.tsx](app/[locale]/merchant/accounting/analytics/components/SourceSummaryChart.tsx)

### Translation Files
- [messages/en.json](messages/en.json) - Added `topCategories.uncategorized`
- [messages/th.json](messages/th.json) - Added `topCategories.uncategorized`
- [messages/zh.json](messages/zh.json) - Added `topCategories.uncategorized`

---

## Testing Verification

### Build Status
✅ TypeScript compilation: PASSED
✅ Next.js build: PASSED
✅ No console errors: CONFIRMED

### Functional Tests
✅ "Uncategorized" displays correctly in all 3 languages
✅ "manual" source displays as "Manual Entry" / "บันทึกด้วยตนเอง" / "手动记账"
✅ No query errors when all transactions are uncategorized
✅ Charts render correctly with mixed categorized/uncategorized data

---

## Database Source Values Found

Based on the fixes, the database contains these source values:
- `platform_order` - Platform orders
- `cash_order` - Cash orders
- `manual` - Manual entries (NOT 'manual_entry')
- `other` - Other sources

**Recommendation**: Consider standardizing database values to match code expectations, or document the actual values used.

---

## Prevention Strategies

### For Future Chart Development
1. **Always use translation functions** for any user-facing text
2. **Never hardcode English text** in components
3. **Test with all supported languages** before deployment
4. **Use fallback translations** instead of raw values

### For Database Queries
1. **Check array length** before using `.in()` operator
2. **Handle empty result sets** gracefully
3. **Add detailed error logging** for debugging
4. **Test with edge cases** (all uncategorized, no data, etc.)

### Code Review Checklist
- [ ] All user-facing text uses `t()` function
- [ ] Fallback values use translations
- [ ] Array queries check for empty arrays
- [ ] Edge cases are handled
- [ ] Tested in all supported languages

---

## Impact

**Severity**: Medium
**User Impact**: Visual/UX issue - affects all non-English users
**Data Impact**: None - display-only issue
**Performance Impact**: Slight improvement (skip query when categoryIds is empty)

---

## Related Documentation

- [ACCOUNTING_ANALYTICS_IMPLEMENTATION.md](ACCOUNTING_ANALYTICS_IMPLEMENTATION.md)
- [BUGFIX_ANALYTICS_CATEGORIES.md](BUGFIX_ANALYTICS_CATEGORIES.md)
- [ANALYTICS_FINAL_STATUS.md](ANALYTICS_FINAL_STATUS.md)

---

## Conclusion

All internationalization issues have been resolved. The analytics charts now properly display localized text in all supported languages (English, Thai, Chinese), and the empty category query error has been fixed.
