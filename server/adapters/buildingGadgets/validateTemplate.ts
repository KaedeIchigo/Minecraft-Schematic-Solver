import type { BlockEntry, ValidationReport } from '@shared/types.js'
import { detectVersion } from './detectVersion.js'
import { computeMaterialList, computeBounds } from '../../../shared/voxelOps.js'

// Block IDs that may contain tile entity data (unsafe for BG export without validation)
const TILE_ENTITY_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:ender_chest',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:brewing_stand', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:hopper', 'minecraft:beacon', 'minecraft:shulker_box',
  'minecraft:white_shulker_box', 'minecraft:orange_shulker_box',
  'minecraft:barrel', 'minecraft:lectern', 'minecraft:jukebox',
  'minecraft:campfire', 'minecraft:soul_campfire', 'minecraft:command_block',
  'minecraft:structure_block', 'minecraft:jigsaw',
  // Common modded blocks that are machines/TEs
  'mekanism:energy_cube', 'mekanism:digital_miner', 'mekanism:fission_reactor',
  'ae2:controller', 'ae2:cable_bus', 'ae2:drive', 'ae2:chest',
])

const AIR_IDS = new Set(['minecraft:air', 'minecraft:cave_air'])

/**
 * Validate a raw BG template object (before importing), or validate already-imported blocks.
 */
export function validateTemplate(raw: unknown): ValidationReport
export function validateTemplate(blocks: BlockEntry[], format?: 'bg1_legacy' | 'bg2' | 'internal'): ValidationReport
export function validateTemplate(
  rawOrBlocks: unknown,
  format?: 'bg1_legacy' | 'bg2' | 'internal'
): ValidationReport {

  if (Array.isArray(rawOrBlocks)) {
    return validateBlocks(rawOrBlocks as BlockEntry[], format ?? 'internal')
  }

  const version = detectVersion(rawOrBlocks)
  const errors: string[] = []
  const warnings: string[] = []

  if (version === 'unknown') {
    errors.push('Could not detect Building Gadgets format. Expected BG1 (header+body) or BG2 (palette+blocks).')
    return { valid: false, format: 'unknown', blockCount: 0, tileEntityCount: 0, unknownBlocks: [], unsupportedBlocks: [], warnings, errors, materialList: [] }
  }

  const obj = rawOrBlocks as Record<string, unknown>

  if (version === 'bg1_legacy') {
    if (typeof obj.body !== 'string' || obj.body.length === 0) {
      errors.push('BG1 template body is missing or empty')
    }
    const header = obj.header as Record<string, unknown> | undefined
    if (!header?.material_list) {
      warnings.push('BG1 template header.material_list is missing')
    }
    if (version === 'bg2') {
      warnings.push('BG2 format detected but not yet validated in-game. Use with caution.')
    }
  }

  return {
    valid: errors.length === 0,
    format: version,
    blockCount: -1,  // unknown until parsed
    tileEntityCount: -1,
    unknownBlocks: [],
    unsupportedBlocks: [],
    warnings,
    errors,
    materialList: [],
  }
}

function validateBlocks(blocks: BlockEntry[], format: 'bg1_legacy' | 'bg2' | 'internal'): ValidationReport {
  const warnings: string[] = []
  const errors: string[] = []
  const unknownBlocks: string[] = []
  const unsupportedBlocks: string[] = []

  const nonAir = blocks.filter(b => !AIR_IDS.has(b.blockId))
  let tileEntityCount = 0

  // Check each block
  const unknownSet = new Set<string>()
  for (const b of nonAir) {
    if (!b.blockId || !b.blockId.includes(':')) {
      errors.push(`Invalid blockId: "${b.blockId}" at (${b.x},${b.y},${b.z})`)
      continue
    }

    if (TILE_ENTITY_BLOCKS.has(b.blockId)) {
      tileEntityCount++
      if (format !== 'internal') {
        warnings.push(`Block "${b.blockId}" is a tile entity — may not be handled correctly by Building Gadgets`)
        unsupportedBlocks.push(b.blockId)
      }
    }

    // Flag unusual block state values
    for (const [prop, val] of Object.entries(b.blockState)) {
      if (typeof val !== 'string') {
        warnings.push(`Block "${b.blockId}" has non-string property "${prop}": ${JSON.stringify(val)}`)
      }
    }
  }

  for (const id of unknownSet) unknownBlocks.push(id)

  if (nonAir.length === 0) {
    errors.push('Template contains no non-air blocks')
  }

  if (nonAir.length > 65536) {
    warnings.push(`Very large template (${nonAir.length} blocks) — may cause performance issues in-game`)
  }

  const bounds = computeBounds(nonAir)
  if (bounds.dimensions.x > 256 || bounds.dimensions.y > 256 || bounds.dimensions.z > 256) {
    warnings.push(`Template dimensions (${bounds.dimensions.x}×${bounds.dimensions.y}×${bounds.dimensions.z}) exceed 256 — may be unsupported`)
  }

  if (format === 'bg2') {
    warnings.push('BG2 export format has NOT been validated against a real Template Manager import. ' +
      'Please test in-game before using.')
  }

  const materialList = computeMaterialList(nonAir)

  return {
    valid: errors.length === 0,
    format,
    blockCount: nonAir.length,
    tileEntityCount,
    unknownBlocks,
    unsupportedBlocks: [...new Set(unsupportedBlocks)],
    warnings,
    errors,
    materialList,
  }
}
