# Database Sync Workflow

Complete workflow for syncing your local SQLite database to production PostgreSQL.

## Overview

You have **4 scripts** for different sync scenarios:

1. **backup-data.js** - Download production → local backup
2. **export-local-data.js** - Export local SQLite → JSON
3. **sync-to-production.js** - Smart sync (only changes)
4. **replace-production.js** - Full replace (nuclear option)

---

## Workflow 1: Smart Sync (Recommended)

Use this when you've made changes locally and want to sync to production.

### Steps:

```bash
# 1. Export your local database
node export-local-data.js

# 2. Review changes and sync
node sync-to-production.js

# Or skip confirmation prompt:
node sync-to-production.js --confirm
```

### What it does:

- ✅ Compares local vs production
- ✅ Shows detailed diff (creates/updates/deletes)
- ✅ Asks for confirmation
- ✅ Applies only changes needed
- ✅ Preserves data not in conflict

### Use when:

- Adding new projects locally
- Updating existing projects
- Deleting projects locally
- Making incremental changes

---

## Workflow 2: Full Replace (Nuclear Option)

Use this when you want to completely replace production with local data.

### Steps:

```bash
# 1. Export your local database
node export-local-data.js

# 2. Full replace (with safety checks)
node replace-production.js

# Or skip confirmation prompts:
node replace-production.js --confirm
```

### What it does:

- ✅ Backs up production first (timestamped file)
- ✅ Deletes ALL production projects
- ✅ Creates ALL local projects
- ✅ Updates settings
- ✅ Requires double confirmation (unless --confirm)

### Use when:

- Fresh start needed
- Schema migration required
- Local is the "source of truth"
- Production data is corrupted

### Safety:

- Automatic backup saved as: `production-backup-YYYY-MM-DD-HH-MM-SS.json`
- Requires typing "REPLACE" and "YES" to proceed
- Verifies final state after completion

---

## Workflow 3: Download from Production

Use this to get the latest production data locally.

### Steps:

```bash
# Download production data
node backup-data.js
```

### What it does:

- ✅ Downloads all production data
- ✅ Saves to `backup-data.json`
- ✅ Shows summary of what was backed up

### Use when:

- Starting work on a new machine
- Want to restore local to production state
- Need a production snapshot

---

## File Reference

| File | Purpose |
|------|---------|
| `fenwick.db` | Local SQLite database |
| `local-data.json` | Exported local data (for syncing) |
| `backup-data.json` | Downloaded production data |
| `production-backup-*.json` | Timestamped production backups |

---

## Common Scenarios

### Scenario 1: Add projects locally, sync to production

```bash
# Work locally in your app (uses SQLite)
# Add/edit projects...

# When ready to deploy:
node export-local-data.js
node sync-to-production.js
```

### Scenario 2: Fresh production deployment

```bash
node export-local-data.js
node replace-production.js
```

### Scenario 3: Backup production

```bash
node backup-data.js
# Save backup-data.json somewhere safe
```

### Scenario 4: Restore local from production

```bash
# 1. Backup production
node backup-data.js

# 2. Import to local (you'll need to write this or use migrate-data-smart.js)
# Or manually:
# - Stop local server
# - Delete fenwick.db
# - Start local server (creates empty DB)
# - Use migrate-data-smart.js to import backup-data.json
```

---

## Safety Tips

1. **Always backup before replace operations**
   - `replace-production.js` does this automatically
   - Keep timestamped backups

2. **Review diffs before syncing**
   - `sync-to-production.js` shows you what will change
   - Don't use `--confirm` until you trust the workflow

3. **Test locally first**
   - Make changes in local SQLite
   - Verify in local app
   - Then sync to production

4. **Settings sync limitation**
   - ⚠️ Settings sync requires an API endpoint (`PUT /api/settings`)
   - This needs to be added to [server.js](server.js)
   - For now, settings must be updated manually via database

---

## Troubleshooting

### "local-data.json not found"
Run `node export-local-data.js` first

### "Failed to fetch production data"
Check that production server is running at:
https://fenwick-backend.onrender.com/api/data

### Settings not syncing
Settings sync requires a `PUT /api/settings` endpoint (not yet implemented)

### Sync shows unexpected deletes
Your local database may be outdated. Consider:
1. Backup production first
2. Review what will be deleted
3. Cancel if unsure
4. Update local database if needed

---

## Next Steps

Consider adding:
- [ ] `PUT /api/settings` endpoint for settings sync
- [ ] `import-from-backup.js` to restore local from backup
- [ ] Dry-run mode for both sync scripts
- [ ] Rollback functionality using timestamped backups
