# Fenwick Project Management - Development Workflow

## Database Architecture

- **Local Development**: SQLite (`backend/fenwick.db`)
- **Production**: Supabase PostgreSQL
- **Source of Truth**: Supabase (production database)

---

## Daily Workflow

### 1. Starting Development

```bash
# Start local backend server
cd backend
npm start
# Runs on http://localhost:3001

# In another terminal, start frontend
cd frontend
npm start
# Runs on http://localhost:3000
```

### 2. Adding/Editing Projects Locally

1. Open http://localhost:3000
2. Add or edit projects through the UI
3. Changes are saved to local SQLite automatically
4. Test everything locally before syncing

### 3. Syncing Local Changes to Production

**⚠️ ALWAYS use the safe-sync command:**

```bash
cd backend
npm run sync
```

This script will:
- ✅ Check local data completeness
- ✅ Backup production data automatically
- ✅ Export local data
- ✅ Show comparison between local vs production
- ✅ Ask for confirmation before making changes
- ✅ Sync to production

**Never use `sync-to-supabase.js` directly!** Always use `npm run sync`.

---

## Common Tasks

### Quick Commands (Using npm scripts)

The easiest way to run common tasks:

```bash
cd backend

npm run check    # Check local data completeness
npm run sync     # Safe sync to production
npm run pull     # Pull production → local
npm run backup   # Backup production data
npm run optimize # Optimize production images
```

### Check Local Data Status

```bash
cd backend
npm run check
# Or: node check-data.js
```

Shows completeness of your local database with visual indicators.

### Pull Latest Data from Production

When you want to update local with production changes:

```bash
cd backend
npm run pull
# Or: node export-from-supabase.js && node import-to-local.js
```

### Restore from Backup

If something went wrong:

```bash
cd backend
npm run import
# Or: node import-to-local.js  # Restores from supabase-export.json
```

---

## Image Management

### Optimize Images in Production

All images are automatically optimized to 720px @ 75% quality when synced.

To re-optimize existing production images:

```bash
cd backend
node optimize-supabase-images.js
```

**Settings**: 720px max width, 540px max height, 75% JPEG quality

---

## Safety Rules

### ✅ DO:
- Always work locally first, then sync
- Use `safe-sync.js` for all syncs
- Check data completeness before syncing
- Keep Supabase as source of truth
- Pull from production when starting new work

### ❌ DON'T:
- Don't use `sync-to-supabase.js` directly
- Don't sync if local data shows 0 practice_name or descriptions
- Don't assume local is up-to-date (pull from production first)
- Don't delete the backup files (supabase-export.json)

---

## Production Deployment

### Frontend (Vercel)

Automatically deploys when you push to GitHub main branch.

**Environment Variables Required:**
- `REACT_APP_API_URL=https://fenwick-backend.onrender.com/api/data`

### Backend (Render)

Automatically deploys when you push to GitHub main branch.

**Environment Variables Required:**
- `NODE_ENV=production`
- `DATABASE_URL=postgresql://...` (Supabase connection string)

### Performance Monitoring (UptimeRobot)

**Health Endpoint**: `https://fenwick-backend.onrender.com/health`

UptimeRobot pings this endpoint every 5 minutes to prevent cold starts on Render's free tier.

**Setup**:
- Monitor Type: HTTP(s)
- URL: `https://fenwick-backend.onrender.com/health`
- Interval: 5 minutes
- Result: Backend stays warm 24/7, no 1.9 minute cold starts!

---

## Troubleshooting

### "Site loads slowly (1-2 minutes)"

**Cause**: Render free tier cold start (backend was asleep)
**Fix**: Already fixed! UptimeRobot keeps backend awake 24/7
**Verify**: Check https://fenwick-backend.onrender.com/health - should respond instantly

### "Missing data after sync"

**Cause**: Local database had corrupted/empty fields
**Fix**: Restore from production:
```bash
cd backend
npm run pull
# Or: node export-from-supabase.js && node import-to-local.js
```

### "Sync cancelled - empty database"

**Cause**: Local database is empty or corrupted
**Fix**: Pull fresh data from production:
```bash
cd backend
npm run pull
```

### "Images too large / API slow"

**Cause**: Images not optimized
**Fix**:
```bash
cd backend
npm run optimize
# Or: node optimize-supabase-images.js
```

**Note**: All images are currently optimized to 720px @ 75% quality (API size: ~1MB)

---

## File Reference

### Sync Scripts
- `safe-sync.js` - **USE THIS** for syncing local → production
- `export-from-supabase.js` - Export production → JSON
- `import-to-local.js` - Import JSON → local SQLite
- `export-local-data.js` - Export local → JSON (used by safe-sync)
- `sync-to-supabase.js` - Direct sync (DON'T USE - use safe-sync instead)

### Image Scripts
- `optimize-supabase-images.js` - Optimize production images (720px @ 75%)
- `restore-original-images.js` - Restore from backup database

### Utility Scripts
- `check-data.js` - Check local data completeness

### Backup Files
- `supabase-export.json` - Latest production backup
- `local-data.json` - Latest local export
- `fenwick_backup_*.db` - SQLite database backups

---

## Emergency Recovery

If you accidentally corrupted production:

1. **Stop immediately** - don't make more changes
2. **Restore from latest backup**:
   ```bash
   cd backend
   # If you have supabase-export.json from before corruption:
   node import-to-local.js    # Restore local first
   node safe-sync.js          # Then sync back to production
   ```

3. **If no recent backup exists**:
   - Check `fenwick_backup_*.db` files for older backups
   - Use `restore-original-images.js` to restore from backup database

---

## Best Practices

1. **Before starting work**: Pull latest from production
2. **During work**: Save frequently, test locally
3. **Before syncing**: Run `safe-sync.js` (never manual sync)
4. **After syncing**: Verify production data is correct
5. **Weekly**: Keep old backup files for safety

---

## Quick Reference

```bash
# Daily workflow
cd backend && npm start        # Start backend (port 3001)
cd frontend && npm start       # Start frontend (port 3000)

# Common tasks (use npm scripts!)
cd backend
npm run check                  # Check local data health
npm run sync                   # Sync to production (with safety checks)
npm run pull                   # Pull production → local
npm run backup                 # Backup production data
npm run optimize               # Optimize production images

# Longer form (if needed)
cd backend
node safe-sync.js              # Sync to production
node export-from-supabase.js && node import-to-local.js  # Pull from production
node check-data.js             # Check data completeness
node optimize-supabase-images.js  # Optimize images (720px @ 75%)
```

**Remember**:
- Local changes → `npm run sync`
- Get latest → `npm run pull`
- Check first → `npm run check`
