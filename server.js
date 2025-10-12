// Import required packages
import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import pg from 'pg';
import puppeteer from 'puppeteer';
const { Pool } = pg;

// Create the Express application
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database setup - use PostgreSQL in production, SQLite locally
const isProduction = process.env.NODE_ENV === 'production';
let db;

if (isProduction) {
  // PostgreSQL for production
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('✅ Using PostgreSQL database');
  initializePostgresDatabase();
} else {
  // SQLite for local development
  db = new sqlite3.Database('./fenwick.db', (err) => {
    if (err) {
      console.error('❌ Database connection failed:', err);
    } else {
      console.log('✅ SQLite database connected!');
      initializeSQLiteDatabase();
    }
  });
}

// Initialize PostgreSQL database
async function initializePostgresDatabase() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        number INTEGER NOT NULL,
        name TEXT NOT NULL,
        practice_name TEXT,
        brief_description TEXT,
        client TEXT,
        value TEXT,
        area TEXT,
        location TEXT,
        project_types TEXT NOT NULL,
        type_color TEXT NOT NULL,
        thumbnail TEXT,
        notes TEXT,
        stages TEXT NOT NULL,
        pauses TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Check if old 'type' column exists and migrate
    const columnsResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'type'
    `);
    
    if (columnsResult.rows.length > 0) {
      console.log('📦 Migrating from single type to project_types...');
      
      // Add new columns if they don't exist
      await db.query(`
        ALTER TABLE projects 
        ADD COLUMN IF NOT EXISTS practice_name TEXT,
        ADD COLUMN IF NOT EXISTS brief_description TEXT,
        ADD COLUMN IF NOT EXISTS project_types TEXT
      `).catch(() => {}); // Ignore if already exists
      
      // Migrate data from type to project_types
      await db.query(`
        UPDATE projects 
        SET project_types = CASE 
          WHEN project_types IS NULL THEN '["' || type || '"]'
          ELSE project_types
        END
        WHERE project_types IS NULL OR project_types = ''
      `);
      
      // Drop old type column
      await db.query(`ALTER TABLE projects DROP COLUMN IF EXISTS type`);
      
      console.log('✅ Migration completed!');
    }
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        start_year INTEGER DEFAULT 2011,
        end_year INTEGER DEFAULT 2026,
        color_map TEXT NOT NULL,
        project_type_colors TEXT
      )
    `);
    
    console.log('✅ PostgreSQL tables ready!');
    await checkAndCreateDefaultPostgresSettings();
  } catch (err) {
    console.error('❌ Error creating PostgreSQL tables:', err);
  }
}

// Initialize SQLite database (for local dev)
function initializeSQLiteDatabase() {
  // Check if old schema exists
  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'", (err, row) => {
    if (row && row.sql && row.sql.includes('type TEXT')) {
      console.log('📦 Migrating SQLite schema...');
      migrateSQLiteSchema();
    } else {
      createSQLiteTables();
    }
  });
}

function migrateSQLiteSchema() {
  db.serialize(() => {
    // Create new table with updated schema
    db.run(`
      CREATE TABLE IF NOT EXISTS projects_new (
        id TEXT PRIMARY KEY,
        number INTEGER NOT NULL,
        name TEXT NOT NULL,
        practice_name TEXT,
        brief_description TEXT,
        client TEXT,
        value TEXT,
        area TEXT,
        location TEXT,
        project_types TEXT NOT NULL,
        type_color TEXT NOT NULL,
        thumbnail TEXT,
        notes TEXT,
        stages TEXT NOT NULL,
        pauses TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Copy data, converting type to project_types array
    db.run(`
      INSERT INTO projects_new 
      (id, number, name, practice_name, brief_description, client, value, area, location, 
       project_types, type_color, thumbnail, notes, stages, pauses, created_at, updated_at)
      SELECT 
        id, number, name, NULL, NULL, client, value, area, location,
        '["' || type || '"]',
        type_color, thumbnail, notes, stages, pauses, created_at, updated_at
      FROM projects
    `, (err) => {
      if (err) {
        console.error('❌ Migration error:', err);
        return;
      }
      
      // Drop old table and rename new one
      db.run('DROP TABLE projects', (err) => {
        if (err) {
          console.error('❌ Drop table error:', err);
          return;
        }
        
        db.run('ALTER TABLE projects_new RENAME TO projects', (err) => {
          if (err) {
            console.error('❌ Rename table error:', err);
            return;
          }
          
          console.log('✅ SQLite migration completed!');
          createSettingsTable();
        });
      });
    });
  });
}

function createSQLiteTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      number INTEGER NOT NULL,
      name TEXT NOT NULL,
      practice_name TEXT,
      brief_description TEXT,
      client TEXT,
      value TEXT,
      area TEXT,
      location TEXT,
      project_types TEXT NOT NULL,
      type_color TEXT NOT NULL,
      thumbnail TEXT,
      notes TEXT,
      stages TEXT NOT NULL,
      pauses TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ Create projects table error:', err);
    else console.log('✅ Projects table ready!');
  });

  createSettingsTable();
}

function createSettingsTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_year INTEGER DEFAULT 2011,
      end_year INTEGER DEFAULT 2026,
      color_map TEXT NOT NULL,
      project_type_colors TEXT
    )
  `, () => {
    checkAndCreateDefaultSQLiteSettings();
  });
}

// Add default settings for PostgreSQL
async function checkAndCreateDefaultPostgresSettings() {
  try {
    const result = await db.query("SELECT COUNT(*) as count FROM settings");
    if (result.rows[0].count === '0') {
      const defaultColorMap = {
        "Commercial": "#C97373",
        "Residential": "#C79A6B",
        "Education": "#6A8FDB",
        "Healthcare": "#8CC9A3",
        "Cultural": "#B68CC9",
        "Industrial": "#9AA5B1",
        "Refurbishment": "#E0B762",
        "Student Housing": "#7FB0C9",
        "Interiors": "#A1C96D",
        "Hospitality": "#E38FB3",
        "Case Study": "#666666",
        "Others": "#A0A0A0"
      };
      
      const projectTypeColors = {
        "Commercial": "#C97373",
        "Retail": "#E38FB3",
        "Residential": "#C79A6B",
        "Hospitality": "#E38FB3",
        "Hotel": "#B68CC9",
        "Restaurant": "#E0B762",
        "Bar": "#A1C96D",
        "Urban Mobility": "#27AE60",
        "Infrastructure": "#7F8C8D",
        "Cultural": "#B68CC9",
        "Museum": "#9B59B6",
        "Exhibition": "#8E44AD",
        "Heritage": "#9AA5B1",
        "UNESCO": "#5F6A7A",
        "Interior": "#A1C96D",
        "Refurbishment": "#E0B762",
        "Competition": "#E74C3C",
        "Research": "#3498DB",
        "Academic": "#6A8FDB",
        "Public": "#2980B9",
        "Private": "#D68910"
      };
      
      await db.query(
        "INSERT INTO settings (color_map, project_type_colors) VALUES ($1, $2)",
        [JSON.stringify(defaultColorMap), JSON.stringify(projectTypeColors)]
      );
      console.log('✅ Default settings added!');
    }
  } catch (err) {
    console.error('❌ Error adding default settings:', err);
  }
}

// Add default settings for SQLite
function checkAndCreateDefaultSQLiteSettings() {
  db.get("SELECT COUNT(*) as count FROM settings", (err, row) => {
    if (!err && row.count === 0) {
      const defaultColorMap = {
        "Commercial": "#C97373",
        "Residential": "#C79A6B",
        "Education": "#6A8FDB",
        "Healthcare": "#8CC9A3",
        "Cultural": "#B68CC9",
        "Industrial": "#9AA5B1",
        "Refurbishment": "#E0B762",
        "Student Housing": "#7FB0C9",
        "Interiors": "#A1C96D",
        "Hospitality": "#E38FB3",
        "Case Study": "#666666",
        "Others": "#A0A0A0"
      };
      
      const projectTypeColors = {
        "Commercial": "#C97373",
        "Retail": "#E38FB3",
        "Residential": "#C79A6B",
        "Hospitality": "#E38FB3",
        "Hotel": "#B68CC9",
        "Restaurant": "#E0B762",
        "Bar": "#A1C96D",
        "Urban Mobility": "#27AE60",
        "Infrastructure": "#7F8C8D",
        "Cultural": "#B68CC9",
        "Museum": "#9B59B6",
        "Exhibition": "#8E44AD",
        "Heritage": "#9AA5B1",
        "UNESCO": "#5F6A7A",
        "Interior": "#A1C96D",
        "Refurbishment": "#E0B762",
        "Competition": "#E74C3C",
        "Research": "#3498DB",
        "Academic": "#6A8FDB",
        "Public": "#2980B9",
        "Private": "#D68910"
      };
      
      db.run(
        "INSERT INTO settings (color_map, project_type_colors) VALUES (?, ?)",
        [JSON.stringify(defaultColorMap), JSON.stringify(projectTypeColors)]
      );
    }
  });
}

// ROUTES

// Get all data
app.get('/api/data', async (req, res) => {
  console.log('📥 Request: Get all data');
  
  try {
    if (isProduction) {
      const settingsResult = await db.query("SELECT * FROM settings LIMIT 1");
      const projectsResult = await db.query("SELECT * FROM projects ORDER BY number");
      
      const settings = settingsResult.rows[0];
      const projects = projectsResult.rows.map(p => ({
        id: p.id,
        number: p.number,
        name: p.name,
        practiceName: p.practice_name,
        briefDescription: p.brief_description,
        client: p.client,
        value: p.value,
        area: p.area,
        location: p.location,
        projectTypes: JSON.parse(p.project_types || '[]'),
        typeColor: p.type_color,
        thumbnail: p.thumbnail,
        notes: p.notes,
        stages: JSON.parse(p.stages || '{}'),
        pauses: JSON.parse(p.pauses || '[]')
      }));
      
      res.json({
        projects,
        settings: {
          startYear: settings?.start_year || 2011,
          endYear: settings?.end_year || 2026,
          colorMap: JSON.parse(settings?.color_map || '{}'),
          projectTypeColors: JSON.parse(settings?.project_type_colors || '{}')
        }
      });
    } else {
      db.get("SELECT * FROM settings LIMIT 1", (err, settings) => {
        if (err) return res.status(500).json({ error: 'Failed to get settings' });
        
        db.all("SELECT * FROM projects ORDER BY number", (err, projects) => {
          if (err) return res.status(500).json({ error: 'Failed to get projects' });
          
          const processedProjects = projects.map(p => ({
            id: p.id,
            number: p.number,
            name: p.name,
            practiceName: p.practice_name,
            briefDescription: p.brief_description,
            client: p.client,
            value: p.value,
            area: p.area,
            location: p.location,
            projectTypes: JSON.parse(p.project_types || '[]'),
            typeColor: p.type_color,
            thumbnail: p.thumbnail,
            notes: p.notes,
            stages: JSON.parse(p.stages || '{}'),
            pauses: JSON.parse(p.pauses || '[]')
          }));
          
          res.json({
            projects: processedProjects,
            settings: {
              startYear: settings?.start_year || 2011,
              endYear: settings?.end_year || 2026,
              colorMap: JSON.parse(settings?.color_map || '{}'),
              projectTypeColors: JSON.parse(settings?.project_type_colors || '{}')
            }
          });
        });
      });
    }
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create project
app.post('/api/projects', async (req, res) => {
  const project = req.body;
  console.log('📥 Request: Create project');
  
  const projectData = {
    id: project.id,
    number: project.number || Math.floor(Math.random() * 1000),
    name: project.name,
    practiceName: project.practiceName || null,
    briefDescription: project.briefDescription || null,
    client: project.client || '',
    value: project.value || '',
    area: project.area || '',
    location: project.location || '',
    projectTypes: JSON.stringify(project.projectTypes || []),
    typeColor: project.typeColor || '#5a8a99',
    thumbnail: project.thumbnail || '',
    notes: project.notes || '',
    stages: JSON.stringify(project.stages),
    pauses: JSON.stringify(project.pauses || [])
  };
  
  try {
    if (isProduction) {
      await db.query(
        `INSERT INTO projects (id, number, name, practice_name, brief_description, client, value, area, location, 
         project_types, type_color, thumbnail, notes, stages, pauses)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [projectData.id, projectData.number, projectData.name, projectData.practiceName, 
         projectData.briefDescription, projectData.client, projectData.value, projectData.area, 
         projectData.location, projectData.projectTypes, projectData.typeColor, projectData.thumbnail, 
         projectData.notes, projectData.stages, projectData.pauses]
      );
    } else {
      db.run(
        `INSERT INTO projects (id, number, name, practice_name, brief_description, client, value, area, location, 
         project_types, type_color, thumbnail, notes, stages, pauses)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [projectData.id, projectData.number, projectData.name, projectData.practiceName,
         projectData.briefDescription, projectData.client, projectData.value, projectData.area,
         projectData.location, projectData.projectTypes, projectData.typeColor, projectData.thumbnail,
         projectData.notes, projectData.stages, projectData.pauses]
      );
    }
    console.log('✅ Project created!');
    res.json({ success: true, id: projectData.id });
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
app.put('/api/projects/:id', async (req, res) => {
  const project = req.body;
  const projectId = req.params.id;
  console.log('📥 Request: Update project', projectId);
  
  try {
    if (isProduction) {
      await db.query(
        `UPDATE projects SET number=$1, name=$2, practice_name=$3, brief_description=$4, client=$5, 
         value=$6, area=$7, location=$8, project_types=$9, type_color=$10, thumbnail=$11, notes=$12, 
         stages=$13, pauses=$14, updated_at=CURRENT_TIMESTAMP
         WHERE id=$15`,
        [project.number, project.name, project.practiceName || null, project.briefDescription || null,
         project.client || '', project.value || '', project.area || '', project.location || '',
         JSON.stringify(project.projectTypes || []), project.typeColor, project.thumbnail || '',
         project.notes || '', JSON.stringify(project.stages), JSON.stringify(project.pauses || []), 
         projectId]
      );
    } else {
      db.run(
        `UPDATE projects SET number=?, name=?, practice_name=?, brief_description=?, client=?, value=?, 
         area=?, location=?, project_types=?, type_color=?, thumbnail=?, notes=?, stages=?, pauses=?, 
         updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        [project.number, project.name, project.practiceName || null, project.briefDescription || null,
         project.client || '', project.value || '', project.area || '', project.location || '',
         JSON.stringify(project.projectTypes || []), project.typeColor, project.thumbnail || '',
         project.notes || '', JSON.stringify(project.stages), JSON.stringify(project.pauses || []), 
         projectId]
      );
    }
    console.log('✅ Project updated!');
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
app.delete('/api/projects/:id', async (req, res) => {
  const projectId = req.params.id;
  console.log('📥 Request: Delete project', projectId);
  
  try {
    if (isProduction) {
      await db.query("DELETE FROM projects WHERE id=$1", [projectId]);
    } else {
      db.run("DELETE FROM projects WHERE id=?", projectId);
    }
    console.log('✅ Project deleted!');
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// PDF Export endpoint
app.post('/api/export-pdf', async (req, res) => {
  console.log('📥 Request: Export PDF');

  try {
    const { htmlContent, cssStyles, width, height } = req.body;

    if (!htmlContent) {
      return res.status(400).json({ error: 'HTML content required' });
    }

    // Calculate PDF dimensions from SVG dimensions
    // Convert pixels to mm (96 DPI standard: 1 inch = 96px = 25.4mm)
    const pxToMm = (px) => (px * 25.4) / 96;

    const pdfWidth = width ? pxToMm(width) : 297; // Default A4 landscape width
    const pdfHeight = height ? pxToMm(height) : 210; // Default A4 landscape height

    // Launch Puppeteer browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport to match content size
    if (width && height) {
      await page.setViewport({
        width: Math.ceil(width),
        height: Math.ceil(height)
      });
    }

    // Construct complete HTML with embedded styles
    const fullHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Helvetica+Neue:wght@300;400;500;700&display=swap');

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              text-rendering: geometricPrecision;
              background: #fafafa;
            }

            /* Print-specific styles */
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }

            ${cssStyles || ''}
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `;

    await page.setContent(fullHTML, {
      waitUntil: 'networkidle0'
    });

    // Generate PDF with dynamic dimensions
    const pdf = await page.pdf({
      width: `${pdfWidth}mm`,
      height: `${pdfHeight}mm`,
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    });

    await browser.close();

    console.log('✅ PDF generated successfully');

    // Send PDF as response
    res.contentType('application/pdf');
    res.send(pdf);

  } catch (err) {
    console.error('❌ Error generating PDF:', err);
    res.status(500).json({ error: 'Failed to generate PDF', message: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Server running on port', PORT);
});