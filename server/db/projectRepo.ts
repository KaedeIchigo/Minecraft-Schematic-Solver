import { getDb } from './database.js'
import type { Project, CreateProjectRequest } from '@shared/types.js'
import { v4 as uuidv4 } from 'uuid'

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    minecraftVersion: row.minecraft_version as string,
    modpackName: row.modpack_name as string,
    buildingGadgetsVersion: row.building_gadgets_version as Project['buildingGadgetsVersion'],
    blockPalette: JSON.parse(row.block_palette as string),
    activeBaseGraph: JSON.parse(row.active_base_graph as string),
    templateIds: [],  // populated separately
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function listProjects(): Project[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() as Record<string, unknown>[]
  return rows.map(rowToProject)
}

export function getProject(id: string): Project | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!row) return null
  const project = rowToProject(row)
  const templateIds = db.prepare('SELECT id FROM templates WHERE project_id = ?').all(id) as { id: string }[]
  project.templateIds = templateIds.map(t => t.id)
  return project
}

export function createProject(req: CreateProjectRequest): Project {
  const db = getDb()
  const now = new Date().toISOString()
  const id = uuidv4()
  const project: Project = {
    id,
    name: req.name,
    minecraftVersion: req.minecraftVersion ?? '1.21.1',
    modpackName: req.modpackName ?? 'ATM10 To The Sky',
    buildingGadgetsVersion: req.buildingGadgetsVersion ?? 'bg2',
    blockPalette: [],
    activeBaseGraph: { placements: [], collisions: [], nextPasteOrder: [] },
    templateIds: [],
    createdAt: now,
    updatedAt: now,
  }
  db.prepare(`
    INSERT INTO projects (id, name, minecraft_version, modpack_name, building_gadgets_version, block_palette, active_base_graph, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, project.name, project.minecraftVersion, project.modpackName,
    project.buildingGadgetsVersion, '[]',
    JSON.stringify(project.activeBaseGraph), now, now)
  return project
}

export function updateProject(id: string, patch: Partial<Project>): Project | null {
  const db = getDb()
  const now = new Date().toISOString()
  const existing = getProject(id)
  if (!existing) return null
  const merged = { ...existing, ...patch, id, updatedAt: now }
  db.prepare(`
    UPDATE projects SET name=?, minecraft_version=?, modpack_name=?, building_gadgets_version=?,
    block_palette=?, active_base_graph=?, updated_at=? WHERE id=?
  `).run(merged.name, merged.minecraftVersion, merged.modpackName, merged.buildingGadgetsVersion,
    JSON.stringify(merged.blockPalette), JSON.stringify(merged.activeBaseGraph), now, id)
  return merged
}

export function deleteProject(id: string): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  return result.changes > 0
}
