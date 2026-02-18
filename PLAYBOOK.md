# **FENWICK PROJECT - COMPLETE COMMAND PLAYBOOK**

## **📁 PROJECT STRUCTURE**

```
fenwick/
├── backend/          # Express.js API server
│   ├── fenwick.db   # Local SQLite database
│   └── server.js    # Main server file
└── frontend/         # React application
    └── src/         # React components
```

---

## **🎯 QUICK START**

### **Backend Development**
```bash
cd backend
npm install          # Install dependencies
npm run dev         # Start development server (port 3001)
```

### **Frontend Development**
```bash
cd frontend
npm install          # Install dependencies
npm start           # Start React app (port 3000)
```

---

## **🔧 BACKEND COMMANDS**

### **Server Management**
| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm start` | Start production server | Deployment/production mode |
| `npm run dev` | Start development server with auto-reload | Local development |

### **Database Sync & Backup**
| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run export` | Export local SQLite → `local-data.json` | Before syncing to production |
| `npm run backup` | Download production → `backup-data.json` | Pull latest from production |
| `npm run sync` | Smart sync local → production (with diff) | Daily workflow - push changes |
| `npm run replace` | **DANGEROUS** Full production replace | Fresh deployment only |
| `npm run migrate` | Import `backup-data.json` → local database | Restore local from backup |
| `npm run vacuum` | Optimize and compact database | After large changes/deletions |

### **Image Optimization**
| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run optimize` | Automatically resize all images (recommended) | Reduce database size |
| `npm run extract-images` | Extract images to `extracted-images/` folder | Manual optimization workflow |
| `npm run reupload-images` | Upload optimized images back to database | After manual optimization |

### **Analysis & Utilities**
| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run check-production` | Verify production database status | Debug production issues |
| `npm run analyze-activity` | Analyze project activity patterns | Review project timelines |
| `npm run analyze-years` | Review project timeline data | Analyze project years |

---

## **⚛️ FRONTEND COMMANDS**

| Command | Description | Output |
|---------|-------------|--------|
| `npm start` | Start development server | Opens at http://localhost:3000 |
| `npm run build` | Build production bundle | Creates `build/` folder |
| `npm test` | Run tests in watch mode | Interactive test runner |
| `npm run eject` | Eject Create React App config | **⚠️ One-way operation!** |

---

## **🚀 GITHUB WORKFLOW**

### **Repository URLs**
| Repository | URL |
|------------|-----|
| Backend | https://github.com/cRuntX/fenwick-backend |
| Frontend | https://github.com/cRuntX/fenwick-frontend |

### **Initial Setup (First Time Only)**
```bash
# Backend repository:
cd backend
git init
git remote add origin https://github.com/cRuntX/fenwick-backend.git
git branch -M main
git push -u origin main

# Frontend repository:
cd frontend
git init
git remote add origin https://github.com/cRuntX/fenwick-frontend.git
git branch -M main
git push -u origin main
```

### **Daily Workflow: Push to GitHub**
```bash
# 1. Check what changed
git status

# 2. Stage your changes
git add .                          # Add all files
# OR
git add backend/server.js          # Add specific files

# 3. Commit with a message
`git commit -m` "Description of changes"

# 4. Push to GitHub
git push
```

### **Pull Latest Changes**
```bash
git pull
```

### **Common Git Commands**
| Command | Description |
|---------|-------------|
| `git status` | See what files changed |
| `git diff` | See detailed changes |
| `git log` | View commit history |
| `git branch` | List branches |
| `git checkout -b feature-name` | Create new branch |
| `git checkout main` | Switch to main branch |

---

## **📊 DATA SYNC WORKFLOWS**

### **Workflow 1: Push Local Changes to Production** ✅ *Most Common*
```bash
cd backend

# Step 1: Export local database
npm run export

# Step 2: Review and sync
npm run sync

# The script will show you:
# ✨ CREATE - New projects
# 🔄 UPDATE - Modified projects
# 🗑️ DELETE - Removed projects

# Type "yes" to confirm
```

### **Workflow 2: Pull Production Data to Local**
```bash
cd backend

# Download production backup
npm run backup

# Import to local database
npm run migrate
```

### **Workflow 3: Initial Production Setup**
```bash
cd backend

# Export your local data
npm run export

# Full replace production (CAREFUL!)
npm run replace

# Type "REPLACE" then "YES" to confirm
```

### **Workflow 4: Emergency Production Restore**
```bash
cd backend

# 1. Find your backup file: production-backup-YYYY-MM-DD-HH-MM-SS.json
# 2. Rename it to: backup-data.json
# 3. Run migration:
npm run migrate
```

---

## **🖼️ IMAGE OPTIMIZATION GUIDE**

### **Option 1: Automatic (Recommended)** ⚡
```bash
cd backend

# Run auto-optimization
npm run optimize
```

**What it does:**
- Extracts all images from database
- Resizes to max 800x600px
- Converts to JPEG at 75% quality
- Re-uploads to database
- Creates backup before modifying
- **Expected reduction: 60-80%**

### **Option 2: Manual Control**
```bash
cd backend

# Step 1: Extract images
npm run extract-images
# Creates: extracted-images/ folder

# Step 2: Manually optimize using:
# - TinyPNG (https://tinypng.com/)
# - Squoosh (https://squoosh.app/)
# - Photoshop, GIMP, etc.
# Save to: optimized-images/

# Step 3: Re-upload
npm run reupload-images
```

### **After Optimization: Compact Database**
```bash
cd backend

# Reclaim unused space
npm run vacuum

# Verify images still work
cd ../frontend
npm start
```

---

## **🌐 DEPLOYMENT**

### **Backend (Render)**
- **Production URL:** https://fenwick-backend.onrender.com
- **Database:** PostgreSQL on Render
- **Auto-deploys** from GitHub `main` branch
- Set environment variables in Render dashboard

### **Frontend (Vercel)**
- **Production URL:** https://fenwick-frontend.vercel.app
- **Connects to:** Backend API at https://fenwick-backend.onrender.com
- **Auto-deploys** from GitHub

### **Full Deploy Workflow**
```bash
# 1. Commit all changes
git add .
git commit -m "Your changes"
git push

# 2. Sync database to production
cd backend
npm run export
npm run sync

# 3. Verify deployments
# - Render: Auto-deploys backend
# - Vercel: Auto-deploys frontend
```

---

## **🔍 TROUBLESHOOTING**

### **"local-data.json not found"**
```bash
npm run export
```

### **"Database is locked"**
```bash
# Stop the dev server first (Ctrl+C)
npm run export
npm run dev  # Restart
```

### **Can't push to GitHub**
```bash
# Check if remote exists
git remote -v

# If no remote, add it:
git remote add origin https://github.com/YOUR_USERNAME/fenwick.git

# Then push
git push -u origin main
```

### **Production sync failed**
```bash
# Check production is accessible
curl https://fenwick-backend.onrender.com/api/data

# Or visit in browser
```

### **Images look blurry after optimization**
- Edit `auto-optimize-images.js`
- Increase quality setting (75 → 85)
- Increase max dimensions (800x600 → 1200x900)

---

## **📝 COMMON SCENARIOS**

### **Daily Development Flow**
```bash
# 1. Start backend
cd backend
npm run dev

# 2. Start frontend (new terminal)
cd frontend
npm start

# 3. Make changes to code...

# 4. Commit to GitHub
git add .
git commit -m "Updated features"
git push

# 5. Sync database to production
cd backend
npm run export && npm run sync
```

### **Adding New Projects Locally**
```bash
# 1. Add projects via frontend UI (http://localhost:3000)
# 2. Projects save to local SQLite automatically
# 3. When ready to deploy:
cd backend
npm run export && npm run sync
```

### **Starting on New Machine**
```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/fenwick.git
cd fenwick

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Pull production data
cd backend
npm run backup
npm run migrate

# 4. Start servers
npm run dev          # Backend
cd ../frontend
npm start            # Frontend
```

---

## **⚠️ IMPORTANT WARNINGS**

- **`npm run replace`** - Deletes ALL production data! Use with extreme caution
- **`npm run eject`** - One-way operation for React app, cannot be undone
- **Git force push** - Never use `git push --force` on main branch
- **Settings sync** - PUT /api/settings endpoint not yet implemented, manual updates needed

---

## **🔗 API ENDPOINTS**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | Get all projects |
| `/api/projects/:id` | GET | Get project by ID |
| `/api/projects` | POST | Create new project |
| `/api/projects/:id` | PUT | Update project |
| `/api/projects/:id` | DELETE | Delete project |
| `/api/practice-periods` | PUT | Update RWE/PEDR practice periods |
| `/api/settings` | GET | Get global settings |
| `/api/data` | GET | Get all data (backup/sync) |
| `/api/upload` | POST | Upload and optimize images |

---

## **📦 INSTALLED PACKAGES**

### Backend Dependencies
- `express` - Web server framework
- `cors` - Cross-origin resource sharing
- `pg` - PostgreSQL client
- `sqlite3` - SQLite database
- `sharp` - Image processing
- `puppeteer` - Browser automation
- `dotenv` - Environment variables
- `node-fetch` - HTTP requests

### Frontend Dependencies
- `react` - UI framework
- `d3` - Data visualization
- `jspdf` - PDF generation
- `react-scripts` - Build tools

---

**Need help?** Check the detailed documentation:
- [backend/README.md](backend/README.md) - Full backend documentation
- [backend/IMAGE-OPTIMIZATION-GUIDE.md](backend/IMAGE-OPTIMIZATION-GUIDE.md) - Image optimization details
