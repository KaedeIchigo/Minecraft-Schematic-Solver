import { Router } from 'express'
import {
  listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate,
  saveExportedTemplate, getLatestExport, searchTemplates,
} from '../db/templateRepo.js'
import { exportTemplate, importTemplate, validateTemplate, roundTripTemplate, getMaterialList } from '../adapters/buildingGadgets/index.js'
import { generateModuleFromBrief } from '../../shared/moduleGenerator.js'
import { computeMaterialList } from '../../shared/voxelOps.js'
import { detectVersion } from '../adapters/buildingGadgets/detectVersion.js'
import type { GenerateModuleRequest, ExportTemplateRequest } from '@shared/types.js'

const router = Router()

// List / search templates
router.get('/', (req, res) => {
  const { projectId, category, name, tags } = req.query
  const tagList = tags ? String(tags).split(',') : undefined
  if (category || name || tagList) {
    return res.json(searchTemplates({
      category: category as string | undefined,
      name: name as string | undefined,
      tags: tagList,
    }))
  }
  res.json(listTemplates(projectId as string | undefined))
})

router.get('/:id', (req, res) => {
  const t = getTemplate(req.params.id)
  if (!t) return res.status(404).json({ error: 'Template not found' })
  res.json(t)
})

router.post('/', (req, res) => {
  try {
    const t = createTemplate(req.body)
    res.status(201).json(t)
  } catch (e) {
    res.status(400).json({ error: String(e) })
  }
})

router.put('/:id', (req, res) => {
  const updated = updateTemplate(req.params.id, req.body)
  if (!updated) return res.status(404).json({ error: 'Template not found' })
  res.json(updated)
})

router.delete('/:id', (req, res) => {
  const ok = deleteTemplate(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Template not found' })
  res.status(204).end()
})

// Generate a module from a design brief
router.post('/generate', async (req, res) => {
  try {
    const body = req.body as GenerateModuleRequest
    if (!body.projectId || !body.designBrief) {
      return res.status(400).json({ error: 'projectId and designBrief required' })
    }
    const moduleData = generateModuleFromBrief(body.designBrief, body.projectId, body.prompt)
    const saved = createTemplate(moduleData)
    res.status(201).json(saved)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// Export a template
router.post('/:id/export', async (req, res) => {
  const t = getTemplate(req.params.id)
  if (!t) return res.status(404).json({ error: 'Template not found' })
  const body = req.body as Partial<ExportTemplateRequest>
  const format = body.format ?? 'bg1_legacy'

  try {
    if (format === 'bg1_legacy') {
      const bg1 = await exportTemplate(t.blocks)
      const json = JSON.stringify(bg1, null, 2)
      saveExportedTemplate(t.id, 'bg1_legacy', json)
      updateTemplate(t.id, { exportStatus: 'validated_bg1' })
      return res.json({ format: 'bg1_legacy', data: json, template: bg1 })
    }

    if (format === 'internal_json') {
      const json = JSON.stringify(t, null, 2)
      saveExportedTemplate(t.id, 'internal_json', json)
      return res.json({ format: 'internal_json', data: json })
    }

    res.status(400).json({ error: `Format '${format}' not yet supported. BG2 format requires in-game validation.` })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// Get latest export
router.get('/:id/export/:format', (req, res) => {
  const data = getLatestExport(req.params.id, req.params.format)
  if (!data) return res.status(404).json({ error: 'No export found' })
  res.json({ format: req.params.format, data })
})

// Import a BG template
router.post('/import', async (req, res) => {
  try {
    const { raw, projectId, name } = req.body as { raw: unknown; projectId: string; name?: string }
    if (!raw || !projectId) return res.status(400).json({ error: 'raw and projectId required' })

    const version = detectVersion(raw)
    const result = await importTemplate(raw)
    const { computeBounds } = await import('../../shared/voxelOps.js')
    const bounds = computeBounds(result.blocks)
    const materials = computeMaterialList(result.blocks)


    const tmpl = createTemplate({
      projectId,
      name: name ?? `Imported ${version} template`,
      category: 'custom',
      tags: ['imported', version],
      dimensions: bounds.dimensions,
      origin: { x: 0, y: 0, z: 0 },
      anchors: [],
      connectionPorts: [],
      blocks: result.blocks,
      materialList: materials,
      styleProfile: {},
      sourceImages: [],
      notes: `Imported from Building Gadgets ${version} format. Warnings: ${result.warnings.join('; ')}`,
      exportStatus: version === 'bg1_legacy' ? 'validated_bg1' : 'unvalidated_placeholder',
      compatibilityNotes: result.warnings.join('\n'),
      relatedModuleIds: [],
    })

    res.status(201).json({ template: tmpl, warnings: result.warnings })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// Validate blocks in a template
router.get('/:id/validate', (req, res) => {
  const t = getTemplate(req.params.id)
  if (!t) return res.status(404).json({ error: 'Template not found' })
  const report = validateTemplate(t.blocks, t.exportStatus === 'validated_bg1' ? 'bg1_legacy' : 'internal')
  res.json(report)
})

// Round-trip test for a BG1 template
router.post('/:id/roundtrip', async (req, res) => {
  const t = getTemplate(req.params.id)
  if (!t) return res.status(404).json({ error: 'Template not found' })

  try {
    const bg1 = await exportTemplate(t.blocks)
    const result = await roundTripTemplate(bg1)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// Material list for a template
router.get('/:id/materials', (req, res) => {
  const t = getTemplate(req.params.id)
  if (!t) return res.status(404).json({ error: 'Template not found' })
  res.json(getMaterialList(t.blocks))
})

export default router
