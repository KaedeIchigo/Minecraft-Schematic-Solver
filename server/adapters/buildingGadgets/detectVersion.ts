import type { BuildingGadgetsVersion } from '@shared/types.js'

/**
 * Detect which Building Gadgets format a raw JSON/string template uses.
 *
 * BG1 legacy:
 *   { header: { material_list: {...} }, body: "<base64>" }
 *
 * BG2 (inferred from source analysis — requires in-game validation):
 *   { version: <number>, palette: [...], blocks: [...] }
 *
 * TODO: Validate BG2 format against a real exported template from the Template Manager.
 */
export function detectVersion(raw: unknown): BuildingGadgetsVersion {
  if (typeof raw !== 'object' || raw === null) return 'unknown'
  const obj = raw as Record<string, unknown>

  if (typeof obj.header === 'object' && typeof obj.body === 'string') {
    return 'bg1_legacy'
  }

  if (Array.isArray(obj.palette) && Array.isArray(obj.blocks)) {
    return 'bg2'
  }

  return 'unknown'
}
