# Fenwick Backend

Backend server for the Fenwick project timeline diagram application.

## Architecture

- **Production**: PostgreSQL database on Render
- **Local Development**: SQLite database
- **API**: Express.js REST API
- **Frontend**: Deployed on Vercel

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Server runs on `http://localhost:3001`

### Production

```bash
npm start
```

---

## Database Sync Workflows

### Overview

The backend supports bi-directional sync between local SQLite and production PostgreSQL:

```
Local SQLite ←→ Production PostgreSQL
```

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run backup` | Download production data to `backup-data.json` |
| `npm run export` | Export local SQLite to `local-data.json` |
| `npm run sync` | Smart sync with diff review (asks confirmation) |
| `npm run replace` | Full production replace (with backup & confirmation) |
| `npm run migrate` | Legacy migration script |

---

## Workflow 1: Local → Production (Smart Sync)

Use this when you've made changes locally and want to push to production.

```bash
# 1. Export local database
npm run export

# 2. Review changes and sync
npm run sync
```

### What happens:
1. Exports local SQLite to `local-data.json`
2. Compares with production
3. Shows detailed diff:
   - ✨ **CREATE**: New projects to add
   - 🔄 **UPDATE**: Existing projects that changed
   - 🗑️ **DELETE**: Projects removed locally
4. Asks for confirmation: `yes/no`
5. Applies only the changes needed

### When to use:
- Adding new projects locally
- Updating existing project data
- Deleting projects
- Any incremental changes

---

## Workflow 2: Local → Production (Full Replace)

Use this for a complete fresh start in production.

```bash
# 1. Export local database
npm run export

# 2. Full replace (dangerous!)
npm run replace
```

### What happens:
1. **Backs up production** to `production-backup-YYYY-MM-DD-HH-MM-SS.json`
2. Shows replacement plan
3. Requires double confirmation:
   - Type `REPLACE` to confirm
   - Type `YES` to proceed
4. **Deletes all production projects**
5. **Creates all local projects**
6. Updates settings
7. Verifies final state

### When to use:
- Fresh production deployment
- Schema migration required
- Production data is corrupted
- Local is the definitive source of truth

### Safety:
- Automatic timestamped backup saved locally
- Double confirmation required
- Final state verification

---

## Workflow 3: Production → Local

Use this to get the latest production data.

```bash
npm run backup
```

Downloads all production data to `backup-data.json`.

### When to use:
- Starting work on a new machine
- Need a production snapshot
- Want to restore local to production state

**Note**: To import this backup into your local database, use the legacy migration script:

```bash
npm run migrate
```

---

## Common Scenarios

### Scenario 1: Daily workflow (add/edit projects locally)

```bash
# Make changes in your local app
# Projects are saved to local SQLite (fenwick.db)

# When ready to deploy:
npm run export && npm run sync

# Review the diff, type "yes" to proceed
```

### Scenario 2: Initial production setup

```bash
# Set up local database with all projects
npm run export
npm run replace

# Type REPLACE, then YES to confirm
```

### Scenario 3: Pull latest from production

```bash
npm run backup

# Backup saved to backup-data.json
# To import: npm run migrate (uses backup-data.json)
```

### Scenario 4: Emergency production restore

```bash
# If production is broken, restore from a backup file:
# 1. Find your backup file: production-backup-YYYY-MM-DD-HH-MM-SS.json
# 2. Rename it to: backup-data.json
# 3. Run: npm run migrate
```

---

## File Reference

| File | Purpose | Created By |
|------|---------|------------|
| `fenwick.db` | Local SQLite database | Auto-created on first run |
| `local-data.json` | Exported local data | `npm run export` |
| `backup-data.json` | Production backup | `npm run backup` |
| `production-backup-*.json` | Timestamped backups | `npm run replace` |

---

## API Endpoints

### Projects

- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Settings

- `GET /api/settings` - Get global settings
- `PUT /api/settings` - Update settings (TODO)

### Data

- `GET /api/data` - Get all projects and settings (used for backup/sync)

### Images

- `POST /api/upload` - Upload and optimize images

---

## Database Schema

### Projects Table

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  practice_name TEXT,
  brief_description TEXT,
  client TEXT,
  value TEXT,
  area TEXT,
  location TEXT,
  project_types TEXT NOT NULL,  -- JSON array
  type_color TEXT NOT NULL,
  thumbnail TEXT,
  notes TEXT,
  stages TEXT NOT NULL,         -- JSON object
  pauses TEXT,                  -- JSON array
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Settings Table

```sql
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  start_year INTEGER DEFAULT 2011,
  end_year INTEGER DEFAULT 2026,
  color_map TEXT NOT NULL,           -- JSON object
  project_type_colors TEXT           -- JSON object
)
```

---

## Environment Variables

Create a `.env` file for production:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
NODE_ENV=production
```

Local development uses SQLite by default (no .env needed).

---

## Sync Script Details

### Smart Sync Algorithm

1. Load local data from `local-data.json`
2. Fetch production data via `/api/data`
3. Build ID maps for both datasets
4. Compare project by project:
   - Not in production → **CREATE**
   - Different data → **UPDATE**
   - Not in local → **DELETE**
5. Deep compare settings
6. Show summary and wait for confirmation
7. Execute changes via REST API

### Full Replace Algorithm

1. Check `local-data.json` exists
2. Fetch production data
3. Save production backup with timestamp
4. Show replacement plan
5. Wait for double confirmation
6. Delete all production projects
7. Create all local projects
8. Verify final state

---

## Known Limitations

### Settings Sync

⚠️ Settings sync is partially implemented. While the sync scripts detect settings changes, they cannot automatically update production settings because the `PUT /api/settings` endpoint is not yet implemented.

**Workaround**: Settings must be updated manually in the production database or via a database migration.

**TODO**: Add `PUT /api/settings` endpoint to [server.js](server.js)

---

## Troubleshooting

### "local-data.json not found"

Run `npm run export` first to export your local database.

### "Failed to fetch production data"

Check that production server is accessible:
```
https://fenwick-backend.onrender.com/api/data
```

### Sync shows unexpected deletes

Your local database may be out of sync. Consider:
1. Review what will be deleted carefully
2. Cancel the sync if unsure
3. Download production backup: `npm run backup`
4. Compare local vs production data

### Interactive prompt doesn't work

If running sync scripts in a non-interactive environment, you'll need to modify the scripts to skip confirmation prompts or add `--confirm` flag support.

### Database locked (SQLite)

Stop your local dev server before running export:
```bash
# Stop server (Ctrl+C)
npm run export
# Restart server
npm run dev
```

---

## Development Tips

### Adding New Fields to Schema

1. Update table creation in [server.js](server.js)
2. Update export/import logic in sync scripts
3. Test locally first
4. Use `npm run replace` to update production schema

### Testing Sync Locally

```bash
# Export current state
npm run export

# Make changes in local database
# ...

# Export again
npm run export

# Review diff (will show your changes)
npm run sync
```

### Safe Production Updates

1. Always review the diff before confirming
2. Keep production backups
3. Test changes locally first
4. Use `npm run sync` for incremental changes
5. Only use `npm run replace` when necessary

---

## Production Deployment

### Backend (Render)

1. Push to GitHub
2. Render auto-deploys from `main` branch
3. Environment variables configured in Render dashboard
4. PostgreSQL database automatically connected

### Frontend (Vercel)

Connected to backend via API calls to:
```
https://fenwick-backend.onrender.com
```

---

## Scripts Reference

### Server Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload

### Database Scripts

- `npm run export` - Export local SQLite → `local-data.json`
- `npm run backup` - Download production → `backup-data.json`
- `npm run sync` - Smart sync (local → production)
- `npm run replace` - Full replace (local → production)
- `npm run migrate` - Import `backup-data.json` → production

---

## Contributing

When making changes:

1. Work in local development environment
2. Test thoroughly with SQLite
3. Export and review changes: `npm run export`
4. Sync to production: `npm run sync`
5. Verify in production frontend

---

## Support

- **Issues**: Report at GitHub repository
- **Documentation**: See [SYNC-WORKFLOW.md](SYNC-WORKFLOW.md) for detailed sync workflows
- **Production URL**: https://fenwick-backend.onrender.com
- **Frontend URL**: https://fenwick-frontend.vercel.app

---

## License

[Your License Here]
