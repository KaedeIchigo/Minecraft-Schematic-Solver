import { getDb } from './database.js'
import type { TemplateModule } from '@shared/types.js'
import { v4 as uuidv4 } from 'uuid'

function rowToTemplate(row: Record<string, unknown>): TemplateModule {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    name: row.name as string,
    category: row.category as string,
    tags: JSON.parse(row.tags as string),
    dimensions: JSON.parse(row.dimensions as string),
    origin: JSON.parse(row.origin as string),
    anchors: JSON.parse(row.anchors as string),
    connectionPorts: JSON.parse(row.connection_ports as string),
    blocks: JSON.parse(row.blocks as string),
    materialList: JSON.parse(row.material_list as string),
    styleProfile: JSON.parse(row.style_profile as string),
    sourceImages: JSON.parse(row.source_images as string),
    notes: row.notes as string,
    designBrief: row.design_brief ? JSON.parse(row.design_brief as string) : undefined,
    sourcePrompt: row.source_prompt as string | undefined,
    exportStatus: row.export_status as TemplateModule['exportStatus'],
    compatibilityNotes: row.compatibility_notes as string,
    relatedModuleIds: JSON.parse(row.related_module_ids as string),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function listTemplates(projectId?: string): TemplateModule[] {
  const db = getDb()
  const rows = projectId
    ? db.prepare('SELECT * FROM templates WHERE project_id = ? ORDER BY updated_at DESC').all(projectId) as Record<string, unknown>[]
    : db.prepare('SELECT * FROM templates ORDER BY updated_at DESC').all() as Record<string, unknown>[]
  return rows.map(rowToTemplate)
}

export function getTemplate(id: string): TemplateModule | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? rowToTemplate(row) : null
}

export function searchTemplates(query: { tags?: string[]; category?: string; name?: string }): TemplateModule[] {
  const db = getDb()
  let sql = 'SELECT * FROM templates WHERE 1=1'
  const params: unknown[] = []

  if (query.category) { sql += ' AND category = ?'; params.push(query.category) }
  if (query.name) { sql += ' AND name LIKE ?'; params.push(`%${query.name}%`) }

  const rows = db.prepare(sql + ' ORDER BY updated_at DESC').all(...params) as Record<string, unknown>[]
  let results = rows.map(rowToTemplate)

  if (query.tags && query.tags.length > 0) {
    results = results.filter(t => query.tags!.some(tag => t.tags.includes(tag)))
  }

  return results
}

export function createTemplate(tmpl: Omit<TemplateModule, 'id' | 'createdAt' | 'updatedAt'>): TemplateModule {
  const db = getDb()
  const now = new Date().toISOString()
  const id = uuidv4()
  const full: TemplateModule = { ...tmpl, id, createdAt: now, updatedAt: now }

  db.prepare(`
    INSERT INTO templates (id, project_id, name, category, tags, dimensions, origin, anchors,
      connection_ports, blocks, material_list, style_profile, source_images, notes,
      design_brief, source_prompt, export_status, compatibility_notes, related_module_ids, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, full.projectId, full.name, full.category,
    JSON.stringify(full.tags), JSON.stringify(full.dimensions), JSON.stringify(full.origin),
    JSON.stringify(full.anchors), JSON.stringify(full.connectionPorts), JSON.stringify(full.blocks),
    JSON.stringify(full.materialList), JSON.stringify(full.styleProfile), JSON.stringify(full.sourceImages),
    full.notes, full.designBrief ? JSON.stringify(full.designBrief) : null, full.sourcePrompt ?? null,
    full.exportStatus, full.compatibilityNotes, JSON.stringify(full.relatedModuleIds), now, now
  )

  return full
}

export function updateTemplate(id: string, patch: Partial<TemplateModule>): TemplateModule | null {
  const db = getDb()
  const now = new Date().toISOString()
  const existing = getTemplate(id)
  if (!existing) return null
  const merged = { ...existing, ...patch, id, updatedAt: now }

  db.prepare(`
    UPDATE templates SET name=?, category=?, tags=?, dimensions=?, origin=?, anchors=?,
      connection_ports=?, blocks=?, material_list=?, style_profile=?, source_images=?,
      notes=?, design_brief=?, source_prompt=?, export_status=?, compatibility_notes=?,
      related_module_ids=?, updated_at=? WHERE id=?
  `).run(
    merged.name, merged.category, JSON.stringify(merged.tags),
    JSON.stringify(merged.dimensions), JSON.stringify(merged.origin), JSON.stringify(merged.anchors),
    JSON.stringify(merged.connectionPorts), JSON.stringify(merged.blocks),
    JSON.stringify(merged.materialList), JSON.stringify(merged.styleProfile), JSON.stringify(merged.sourceImages),
    merged.notes, merged.designBrief ? JSON.stringify(merged.designBrief) : null, merged.sourcePrompt ?? null,
    merged.exportStatus, merged.compatibilityNotes, JSON.stringify(merged.relatedModuleIds), now, id
  )

  return merged
}

export function deleteTemplate(id: string): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM templates WHERE id = ?').run(id)
  return result.changes > 0
}

export function saveExportedTemplate(templateId: string, format: string, data: string): string {
  const db = getDb()
  const id = uuidv4()
  const now = new Date().toISOString()
  db.prepare('INSERT INTO exported_templates (id, template_id, format, data, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, templateId, format, data, now)
  return id
}

export function getLatestExport(templateId: string, format: string): string | null {
  const db = getDb()
  const row = db.prepare(
    'SELECT data FROM exported_templates WHERE template_id = ? AND format = ? ORDER BY created_at DESC LIMIT 1'
  ).get(templateId, format) as { data: string } | undefined
  return row?.data ?? null
}
