# Fenwick Project - Claude Reference Guide

> **Professional Portfolio Timeline Application** for architect Siyana Dimitrova Borisova
> Visualizes projects across RIBA stages (0-7) from 2011-2026 with Swiss design aesthetics

## GitHub Repositories

| Repository | URL |
|------------|-----|
| Backend | https://github.com/cRuntX/fenwick-backend |
| Frontend | https://github.com/cRuntX/fenwick-frontend |

---

## Quick Start

```bash
# Backend (Terminal 1)
cd backend
npm install
npm run dev          # Starts on http://localhost:3001

# Frontend (Terminal 2)
cd frontend
npm install
npm start            # Starts on http://localhost:3000
```

---

## Architecture Overview

```
fenwick/
├── frontend/        # React + D3.js visualization app
│   └── src/
│       ├── FenwickDiagram.js   # Main component (4,500+ lines)
│       └── api.js              # Backend API client
│
├── backend/         # Express.js REST API
│   ├── server.js    # Main server (900+ lines)
│   ├── db.js        # Database configuration
│   └── fenwick.db   # SQLite database (dev)
│
└── CLAUDE.md        # This file
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, D3.js 7, jsPDF |
| Backend | Express 5, Puppeteer |
| Database (Dev) | SQLite 3 |
| Database (Prod) | PostgreSQL (Supabase) |
| Deployment | Frontend: Vercel, Backend: Render |

---

## Database Schema

### Projects Table
```sql
projects (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL,           -- Display number on timeline
  name TEXT NOT NULL,
  practice_name TEXT,                -- Company/firm name
  brief_description TEXT,            -- Max ~280 chars
  client, value, area, location TEXT,
  project_types TEXT NOT NULL,       -- JSON array: ["Commercial", "Retail"]
  type_color TEXT NOT NULL,          -- Hex color code
  thumbnail TEXT,                    -- Base64 image
  notes TEXT,
  stages TEXT NOT NULL,              -- JSON: {"0": {start, duration, useDuration}, ...}
  pauses TEXT,                       -- JSON array of pause periods
  responsibilities TEXT,             -- JSON array of strings
  completed BOOLEAN DEFAULT FALSE,
  confidential BOOLEAN DEFAULT FALSE,
  name_link TEXT,                    -- Project URL
  practice_name_link TEXT,           -- Practice URL
  rwe_months TEXT,                   -- JSON array (legacy, now using practice_periods)
  created_at, updated_at TIMESTAMP
)
```

### Settings Table
```sql
settings (
  id INTEGER PRIMARY KEY,
  start_year INTEGER DEFAULT 2011,
  end_year INTEGER DEFAULT 2026,
  color_map TEXT NOT NULL,           -- JSON: practice colors
  project_type_colors TEXT,          -- JSON: type colors
  practice_periods TEXT              -- JSON: [{id, practiceName, startDate, endDate}]
)
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data` | Get all projects and settings |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| PUT | `/api/practice-periods` | Update RWE/PEDR periods |
| POST | `/api/export-pdf` | Generate PDF (Puppeteer) |
| GET | `/health` | Health check |

---

## Key Frontend Components

### FenwickDiagram.js Structure
```
FenwickDiagram (main)
├── State: data, selectedProject, hoveredProject, filterTypes, etc.
├── D3 Timeline rendering (useEffect)
├── Project cards grid
├── Filter chips
├── Export modals
└── Embedded components:
    ├── PracticePeriodsModal - RWE/PEDR management
    └── ProjectForm - Create/edit projects
```

### Important Constants
```javascript
const RIBA_STAGES = ["RIBA 0", "RIBA 1", ..., "RIBA 7"];
const RWE_ROW_HEIGHT = 50;
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

// 21 Project Types with colors
PROJECT_TYPE_OPTIONS = ["Commercial", "Retail", "Residential", "Hospitality",
  "Hotel", "Restaurant", "Bar", "Urban Mobility", "Infrastructure", "Cultural",
  "Museum", "Exhibition", "Heritage", "UNESCO", "Interior", "Refurbishment",
  "Competition", "Research", "Academic", "Public", "Private"]
```

### Timeline Dimensions
- Column width: 20px per month
- Stage row height: 70px
- RWE row height: 50px
- Margins: top 60, right 40, bottom 20, left 80
- Year range: 2011-2026 (hardcoded)

---

## Key Features

### 1. Timeline Visualization
- D3.js SVG rendering
- 8 RIBA stages + RWE row
- Automatic year collapsing for inactive years
- Project overlap prevention algorithm
- Duration lines with dashed gaps
- Hover tooltips with 150ms delay

### 2. Project Management
- Create/Edit/Delete projects
- Multiple project types per project
- RIBA stage with optional duration
- Image upload (Base64)
- Responsibilities list
- Confidential flag (blurs in production)

### 3. RWE/PEDR System
- 1 PEDR = 3 months of practice
- Practice periods extracted from project practice names
- Dropdown filters to practices not yet added
- Global periods (not per-project)
- Rendered in RWE row below RIBA 7

### 4. PDF Export
- Full timeline + project cards
- Selected projects export
- Puppeteer-based rendering
- Single continuous page

### 5. Presentation Mode
- Triggered by: `NODE_ENV=production` or `?view=presentation`
- Hides all editing controls
- Read-only timeline view

---

## Common Tasks

### Add New Project Type
1. Add to `PROJECT_TYPE_OPTIONS` array in FenwickDiagram.js
2. Add color to `PROJECT_TYPE_COLORS` object
3. Backend handles dynamically (stored in project_types JSON)

### Modify Timeline Year Range
Currently hardcoded in multiple places:
- `FenwickDiagram.js`: monthRange useMemo (lines ~268-282)
- `FenwickDiagram.js`: generateTimelineSVG function
- `server.js`: default settings (2011-2026)

### Add New Database Column
1. Add to PostgreSQL schema in `initializePostgresDatabase()`
2. Add to SQLite schema in `createSQLiteTables()`
3. Add migration in `addNewColumnsToExistingTable()`
4. Update GET `/api/data` mapping
5. Update POST/PUT endpoints
6. Update frontend form if needed

---

## Database Sync Commands

```bash
# Export local to JSON
npm run export

# Safe sync local → production (with validation)
npm run sync

# Pull production → local
npm run pull

# Check data completeness
npm run check

# Backup production
npm run backup
```

---

## Environment Variables

### Backend (.env)
```env
NODE_ENV=production              # Use PostgreSQL
DATABASE_URL=postgresql://...    # Supabase connection string
PORT=3001                        # Optional
```

### Frontend
```env
REACT_APP_API_URL=http://localhost:3001/api  # Backend URL
```

---

## Known Issues & Workarounds

### Practice Periods Save Error
If "Failed to save practice period" occurs:
1. Restart backend server
2. Check if settings table has `practice_periods` column
3. Check backend console for detailed error

### Large Database Size
- Images stored as Base64
- Recommendation: Max 800x600px, 70-80% JPEG quality
- Run image optimization scripts if needed

### Collapsed Years
- Years without any project activity are collapsed
- Grid lines skip collapsed regions
- Year labels still shown

---

## File Locations Reference

| What | Where |
|------|-------|
| Main timeline component | `frontend/src/FenwickDiagram.js` |
| API client | `frontend/src/api.js` |
| Backend routes | `backend/server.js` |
| Database config | `backend/db.js` |
| Local database | `backend/fenwick.db` |
| Sync scripts | `backend/*.js` (export, import, sync) |

---

## Styling Notes

- **Swiss Design Mode** is default (`.swiss-mode` class)
- Helvetica Neue typography
- Black 2px borders, no border-radius
- Uppercase buttons with letter-spacing
- Colors: Primary #5a8a99, grays, project type colors
- Responsive breakpoints: 1200px, 992px, 768px, 480px

---

## Testing

```bash
# Frontend tests
cd frontend
npm test

# Backend - no tests configured
# Manual testing via API calls or frontend
```

---

## Deployment

### Frontend (Vercel)
- Auto-deploys from GitHub
- Set `REACT_APP_API_URL` to production backend

### Backend (Render)
- Auto-deploys from GitHub
- Set `DATABASE_URL` to Supabase connection string
- Set `NODE_ENV=production`

---

## Quick Debug Commands

```bash
# Check SQLite database
cd backend
sqlite3 fenwick.db ".tables"
sqlite3 fenwick.db "SELECT COUNT(*) FROM projects;"
sqlite3 fenwick.db "PRAGMA table_info(settings);"

# Check if backend running
curl http://localhost:3001/health

# Check API data
curl http://localhost:3001/api/data | head -100
```

---

## Additional Documentation

For detailed procedures, see:
- [PLAYBOOK.md](PLAYBOOK.md) - Complete command reference, Git workflows, image optimization, deployment
- [WORKFLOW.md](WORKFLOW.md) - Daily development workflow, sync safety rules, troubleshooting, emergency recovery

---

## Change History Context

Recent features added:
- RWE row below RIBA 7 for PEDR tracking
- Practice periods modal with dropdown from existing project practices
- Automatic PEDR calculation (3 months = 1 PEDR)
- Practice periods stored in settings.practice_periods

---

*Last updated: February 2026*
