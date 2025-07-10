# Browser Test Instructions for DataTable pago_parcial Column

## Quick Test Steps

1. **Open browser** and go to: `http://localhost:5174`

2. **Navigate to any data table** (e.g., Dashboard → Any table like "Autos")

3. **Check column headers** - You should now see `pago_parcial` in the table headers

4. **Verify functionality**:
   - ✅ Column appears in header row
   - ✅ Column is sortable (click header)
   - ✅ Column is editable (double-click any cell)
   - ✅ Column appears in ColumnManager

## Expected Behavior

### ✅ What Should Work Now:
- `pago_parcial` column visible in DataTable headers
- Column appears even if no data has been entered yet
- Double-click to edit cells works
- Column is included in sorting/filtering
- ColumnManager shows the column for reordering

### 🔧 Browser Console Output:
Open browser console (F12) and look for these logs:
```
🔧 Getting complete table structure for: autos
🔧 Got complete column structure: [array with pago_parcial]
🔧 Setting NEW table columns from API: [array with pago_parcial]
```

## Debugging if Column Missing

If `pago_parcial` still doesn't appear:

1. **Check console for API errors**:
   ```javascript
   // Run this in browser console:
   fetch('/api/data/tables/autos/structure')
     .then(r => r.json())
     .then(d => console.log('Columns:', d.columns.map(c => c.name)))
   ```

2. **Force column refresh**:
   - Refresh the page
   - Or switch between different tables and back

3. **Check if API is being called**:
   - Open Network tab in browser
   - Look for `/api/data/tables/[tableName]/structure` requests

## Success Indicators

✅ **Fully Working**: Column appears in headers and is fully functional
⚠️ **Partial**: Column appears but might have minor issues
❌ **Not Working**: Column missing from headers

## Next Steps After Testing

Once confirmed working, test these scenarios:
1. Add data to `pago_parcial` column
2. Use ColumnManager to reorder columns
3. Try with different tables (vida, gmm, etc.)
4. Verify data persists after refresh 