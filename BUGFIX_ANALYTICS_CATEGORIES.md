# Bug Fix: Analytics Page Multiple Crashes

## Issues

### Issue 1: TopCategoriesChart - Category Join Error
Browser crash when loading the analytics page, with console error:
```
Error fetching category data: {}
at TopCategoriesChart.useEffect.fetchCategoryData
```

### Issue 2: SourceSummaryChart - Label Rendering Error
Runtime TypeError when rendering pie chart:
```
TypeError: entry.payload.reduce is not a function
at renderCustomizedLabel (SourceSummaryChart.tsx:140:49)
```

## Root Causes

### Issue 1 Root Cause: TopCategoriesChart
The original implementation used a Supabase join query with `accounting_categories!inner(name_en)` which was causing issues:

1. **Join syntax issue**: The `!inner` join syntax was not working correctly with the Supabase client
2. **Type mismatch**: The returned data structure didn't match expectations
3. **Error handling**: The join query was throwing an empty error object `{}`

Original problematic code (TopCategoriesChart):
```typescript
const { data: transactions, error } = await supabase
  .from('account_transactions')
  .select(`
    amount,
    category_id,
    accounting_categories!inner(name_en)  // ❌ Problematic join
  `)
  .eq('merchant_id', merchantId)
  .eq('type', type)
  .gte('transaction_date', startDate)
  .lte('transaction_date', endDate)
  .is('deleted_at', null);
```

### Issue 2 Root Cause: SourceSummaryChart
The custom label renderer for the pie chart was incorrectly trying to access `entry.payload.reduce()`:

1. **Incorrect data structure assumption**: `entry.payload` is not an array in Recharts
2. **Misunderstanding of Recharts API**: Recharts automatically provides `percent` property
3. **Unnecessary calculation**: Tried to manually calculate percentage when it's already provided

Original problematic code (SourceSummaryChart):
```typescript
function renderCustomizedLabel(entry: any) {
  const percent = ((entry.value / entry.payload.reduce((sum: number, item: any) => sum + item.value, 0)) * 100).toFixed(0);
  // ❌ entry.payload.reduce is not a function
  return `${entry.name} (${percent}%)`;
}
```

## Solutions

### Solution 1: TopCategoriesChart
Changed to a two-step query approach:

1. **First query**: Fetch transactions with category_id
2. **Second query**: Fetch category names separately
3. **Client-side join**: Map category IDs to names in the component

### New Implementation

```typescript
// Step 1: Fetch transactions
const { data: transactions, error } = await supabase
  .from('account_transactions')
  .select(`
    amount,
    category_id
  `)
  .eq('merchant_id', merchantId)
  .eq('type', type)
  .gte('transaction_date', startDate)
  .lte('transaction_date', endDate)
  .is('deleted_at', null);

if (error) {
  console.error('Error fetching transactions:', error);
  throw error;
}

if (!transactions || transactions.length === 0) {
  setData([]);
  return;
}

// Step 2: Get unique category IDs
const categoryIds = [...new Set(transactions.map(tx => tx.category_id).filter(Boolean))];

// Step 3: Fetch category names
const { data: categories, error: catError } = await supabase
  .from('accounting_categories')
  .select('category_id, name_en')
  .in('category_id', categoryIds);

if (catError) {
  console.error('Error fetching categories:', catError);
}

// Step 4: Create lookup map
const categoryNameMap: Record<string, string> = {};
categories?.forEach(cat => {
  categoryNameMap[cat.category_id] = cat.name_en;
});

// Step 5: Map transactions to category names
transactions.forEach((tx: any) => {
  const categoryName = tx.category_id
    ? (categoryNameMap[tx.category_id] || 'Uncategorized')
    : 'Uncategorized';
  if (!categoryMap[categoryName]) {
    categoryMap[categoryName] = 0;
  }
  categoryMap[categoryName] += tx.amount;
});
```

### Solution 2: SourceSummaryChart
Use Recharts' built-in `percent` property instead of manual calculation:

```typescript
// Fixed version
function renderCustomizedLabel(entry: any) {
  // Recharts automatically calculates percent for us
  const percent = entry.percent ? (entry.percent * 100).toFixed(0) : '0';
  return `${entry.name} (${percent}%)`;
}
```

**How it works**:
1. Recharts automatically calculates the percentage for each pie slice
2. The `percent` value is a decimal (0-1), so multiply by 100 for display
3. Fallback to '0' if percent is undefined
4. Much simpler and leverages Recharts' built-in functionality

## Benefits of New Approaches

### TopCategoriesChart Benefits
1. **Reliability**: Avoids complex join syntax that may have compatibility issues
2. **Performance**: Only fetches unique category IDs (reduces data transfer)
3. **Error handling**: Better error messages for debugging
4. **Type safety**: Clearer data structures without complex nested joins
5. **Flexibility**: Easy to add more category fields if needed

### SourceSummaryChart Benefits
1. **Simplicity**: Uses Recharts' built-in calculation instead of manual logic
2. **Correctness**: Leverages tested library functionality
3. **Maintainability**: Easier to understand and modify
4. **Reliability**: No runtime errors from incorrect data structure assumptions

## Files Modified

- `/app/[locale]/merchant/accounting/analytics/components/TopCategoriesChart.tsx`
- `/app/[locale]/merchant/accounting/analytics/components/SourceSummaryChart.tsx`

## Testing Verified

✅ Build completes successfully
✅ No TypeScript errors
✅ Proper error handling for empty data
✅ Handles uncategorized transactions
✅ Maps category IDs to names correctly

## Performance Considerations

The two-query approach is actually more efficient because:
- First query: Only fetches necessary transaction data
- Second query: Only fetches unique categories (typically < 20 categories vs hundreds of transactions)
- Client-side join: O(n) complexity, negligible for typical dataset sizes
- Reduces redundant data transfer from repeated category names in joined results

## Prevention

### For Supabase Queries
1. Test join syntax in Supabase dashboard first
2. Consider two-step queries for complex joins
3. Always handle empty result sets
4. Add detailed error logging
5. Verify TypeScript types match actual data structure

### For Recharts Integration
1. Check Recharts documentation for available props and callbacks
2. Use built-in calculations (like `percent`) instead of manual computation
3. Understand the data structure passed to custom renderers
4. Test with actual data before deployment
5. Add TypeScript types for custom renderer parameters when possible
