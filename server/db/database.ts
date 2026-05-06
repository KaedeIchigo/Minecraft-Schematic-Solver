import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', '..', 'data')
const DB_PATH = path.join(DATA_DIR, 'bg_planner.db')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    migrate(_db)
  }
  return _db
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      minecraft_version TEXT NOT NULL DEFAULT '1.21.1',
      modpack_name TEXT NOT NULL DEFAULT 'ATM10 To The Sky',
      building_gadgets_version TEXT NOT NULL DEFAULT 'bg2',
      block_palette TEXT NOT NULL DEFAULT '[]',
      active_base_graph TEXT NOT NULL DEFAULT '{"placements":[],"collisions":[],"nextPasteOrder":[]}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'custom',
      tags TEXT NOT NULL DEFAULT '[]',
      dimensions TEXT NOT NULL DEFAULT '{"x":1,"y":1,"z":1}',
      origin TEXT NOT NULL DEFAULT '{"x":0,"y":0,"z":0}',
      anchors TEXT NOT NULL DEFAULT '[]',
      connection_ports TEXT NOT NULL DEFAULT '[]',
      blocks TEXT NOT NULL DEFAULT '[]',
      material_list TEXT NOT NULL DEFAULT '[]',
      style_profile TEXT NOT NULL DEFAULT '{}',
      source_images TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      design_brief TEXT,
      source_prompt TEXT,
      export_status TEXT NOT NULL DEFAULT 'not_exported',
      compatibility_notes TEXT NOT NULL DEFAULT '',
      related_module_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exported_templates (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      format TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS uploaded_images (
      id TEXT PRIMARY KEY,
      template_id TEXT,
      filename TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      data BLOB NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_templates_project ON templates(project_id);
    CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
    CREATE INDEX IF NOT EXISTS idx_exported_template ON exported_templates(template_id);
  `)
}

export function closeDb() {
  _db?.close()
  _db = null
}
