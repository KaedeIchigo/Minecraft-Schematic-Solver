import type { BlockEntry, Blueprint, BlueprintRoom, TemplateModule, Vec3 } from './types.js'
import { deduplicateBlocks, computeMaterialList, carveOpening } from './voxelOps.js'
import { v4 as uuidv4 } from 'uuid'

// Marker block used for utility-gap layers. Real Minecraft block (invisible
// in-game), so the existing exporter and renderer don't need changes.
export const UTILITY_GAP_MARKER = 'minecraft:structure_void'

const MIN_INNER_HEIGHT = 4

// ─── Palette resolution ──────────────────────────────────────────────────────

const PALETTE_RESOLVER: Record<string, string> = {
  // Stones
  stone:                  'minecraft:stone',
  stone_brick:            'minecraft:stone_bricks',
  stone_bricks:           'minecraft:stone_bricks',
  cobblestone:            'minecraft:cobblestone',
  smooth_stone:           'minecraft:smooth_stone',
  mossy_stone_brick:      'minecraft:mossy_stone_bricks',
  polished_andesite:      'minecraft:polished_andesite',
  polished_diorite:       'minecraft:polished_diorite',
  polished_granite:       'minecraft:polished_granite',
  polished_blackstone:    'minecraft:polished_blackstone',
  blackstone:             'minecraft:blackstone',
  deepslate:              'minecraft:deepslate',
  polished_deepslate:     'minecraft:polished_deepslate',
  deepslate_bricks:       'minecraft:deepslate_bricks',
  deepslate_tiles:        'minecraft:deepslate_tiles',
  // End / Nether
  end_stone:              'minecraft:end_stone',
  end_stone_bricks:       'minecraft:end_stone_bricks',
  purpur:                 'minecraft:purpur_block',
  purpur_block:           'minecraft:purpur_block',
  nether_brick:           'minecraft:nether_bricks',
  nether_bricks:          'minecraft:nether_bricks',
  // Quartz
  quartz:                 'minecraft:quartz_block',
  quartz_block:           'minecraft:quartz_block',
  smooth_quartz:          'minecraft:smooth_quartz',
  // Concrete
  white_concrete:         'minecraft:white_concrete',
  light_gray_concrete:    'minecraft:light_gray_concrete',
  gray_concrete:          'minecraft:gray_concrete',
  black_concrete:         'minecraft:black_concrete',
  cyan_concrete:          'minecraft:cyan_concrete',
  orange_concrete:        'minecraft:orange_concrete',
  // Wood
  oak_planks:             'minecraft:oak_planks',
  oak_log:                'minecraft:oak_log',
  spruce_planks:          'minecraft:spruce_planks',
  spruce_log:             'minecraft:spruce_log',
  dark_oak_planks:        'minecraft:dark_oak_planks',
  dark_oak_log:           'minecraft:dark_oak_log',
  // Metals / functional
  iron_block:             'minecraft:iron_block',
  iron_bars:              'minecraft:iron_bars',
  glass:                  'minecraft:glass',
  // Lights
  glowstone:              'minecraft:glowstone',
  sea_lantern:            'minecraft:sea_lantern',
  shroomlight:            'minecraft:shroomlight',
  lantern:                'minecraft:lantern',
}

export function resolveMaterial(abstract: string, fallback = 'minecraft:stone_bricks'): string {
  if (!abstract) return fallback
  if (abstract.includes(':')) return abstract              // already namespaced
  const key = abstract.toLowerCase().trim().replace(/[\s-]+/g, '_')
  if (PALETTE_RESOLVER[key]) return PALETTE_RESOLVER[key]
  // Heuristic fallback: assume vanilla block id
  return `minecraft:${key}`
}

interface ResolvedPalette {
  wall: string
  secondaryWall: string
  floor: string
  ceiling: string
  accent: string
  frame: string
  light: string
}

function resolvePalette(bp: Blueprint): ResolvedPalette {
  const p = bp.material_palette
  return {
    wall:          resolveMaterial(p.primary_wall, 'minecraft:stone_bricks'),
    secondaryWall: resolveMaterial(p.secondary_wall, 'minecraft:stone_bricks'),
    floor:         resolveMaterial(p.floor, 'minecraft:smooth_stone'),
    ceiling:       resolveMaterial(p.ceiling, 'minecraft:stone_bricks'),
    accent:        resolveMaterial(p.accent, 'minecraft:polished_andesite'),
    frame:         resolveMaterial(p.frame_material, 'minecraft:oak_log'),
    light:         'minecraft:sea_lantern',
  }
}

// ─── Geometry helpers ────────────────────────────────────────────────────────

interface RoomBox {
  room: BlueprintRoom
  innerSize: Vec3   // enforced inner dimensions (≥ MIN_INNER_HEIGHT for y)
  origin: Vec3      // outer min corner (one below floor's interior)
  outerMax: Vec3    // outer max corner
}

/**
 * Compute outer footprint of a room. Outer = inner + 2 in each axis (walls/floor/ceiling).
 * The room.position represents the outer min corner.
 */
function computeBox(room: BlueprintRoom): RoomBox {
  const innerY = Math.max(MIN_INNER_HEIGHT, Math.floor(room.size.y))
  const innerX = Math.max(1, Math.floor(room.size.x))
  const innerZ = Math.max(1, Math.floor(room.size.z))
  const innerSize = { x: innerX, y: innerY, z: innerZ }
  const origin = {
    x: Math.floor(room.position.x),
    y: Math.floor(room.position.y),
    z: Math.floor(room.position.z),
  }
  const outerMax = {
    x: origin.x + innerX + 1,
    y: origin.y + innerY + 1,
    z: origin.z + innerZ + 1,
  }
  return { room, innerSize, origin, outerMax }
}

function buildRoomShell(box: RoomBox, pal: ResolvedPalette): BlockEntry[] {
  const { origin, outerMax } = box
  const blocks: BlockEntry[] = []
  for (let x = origin.x; x <= outerMax.x; x++) {
    for (let y = origin.y; y <= outerMax.y; y++) {
      for (let z = origin.z; z <= outerMax.z; z++) {
        const isFloor   = y === origin.y
        const isCeiling = y === outerMax.y
        const isWall    = (x === origin.x || x === outerMax.x || z === origin.z || z === outerMax.z) && !isFloor && !isCeiling
        if (isFloor) {
          blocks.push({ x, y, z, blockId: pal.floor, blockState: {} })
        } else if (isCeiling) {
          blocks.push({ x, y, z, blockId: pal.ceiling, blockState: {} })
        } else if (isWall) {
          blocks.push({ x, y, z, blockId: pal.wall, blockState: {} })
        }
      }
    }
  }

  // Lights at quarter / mid points on the ceiling for ambient illumination
  const innerCx = origin.x + Math.floor((box.innerSize.x + 1) / 2)
  const innerCz = origin.z + Math.floor((box.innerSize.z + 1) / 2)
  const ceilingY = outerMax.y - 1
  blocks.push({ x: innerCx, y: ceilingY, z: innerCz, blockId: pal.light, blockState: {} })

  // Apply features
  const features = new Set(box.room.features.map(f => f.toLowerCase()))
  if (features.has('support_pillars') || features.has('pillars')) {
    addCornerPillars(blocks, box, pal.accent)
  }
  if (features.has('arched_ceiling') || features.has('vaulted_ceiling')) {
    addCeilingRibs(blocks, box, pal.accent)
  }
  if (features.has('large_windows') || features.has('windows')) {
    addWindows(blocks, box, 'minecraft:glass')
  }
  return blocks
}

function addCornerPillars(blocks: BlockEntry[], box: RoomBox, accent: string) {
  const { origin, outerMax } = box
  const corners: [number, number][] = [
    [origin.x + 1, origin.z + 1],
    [outerMax.x - 1, origin.z + 1],
    [origin.x + 1, outerMax.z - 1],
    [outerMax.x - 1, outerMax.z - 1],
  ]
  for (const [x, z] of corners) {
    for (let y = origin.y + 1; y < outerMax.y; y++) {
      blocks.push({ x, y, z, blockId: accent, blockState: {} })
    }
  }
}

function addCeilingRibs(blocks: BlockEntry[], box: RoomBox, accent: string) {
  const { origin, outerMax } = box
  const ribY = outerMax.y - 1
  for (let z = origin.z + 2; z < outerMax.z - 1; z += 3) {
    for (let x = origin.x + 1; x < outerMax.x; x++) {
      blocks.push({ x, y: ribY, z, blockId: accent, blockState: {} })
    }
  }
}

function addWindows(blocks: BlockEntry[], box: RoomBox, glass: string) {
  const { origin, outerMax } = box
  const midY = origin.y + Math.floor(box.innerSize.y / 2) + 1
  // North and south walls
  for (let x = origin.x + 2; x < outerMax.x - 1; x += 2) {
    blocks.push({ x, y: midY, z: origin.z,    blockId: glass, blockState: {} })
    blocks.push({ x, y: midY, z: outerMax.z, blockId: glass, blockState: {} })
  }
  // East and west walls
  for (let z = origin.z + 2; z < outerMax.z - 1; z += 2) {
    blocks.push({ x: origin.x,    y: midY, z, blockId: glass, blockState: {} })
    blocks.push({ x: outerMax.x, y: midY, z, blockId: glass, blockState: {} })
  }
}

// ─── Doorway carving between connected rooms ─────────────────────────────────

interface SharedWall {
  axis: 'x' | 'z'
  plane: number       // x or z coordinate of the wall
  yMin: number
  span: { min: number; max: number }   // overlap on the other horizontal axis
}

function findSharedWall(a: RoomBox, b: RoomBox): SharedWall | null {
  // Vertical span overlap required
  const yMin = Math.max(a.origin.y, b.origin.y)
  const yMax = Math.min(a.outerMax.y, b.outerMax.y)
  if (yMax - yMin < 3) return null

  // X-aligned wall: a's east wall touches b's west wall (or vice versa) on plane = a.outerMax.x == b.origin.x
  if (a.outerMax.x === b.origin.x || b.outerMax.x === a.origin.x) {
    const plane = a.outerMax.x === b.origin.x ? a.outerMax.x : b.outerMax.x
    const zMin = Math.max(a.origin.z, b.origin.z) + 1
    const zMax = Math.min(a.outerMax.z, b.outerMax.z) - 1
    if (zMax - zMin < 1) return null
    return { axis: 'x', plane, yMin, span: { min: zMin, max: zMax } }
  }
  // Z-aligned wall
  if (a.outerMax.z === b.origin.z || b.outerMax.z === a.origin.z) {
    const plane = a.outerMax.z === b.origin.z ? a.outerMax.z : b.outerMax.z
    const xMin = Math.max(a.origin.x, b.origin.x) + 1
    const xMax = Math.min(a.outerMax.x, b.outerMax.x) - 1
    if (xMax - xMin < 1) return null
    return { axis: 'z', plane, yMin, span: { min: xMin, max: xMax } }
  }
  return null
}

function carveDoorway(blocks: BlockEntry[], wall: SharedWall): BlockEntry[] {
  const doorWidth = 2
  const doorHeight = 3
  const center = Math.floor((wall.span.min + wall.span.max) / 2)
  const minOther = Math.max(wall.span.min, center - Math.floor(doorWidth / 2))
  const yFloor = wall.yMin + 1
  const facing = wall.axis === 'x' ? 'east' : 'south'
  const pos: Vec3 = wall.axis === 'x'
    ? { x: wall.plane, y: yFloor, z: minOther }
    : { x: minOther, y: yFloor, z: wall.plane }
  return carveOpening(blocks, pos, facing, doorWidth, doorHeight)
}

// ─── Utility gap layers ──────────────────────────────────────────────────────

/**
 * Insert a 1-block-tall structure_void layer between vertically adjacent rooms
 * (where one room's ceiling touches another's floor).
 */
function insertUtilityGaps(blocks: BlockEntry[], boxes: RoomBox[]): BlockEntry[] {
  const sorted = [...boxes].sort((a, b) => a.origin.y - b.origin.y)
  const out = [...blocks]
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const lower = sorted[i]
      const upper = sorted[j]
      // Only fire when upper sits directly atop lower (ceiling-y == floor-y)
      if (upper.origin.y !== lower.outerMax.y) continue
      const overlapXmin = Math.max(lower.origin.x, upper.origin.x)
      const overlapXmax = Math.min(lower.outerMax.x, upper.outerMax.x)
      const overlapZmin = Math.max(lower.origin.z, upper.origin.z)
      const overlapZmax = Math.min(lower.outerMax.z, upper.outerMax.z)
      if (overlapXmax <= overlapXmin || overlapZmax <= overlapZmin) continue
      // Push the upper room up by 1 (already done at room creation? No — we
      // overwrite the shared layer with markers since position is taken as-is).
      // Strategy: replace shared y plane (== upper.origin.y == lower.outerMax.y)
      // *interior* footprint with utility marker blocks.
      const y = lower.outerMax.y
      for (let x = overlapXmin + 1; x < overlapXmax; x++) {
        for (let z = overlapZmin + 1; z < overlapZmax; z++) {
          out.push({ x, y, z, blockId: UTILITY_GAP_MARKER, blockState: { utility: 'true' } })
        }
      }
    }
  }
  return out
}

// ─── Main entry point ────────────────────────────────────────────────────────

export interface LayoutResult {
  blocks: BlockEntry[]
  dimensions: Vec3
  origin: Vec3
}

export function layoutBlueprint(blueprint: Blueprint): LayoutResult {
  const pal = resolvePalette(blueprint)
  const boxes = blueprint.rooms.map(computeBox)

  let blocks: BlockEntry[] = []
  for (const box of boxes) {
    blocks = blocks.concat(buildRoomShell(box, pal))
  }

  // Carve doorways for connects_to (each pair only once)
  const seen = new Set<string>()
  const byId = new Map(boxes.map(b => [b.room.id, b]))
  for (const a of boxes) {
    for (const targetId of a.room.connects_to ?? []) {
      const b = byId.get(targetId)
      if (!b) continue
      const pairKey = [a.room.id, b.room.id].sort().join('::')
      if (seen.has(pairKey)) continue
      seen.add(pairKey)
      const wall = findSharedWall(a, b)
      if (wall) blocks = carveDoorway(blocks, wall)
    }
  }

  if (blueprint.utility_gap) {
    blocks = insertUtilityGaps(blocks, boxes)
  }

  blocks = deduplicateBlocks(blocks)

  // Normalize so min corner is at (0,0,0)
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (const b of blocks) {
    if (b.x < minX) minX = b.x
    if (b.y < minY) minY = b.y
    if (b.z < minZ) minZ = b.z
    if (b.x > maxX) maxX = b.x
    if (b.y > maxY) maxY = b.y
    if (b.z > maxZ) maxZ = b.z
  }
  const normalized = blocks.map(b => ({ ...b, x: b.x - minX, y: b.y - minY, z: b.z - minZ }))

  return {
    blocks: normalized,
    dimensions: { x: maxX - minX + 1, y: maxY - minY + 1, z: maxZ - minZ + 1 },
    origin: { x: 0, y: 0, z: 0 },
  }
}

export function blueprintToTemplate(
  blueprint: Blueprint,
  projectId: string,
  prompt?: string,
  sourceImage?: string
): Omit<TemplateModule, 'id' | 'createdAt' | 'updatedAt'> {
  const layout = layoutBlueprint(blueprint)
  const materialList = computeMaterialList(layout.blocks)
  const promptTag = prompt ? ` — ${prompt.slice(0, 40)}` : ''
  const name = `${blueprint.theme || 'Structure'}${promptTag}`.trim()

  return {
    name,
    category: blueprint.rooms[0]?.type ?? 'custom',
    tags: ['ai-generated', blueprint.theme, ...blueprint.rooms.map(r => r.type)].filter(Boolean) as string[],
    dimensions: layout.dimensions,
    origin: layout.origin,
    anchors: blueprint.rooms.map(r => ({
      id: uuidv4(),
      name: r.label || r.id,
      position: r.position,
      facing: 'north' as const,
      purpose: r.type,
    })),
    connectionPorts: [],
    blocks: layout.blocks,
    materialList,
    styleProfile: {
      name: blueprint.theme,
      keywords: blueprint.style_notes.split(/[,\s]+/).filter(Boolean),
      primaryBlocks: [resolveMaterial(blueprint.material_palette.primary_wall)],
      accentBlocks:  [resolveMaterial(blueprint.material_palette.accent)],
      floorBlocks:   [resolveMaterial(blueprint.material_palette.floor)],
      ceilingBlocks: [resolveMaterial(blueprint.material_palette.ceiling)],
    },
    sourceImages: sourceImage ? [sourceImage] : [],
    notes: blueprint.style_notes,
    projectId,
    sourcePrompt: prompt,
    exportStatus: 'not_exported',
    compatibilityNotes: '',
    relatedModuleIds: [],
  }
}
