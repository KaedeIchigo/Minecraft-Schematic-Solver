import type { BlockEntry, BG1Template, BG1TemplateMaterialEntry, NBTPaletteEntry } from '@shared/types.js'
import { encodeBody, buildStateListEntry } from './nbtHelpers.js'
import { computeMaterialList } from '../../../shared/voxelOps.js'
import nbt from 'prismarine-nbt'

/**
 * Export internal blocks to Building Gadgets 1 (legacy) JSON format.
 *
 * Body NBT keys use prismarine-nbt camelCase types (intArray, not int_array).
 * Long values are encoded as [hi32, lo32] two-element arrays.
 */
export async function exportTemplate(
  blocks: BlockEntry[],
  _name: string = 'template'
): Promise<BG1Template> {
  const airIds = new Set(['minecraft:air', 'minecraft:cave_air'])
  const nonAir = blocks.filter(b => !airIds.has(b.blockId))

  if (nonAir.length === 0) {
    throw new Error('Cannot export empty template (no non-air blocks)')
  }

  // Build palette — deduplicated list of unique block states
  const paletteMap = new Map<string, number>()
  const palette: NBTPaletteEntry[] = []

  function getOrAdd(blockId: string, state: Record<string, string>): number {
    const key = `${blockId}|${Object.entries(state).sort().map(([k, v]) => `${k}=${v}`).join(',')}`
    if (paletteMap.has(key)) return paletteMap.get(key)!
    const idx = palette.length
    paletteMap.set(key, idx)
    palette.push({ Name: blockId, Properties: state ?? {} })
    return idx
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  const stateListItems: ReturnType<typeof buildStateListEntry>[] = []

  for (const b of nonAir) {
    if (b.x < minX) minX = b.x; if (b.x > maxX) maxX = b.x
    if (b.y < minY) minY = b.y; if (b.y > maxY) maxY = b.y
    if (b.z < minZ) minZ = b.z; if (b.z > maxZ) maxZ = b.z
    stateListItems.push(buildStateListEntry(b.x, b.y, b.z, getOrAdd(b.blockId, b.blockState)))
  }

  // Build blockstatemap list — each palette entry is a compound item
  const paletteItems = palette.map(p => {
    const props: Record<string, nbt.Tags['string']> = {}
    for (const [k, v] of Object.entries(p.Properties ?? {})) {
      props[k] = { type: 'string', value: v }
    }
    return {
      Name: { type: 'string' as const, value: p.Name },
      Properties: { type: 'compound' as const, value: props },
    }
  })

  const bodyNbt: nbt.NBT = {
    type: 'compound',
    name: '',
    value: {
      blockstatemap: {
        type: 'list',
        value: { type: 'compound', value: paletteItems as never[] },
      },
      statelist: {
        type: 'list',
        value: { type: 'compound', value: stateListItems as never[] },
      },
      startpos: { type: 'intArray', value: [minX, minY, minZ] } as nbt.Tags['intArray'],
      endpos: { type: 'intArray', value: [maxX, maxY, maxZ] } as nbt.Tags['intArray'],
    },
  }

  const body = await encodeBody(bodyNbt)

  const materials = computeMaterialList(nonAir)
  const rootEntry: BG1TemplateMaterialEntry[] = materials.map(m => ({
    count: m.count,
    item: { id: m.blockId },
  }))

  return {
    header: { material_list: { root_entry: rootEntry } },
    body,
  }
}

/**
 * Export to BG2 format (placeholder — not yet validated in-game).
 */
export function exportTemplateBG2(blocks: BlockEntry[], name: string = 'template') {
  const airIds = new Set(['minecraft:air', 'minecraft:cave_air'])
  const nonAir = blocks.filter(b => !airIds.has(b.blockId))

  const paletteMap = new Map<string, number>()
  const palette: Array<{ Name: string; Properties: Record<string, string> }> = []

  function getOrAdd(blockId: string, state: Record<string, string>): number {
    const key = `${blockId}|${Object.entries(state).sort().map(([k, v]) => `${k}=${v}`).join(',')}`
    if (paletteMap.has(key)) return paletteMap.get(key)!
    const idx = palette.length
    paletteMap.set(key, idx)
    palette.push({ Name: blockId, Properties: state })
    return idx
  }

  const bgBlocks = nonAir.map(b => ({
    pos: [b.x, b.y, b.z] as [number, number, number],
    state: getOrAdd(b.blockId, b.blockState),
  }))

  return {
    _warning: 'BG2 format NOT validated in-game. Do not use without confirming with real Template Manager export.',
    version: 1,
    name,
    palette,
    blocks: bgBlocks,
  }
}
