import type { BlockEntry, BG1Template, BG2Template, NBTPaletteEntry } from '@shared/types.js'
import { detectVersion } from './detectVersion.js'
import { decodeBody, parseBlockStateMap, parseStateList } from './nbtHelpers.js'
import { normalizeCoordinates } from './normalizeCoordinates.js'
import nbt from 'prismarine-nbt'

export interface ImportResult {
  blocks: BlockEntry[]
  palette: NBTPaletteEntry[]
  warnings: string[]
}

/**
 * Import a Building Gadgets template (BG1 or BG2) into the internal block format.
 */
export async function importTemplate(raw: unknown): Promise<ImportResult> {
  const version = detectVersion(raw)

  if (version === 'bg1_legacy') {
    return importBG1(raw as BG1Template)
  }

  if (version === 'bg2') {
    return importBG2(raw as BG2Template)
  }

  throw new Error(`Unrecognized Building Gadgets template format. Detected version: ${version}`)
}

async function importBG1(template: BG1Template): Promise<ImportResult> {
  const warnings: string[] = []

  let nbtData: nbt.NBT
  try {
    nbtData = await decodeBody(template.body)
  } catch (e) {
    throw new Error(`Failed to decode BG1 template body: ${String(e)}`)
  }

  const root = nbtData.value as Record<string, nbt.Tags[keyof nbt.Tags]>

  // blockstatemap — palette
  const bsmTag = root['blockstatemap'] as nbt.Tags['list'] | undefined
  if (!bsmTag) throw new Error('Missing blockstatemap in BG1 NBT body')
  const palette = parseBlockStateMap(bsmTag)

  // statelist — block placements
  const stateListTag = root['statelist'] as nbt.Tags['list'] | undefined
  if (!stateListTag) throw new Error('Missing statelist in BG1 NBT body')
  const entries = parseStateList(stateListTag)

  const blocks: BlockEntry[] = []

  for (const entry of entries) {
    const { x, y, z } = entry.pos
    const paletteEntry = palette[entry.paletteIndex]

    if (!paletteEntry) {
      warnings.push(`Invalid palette index ${entry.paletteIndex} at (${x},${y},${z}), using air`)
      blocks.push({ x, y, z, blockId: 'minecraft:air', blockState: {} })
      continue
    }

    blocks.push({
      x, y, z,
      blockId: paletteEntry.name,
      blockState: paletteEntry.properties ?? {},
    })
  }

  return {
    blocks: normalizeCoordinates(blocks),
    palette,
    warnings,
  }
}

function importBG2(template: BG2Template): ImportResult {
  const warnings: string[] = [
    'WARNING: BG2 import is based on source-code analysis and has not been validated ' +
    'against a real in-game exported template. Provide a real BG2 fixture to validate.',
  ]

  const blocks: BlockEntry[] = template.blocks.map(b => {
    const entry = template.palette[b.state]
    if (!entry) {
      warnings.push(`Invalid palette index ${b.state} at (${b.pos.join(',')}), using air`)
      return { x: b.pos[0], y: b.pos[1], z: b.pos[2], blockId: 'minecraft:air', blockState: {} }
    }
    return {
      x: b.pos[0], y: b.pos[1], z: b.pos[2],
      blockId: entry.Name,
      blockState: entry.Properties ?? {},
    }
  })

  return {
    blocks: normalizeCoordinates(blocks),
    palette: template.palette,
    warnings,
  }
}
