import type { BlockEntry, Blueprint, BlueprintRoom, TemplateModule, Vec3 } from './types.js'
import { deduplicateBlocks, computeMaterialList, carveOpening } from './voxelOps.js'
import { v4 as uuidv4 } from 'uuid'
import { resolveBlock, stairsForBase, UTILITY_GAP_BLOCK_ID, type ResolvedBlock } from './blockRegistry.js'

// Marker block placed in utility-gap layers between vertically-stacked rooms.
// minecraft:smooth_stone_slab (bottom half) is visually distinct in both the
// renderer and in-game.
export const UTILITY_GAP_MARKER = UTILITY_GAP_BLOCK_ID

const MIN_INNER_HEIGHT = 4

// ─── Palette resolution (delegates to blockRegistry) ─────────────────────────

/**
 * Back-compat helper used elsewhere (tests, server). Returns just the block ID.
 */
export function resolveMaterial(abstract: string, fallback = 'minecraft:stone_bricks'): string {
  if (!abstract) return fallback
  return resolveBlock(abstract).blockId
}

interface ResolvedPalette {
  wall:           ResolvedBlock
  secondaryWall:  ResolvedBlock
  floor:          ResolvedBlock
  ceiling:        ResolvedBlock
  accent:         ResolvedBlock
  frame:          ResolvedBlock          // base material for framed pillars
  framedPillar:   ResolvedBlock          // resolved framed_<frame> block
  light:          ResolvedBlock
}

function resolvePalette(bp: Blueprint): ResolvedPalette {
  const p = bp.material_palette
  const frame = resolveBlock(p.frame_material)
  const framedPillar = resolveBlock(`framed_${p.frame_material}`)
  return {
    wall:           resolveBlock(p.primary_wall),
    secondaryWall:  resolveBlock(p.secondary_wall),
    floor:          resolveBlock(p.floor),
    ceiling:        resolveBlock(p.ceiling),
    accent:         resolveBlock(p.accent),
    frame,
    framedPillar,
    light:          resolveBlock('sea_lantern'),
  }
}

function place(blocks: BlockEntry[], x: number, y: number, z: number, rb: ResolvedBlock) {
  const entry: BlockEntry = { x, y, z, blockId: rb.blockId, blockState: { ...rb.blockState } }
  if (rb.nbtData) entry.nbtData = rb.nbtData
  blocks.push(entry)
}

// ─── Geometry helpers ────────────────────────────────────────────────────────

interface RoomBox {
  room: BlueprintRoom
  innerSize: Vec3
  origin: Vec3       // outer min corner
  outerMax: Vec3     // outer max corner
}

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
        if (isFloor)        place(blocks, x, y, z, pal.floor)
        else if (isCeiling) place(blocks, x, y, z, pal.ceiling)
        else if (isWall)    place(blocks, x, y, z, pal.wall)
      }
    }
  }

  // Center ceiling light
  const innerCx = origin.x + Math.floor((box.innerSize.x + 1) / 2)
  const innerCz = origin.z + Math.floor((box.innerSize.z + 1) / 2)
  place(blocks, innerCx, outerMax.y - 1, innerCz, pal.light)

  // Apply per-room features
  const features = new Set(box.room.features.map(f => f.toLowerCase()))
  if (features.has('support_pillars') || features.has('pillars')) {
    addCornerPillars(blocks, box, pal.framedPillar)
  }
  if (features.has('arched_ceiling') || features.has('vaulted_ceiling')) {
    addArchedCeiling(blocks, box, pal)
  }
  if (features.has('large_windows') || features.has('windows')) {
    addLargeWindows(blocks, box)
  }
  return blocks
}

// ── Feature: support_pillars (framed-block 1×1 corner pillars) ───────────────

function addCornerPillars(blocks: BlockEntry[], box: RoomBox, framed: ResolvedBlock) {
  const { origin, outerMax } = box
  const corners: [number, number][] = [
    [origin.x + 1, origin.z + 1],
    [outerMax.x - 1, origin.z + 1],
    [origin.x + 1, outerMax.z - 1],
    [outerMax.x - 1, outerMax.z - 1],
  ]
  for (const [x, z] of corners) {
    for (let y = origin.y + 1; y < outerMax.y; y++) {
      place(blocks, x, y, z, framed)
    }
  }
}

// ── Feature: arched_ceiling (stairs along ceiling edges, half=top) ───────────

function addArchedCeiling(blocks: BlockEntry[], box: RoomBox, pal: ResolvedPalette) {
  const { origin, outerMax } = box
  const ceilingY = outerMax.y - 1
  const stairsId = stairsForBase(pal.ceiling.blockId) ?? stairsForBase(pal.wall.blockId)

  if (!stairsId) {
    // Fallback: solid framed-block ribs across the ceiling
    for (let z = origin.z + 2; z < outerMax.z - 1; z += 3) {
      for (let x = origin.x + 1; x < outerMax.x; x++) {
        place(blocks, x, ceilingY, z, pal.framedPillar)
      }
    }
    return
  }

  const stair = (facing: string): ResolvedBlock => ({
    blockId: stairsId,
    blockState: { facing, half: 'top', shape: 'straight', waterlogged: 'false' },
  })

  // Inner ring at y = ceilingY - 1, stairs facing inward, half=top → arch beveling
  const archY = ceilingY - 1
  for (let x = origin.x + 1; x < outerMax.x; x++) {
    place(blocks, x, archY, origin.z + 1,    stair('south'))
    place(blocks, x, archY, outerMax.z - 1,  stair('north'))
  }
  for (let z = origin.z + 2; z < outerMax.z - 1; z++) {
    place(blocks, origin.x + 1,    archY, z, stair('east'))
    place(blocks, outerMax.x - 1,  archY, z, stair('west'))
  }
}

// ── Feature: large_windows (every 3rd wall column, glass at y+1 and y+2) ─────

function addLargeWindows(blocks: BlockEntry[], box: RoomBox) {
  const { origin, outerMax } = box
  const glass: ResolvedBlock = { blockId: 'minecraft:glass', blockState: {} }
  const yLo = origin.y + 1
  const yHi = origin.y + 2
  if (yHi >= outerMax.y) return // need at least 3 inner blocks of vertical clearance

  // North/south walls
  for (let x = origin.x + 1; x < outerMax.x; x++) {
    if (((x - origin.x) % 3) !== 0) continue
    place(blocks, x, yLo, origin.z,    glass)
    place(blocks, x, yHi, origin.z,    glass)
    place(blocks, x, yLo, outerMax.z,  glass)
    place(blocks, x, yHi, outerMax.z,  glass)
  }
  // East/west walls
  for (let z = origin.z + 1; z < outerMax.z; z++) {
    if (((z - origin.z) % 3) !== 0) continue
    place(blocks, origin.x,   yLo, z, glass)
    place(blocks, origin.x,   yHi, z, glass)
    place(blocks, outerMax.x, yLo, z, glass)
    place(blocks, outerMax.x, yHi, z, glass)
  }
}

// ─── Doorway carving between connected rooms ─────────────────────────────────

interface SharedWall {
  axis: 'x' | 'z'
  plane: number
  yMin: number
  span: { min: number; max: number }
}

function findSharedWall(a: RoomBox, b: RoomBox): SharedWall | null {
  const yMin = Math.max(a.origin.y, b.origin.y)
  const yMax = Math.min(a.outerMax.y, b.outerMax.y)
  if (yMax - yMin < 3) return null

  if (a.outerMax.x === b.origin.x || b.outerMax.x === a.origin.x) {
    const plane = a.outerMax.x === b.origin.x ? a.outerMax.x : b.outerMax.x
    const zMin = Math.max(a.origin.z, b.origin.z) + 1
    const zMax = Math.min(a.outerMax.z, b.outerMax.z) - 1
    if (zMax - zMin < 1) return null
    return { axis: 'x', plane, yMin, span: { min: zMin, max: zMax } }
  }
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

function insertUtilityGaps(blocks: BlockEntry[], boxes: RoomBox[]): BlockEntry[] {
  const sorted = [...boxes].sort((a, b) => a.origin.y - b.origin.y)
  const out = [...blocks]
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const lower = sorted[i]
      const upper = sorted[j]
      if (upper.origin.y !== lower.outerMax.y) continue
      const overlapXmin = Math.max(lower.origin.x, upper.origin.x)
      const overlapXmax = Math.min(lower.outerMax.x, upper.outerMax.x)
      const overlapZmin = Math.max(lower.origin.z, upper.origin.z)
      const overlapZmax = Math.min(lower.outerMax.z, upper.outerMax.z)
      if (overlapXmax <= overlapXmin || overlapZmax <= overlapZmin) continue
      const y = lower.outerMax.y
      for (let x = overlapXmin + 1; x < overlapXmax; x++) {
        for (let z = overlapZmin + 1; z < overlapZmax; z++) {
          out.push({
            x, y, z,
            blockId: UTILITY_GAP_MARKER,
            blockState: { type: 'bottom', waterlogged: 'false', utility: 'true' },
          })
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
