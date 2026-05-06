import type { BlockEntry, BG1Template, MaterialEntry } from '@shared/types.js'
import { computeMaterialList } from '../../../shared/voxelOps.js'

/**
 * Extract the material list from either a raw BG1 template header (fast, no NBT decode)
 * or from already-imported blocks (accurate).
 */
export function getMaterialList(source: BG1Template | BlockEntry[]): MaterialEntry[] {
  if (Array.isArray(source)) {
    return computeMaterialList(source)
  }

  // Fast path: read from BG1 header without decoding the body
  const entries = source.header?.material_list?.root_entry ?? []
  return entries.map(e => ({
    blockId: e.item.id,
    displayName: formatDisplayName(e.item.id),
    count: e.count,
  })).sort((a, b) => b.count - a.count)
}

function formatDisplayName(blockId: string): string {
  const parts = blockId.split(':')
  const name = parts[parts.length - 1] ?? blockId
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
