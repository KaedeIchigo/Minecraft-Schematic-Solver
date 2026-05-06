import type { BlockEntry, Vec3, MaterialEntry } from './types.js'

// =============================================================================
// Bounds
// =============================================================================

export interface Bounds {
  min: Vec3
  max: Vec3
  dimensions: Vec3
}

export function computeBounds(blocks: BlockEntry[]): Bounds {
  if (blocks.length === 0) {
    return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 }, dimensions: { x: 1, y: 1, z: 1 } }
  }
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
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    dimensions: { x: maxX - minX + 1, y: maxY - minY + 1, z: maxZ - minZ + 1 },
  }
}

// =============================================================================
// Translate
// =============================================================================

export function translate(blocks: BlockEntry[], delta: Vec3): BlockEntry[] {
  return blocks.map(b => ({ ...b, x: b.x + delta.x, y: b.y + delta.y, z: b.z + delta.z }))
}

// =============================================================================
// Normalize — shift so min corner is at (0,0,0)
// =============================================================================

export function normalizeToOrigin(blocks: BlockEntry[]): BlockEntry[] {
  if (blocks.length === 0) return []
  const { min } = computeBounds(blocks)
  return translate(blocks, { x: -min.x, y: -min.y, z: -min.z })
}

// =============================================================================
// Rotate 90° clockwise around the Y axis (looking down)
// New position: (x, y, z) → (maxZ - z, y, x)
// Applied n times for 0/90/180/270 degrees
// =============================================================================

export function rotate90(blocks: BlockEntry[], times: number = 1): BlockEntry[] {
  let result = blocks
  for (let t = 0; t < (times % 4); t++) {
    const { max } = computeBounds(result)
    result = result.map(b => ({
      ...b,
      x: max.z - b.z,
      z: b.x,
      blockState: rotateBlockState(b.blockState, 90),
    }))
  }
  return result
}

// Rotate directional block state properties
function rotateBlockState(state: Record<string, string>, degrees: number): Record<string, string> {
  const facingMap90: Record<string, string> = {
    north: 'east', east: 'south', south: 'west', west: 'north',
    up: 'up', down: 'down',
  }
  const rotated: Record<string, string> = {}
  for (const [k, v] of Object.entries(state)) {
    if (k === 'facing' || k === 'face') {
      let cur = v
      const times = (degrees / 90) % 4
      for (let i = 0; i < times; i++) cur = facingMap90[cur] ?? cur
      rotated[k] = cur
    } else {
      rotated[k] = v
    }
  }
  return rotated
}

// =============================================================================
// Mirror
// =============================================================================

export function mirrorX(blocks: BlockEntry[]): BlockEntry[] {
  const { max } = computeBounds(blocks)
  return blocks.map(b => ({
    ...b,
    x: max.x - b.x,
    blockState: flipFacing(b.blockState, 'x'),
  }))
}

export function mirrorZ(blocks: BlockEntry[]): BlockEntry[] {
  const { max } = computeBounds(blocks)
  return blocks.map(b => ({
    ...b,
    z: max.z - b.z,
    blockState: flipFacing(b.blockState, 'z'),
  }))
}

function flipFacing(state: Record<string, string>, axis: 'x' | 'z'): Record<string, string> {
  const flipX: Record<string, string> = { east: 'west', west: 'east' }
  const flipZ: Record<string, string> = { north: 'south', south: 'north' }
  const map = axis === 'x' ? flipX : flipZ
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(state)) {
    result[k] = (k === 'facing' || k === 'face') ? (map[v] ?? v) : v
  }
  return result
}

// =============================================================================
// Fill / hollow
// =============================================================================

export function fillCuboid(
  min: Vec3, max: Vec3, blockId: string, blockState: Record<string, string> = {}
): BlockEntry[] {
  const blocks: BlockEntry[] = []
  for (let x = min.x; x <= max.x; x++)
    for (let y = min.y; y <= max.y; y++)
      for (let z = min.z; z <= max.z; z++)
        blocks.push({ x, y, z, blockId, blockState })
  return blocks
}

export function hollowCuboid(
  min: Vec3, max: Vec3, wallBlockId: string, wallState: Record<string, string> = {},
  airBlockId = 'minecraft:air'
): BlockEntry[] {
  const blocks: BlockEntry[] = []
  for (let x = min.x; x <= max.x; x++) {
    for (let y = min.y; y <= max.y; y++) {
      for (let z = min.z; z <= max.z; z++) {
        const onEdge = x === min.x || x === max.x || y === min.y || y === max.y || z === min.z || z === max.z
        blocks.push({ x, y, z, blockId: onEdge ? wallBlockId : airBlockId, blockState: onEdge ? wallState : {} })
      }
    }
  }
  return blocks
}

// =============================================================================
// Crop to bounds — remove air outside the used volume
// =============================================================================

export function cropToBounds(blocks: BlockEntry[], airIds = new Set(['minecraft:air', 'minecraft:cave_air'])): BlockEntry[] {
  return blocks.filter(b => !airIds.has(b.blockId))
}

// =============================================================================
// Replace all blocks of a type
// =============================================================================

export function replaceAll(blocks: BlockEntry[], fromId: string, toId: string, toState: Record<string, string> = {}): BlockEntry[] {
  return blocks.map(b => b.blockId === fromId ? { ...b, blockId: toId, blockState: toState } : b)
}

// =============================================================================
// Material list
// =============================================================================

export function computeMaterialList(blocks: BlockEntry[], airIds = new Set(['minecraft:air', 'minecraft:cave_air'])): MaterialEntry[] {
  const counts = new Map<string, number>()
  for (const b of blocks) {
    if (airIds.has(b.blockId)) continue
    counts.set(b.blockId, (counts.get(b.blockId) ?? 0) + 1)
  }
  const list: MaterialEntry[] = []
  for (const [blockId, count] of counts) {
    list.push({ blockId, displayName: formatDisplayName(blockId), count })
  }
  return list.sort((a, b) => b.count - a.count)
}

function formatDisplayName(blockId: string): string {
  const parts = blockId.split(':')
  const name = parts[parts.length - 1] ?? blockId
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// =============================================================================
// Collision detection between two placed modules
// =============================================================================

export function detectCollision(
  blocksA: BlockEntry[], originA: Vec3,
  blocksB: BlockEntry[], originB: Vec3,
  airIds = new Set(['minecraft:air', 'minecraft:cave_air'])
): number {
  const setA = new Set<string>()
  for (const b of blocksA) {
    if (airIds.has(b.blockId)) continue
    setA.add(`${b.x + originA.x},${b.y + originA.y},${b.z + originA.z}`)
  }
  let count = 0
  for (const b of blocksB) {
    if (airIds.has(b.blockId)) continue
    if (setA.has(`${b.x + originB.x},${b.y + originB.y},${b.z + originB.z}`)) count++
  }
  return count
}

// =============================================================================
// Deduplicate blocks — last writer wins for same position
// =============================================================================

export function deduplicateBlocks(blocks: BlockEntry[]): BlockEntry[] {
  const map = new Map<string, BlockEntry>()
  for (const b of blocks) map.set(`${b.x},${b.y},${b.z}`, b)
  return Array.from(map.values())
}

// =============================================================================
// Build a room shell (walls + floor + ceiling, hollow interior)
// =============================================================================

export interface RoomSpec {
  width: number   // X
  height: number  // Y
  depth: number   // Z
  wallBlock: string
  wallState?: Record<string, string>
  floorBlock: string
  floorState?: Record<string, string>
  ceilingBlock?: string
  ceilingState?: Record<string, string>
  lightBlock?: string
  lightSpacing?: number
}

export function buildRoom(spec: RoomSpec): BlockEntry[] {
  const { width, height, depth, wallBlock, floorBlock } = spec
  const ceilingBlock = spec.ceilingBlock ?? wallBlock
  const blocks: BlockEntry[] = []
  const ws = spec.wallState ?? {}
  const fs = spec.floorState ?? {}
  const cs = spec.ceilingState ?? {}

  // Floor (y=0)
  for (let x = 0; x < width; x++)
    for (let z = 0; z < depth; z++)
      blocks.push({ x, y: 0, z, blockId: floorBlock, blockState: fs })

  // Ceiling (y=height-1)
  for (let x = 0; x < width; x++)
    for (let z = 0; z < depth; z++)
      blocks.push({ x, y: height - 1, z, blockId: ceilingBlock, blockState: cs })

  // Walls
  for (let y = 1; y < height - 1; y++) {
    for (let x = 0; x < width; x++) {
      blocks.push({ x, y, z: 0, blockId: wallBlock, blockState: ws })
      blocks.push({ x, y, z: depth - 1, blockId: wallBlock, blockState: ws })
    }
    for (let z = 1; z < depth - 1; z++) {
      blocks.push({ x: 0, y, z, blockId: wallBlock, blockState: ws })
      blocks.push({ x: width - 1, y, z, blockId: wallBlock, blockState: ws })
    }
  }

  // Lighting
  if (spec.lightBlock && spec.lightSpacing) {
    const spacing = spec.lightSpacing
    for (let x = 1; x < width - 1; x += spacing) {
      for (let z = 1; z < depth - 1; z += spacing) {
        blocks.push({ x, y: height - 2, z, blockId: spec.lightBlock, blockState: {} })
      }
    }
  }

  return deduplicateBlocks(blocks)
}

// =============================================================================
// Doorway / opening carver — removes wall blocks to create an opening
// =============================================================================

export function carveOpening(
  blocks: BlockEntry[],
  position: Vec3,
  facing: 'north' | 'south' | 'east' | 'west',
  width: number,
  height: number
): BlockEntry[] {
  const toRemove = new Set<string>()

  if (facing === 'north' || facing === 'south') {
    const z = position.z
    for (let dx = 0; dx < width; dx++)
      for (let dy = 0; dy < height; dy++)
        toRemove.add(`${position.x + dx},${position.y + dy},${z}`)
  } else {
    const x = position.x
    for (let dz = 0; dz < width; dz++)
      for (let dy = 0; dy < height; dy++)
        toRemove.add(`${x},${position.y + dy},${position.z + dz}`)
  }

  return blocks.filter(b => !toRemove.has(`${b.x},${b.y},${b.z}`))
}
