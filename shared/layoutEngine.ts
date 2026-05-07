import type { BlockEntry, Blueprint, BlueprintRoom, TemplateModule, Vec3 } from './types.js'
import { deduplicateBlocks, computeMaterialList, carveOpening } from './voxelOps.js'
import { v4 as uuidv4 } from 'uuid'
import { resolveBlock, stairsForBase, UTILITY_GAP_BLOCK_ID, type ResolvedBlock } from './blockRegistry.js'

export const UTILITY_GAP_MARKER = UTILITY_GAP_BLOCK_ID

const MIN_INNER_HEIGHT = 4

// ─── Palette resolution ───────────────────────────────────────────────────────

/** Back-compat helper: returns just the resolved block ID. */
export function resolveMaterial(abstract: string, fallback = 'minecraft:stone_bricks'): string {
  if (!abstract) return fallback
  return resolveBlock(abstract).blockId
}

interface ResolvedPalette {
  wall:          ResolvedBlock
  secondaryWall: ResolvedBlock
  floor:         ResolvedBlock
  ceiling:       ResolvedBlock
  accent:        ResolvedBlock
  frame:         ResolvedBlock
  framedPillar:  ResolvedBlock
  light:         ResolvedBlock
}

function resolvePalette(bp: Blueprint): ResolvedPalette {
  const p = bp.material_palette
  return {
    wall:          resolveBlock(p.primary_wall),
    secondaryWall: resolveBlock(p.secondary_wall),
    floor:         resolveBlock(p.floor),
    ceiling:       resolveBlock(p.ceiling),
    accent:        resolveBlock(p.accent),
    frame:         resolveBlock(p.frame_material),
    framedPillar:  resolveBlock(`framed_${p.frame_material}`),
    light:         resolveBlock('sea_lantern'),
  }
}

function place(blocks: BlockEntry[], x: number, y: number, z: number, rb: ResolvedBlock) {
  const entry: BlockEntry = { x, y, z, blockId: rb.blockId, blockState: { ...rb.blockState } }
  if (rb.nbtData) entry.nbtData = rb.nbtData
  blocks.push(entry)
}

// ─── Room bounding box ────────────────────────────────────────────────────────

interface RoomBox {
  room:      BlueprintRoom
  innerSize: Vec3
  origin:    Vec3       // outer min corner (including wall)
  outerMax:  Vec3       // outer max corner (including wall)
}

function computeBox(room: BlueprintRoom): RoomBox {
  const innerY = Math.max(MIN_INNER_HEIGHT, Math.floor(room.size.y))
  const innerX = Math.max(1, Math.floor(room.size.x))
  const innerZ = Math.max(1, Math.floor(room.size.z))
  const origin = {
    x: Math.floor(room.position.x),
    y: Math.floor(room.position.y),
    z: Math.floor(room.position.z),
  }
  const shape = (room.shape ?? 'rectangle').toLowerCase()

  // Cylinder bounding box is the circle diameter (radius includes the 1-block wall ring).
  if (shape === 'cylinder') {
    const radius = room.radius ?? Math.max(2, Math.floor(Math.min(innerX, innerZ) / 2) + 1)
    return {
      room,
      innerSize: { x: 2 * radius, y: innerY, z: 2 * radius },
      origin,
      outerMax: { x: origin.x + 2 * radius, y: origin.y + innerY + 1, z: origin.z + 2 * radius },
    }
  }

  const outerMax = { x: origin.x + innerX + 1, y: origin.y + innerY + 1, z: origin.z + innerZ + 1 }
  return { room, innerSize: { x: innerX, y: innerY, z: innerZ }, origin, outerMax }
}

// ─── Shape: rectangle (default) ──────────────────────────────────────────────

function buildRectShell(box: RoomBox, pal: ResolvedPalette): BlockEntry[] {
  const { origin, outerMax } = box
  const blocks: BlockEntry[] = []
  for (let x = origin.x; x <= outerMax.x; x++) {
    for (let y = origin.y; y <= outerMax.y; y++) {
      for (let z = origin.z; z <= outerMax.z; z++) {
        const isFloor   = y === origin.y
        const isCeiling = y === outerMax.y
        const isWall    = !isFloor && !isCeiling &&
          (x === origin.x || x === outerMax.x || z === origin.z || z === outerMax.z)
        if (isFloor)        place(blocks, x, y, z, pal.floor)
        else if (isCeiling) place(blocks, x, y, z, pal.ceiling)
        else if (isWall)    place(blocks, x, y, z, pal.wall)
      }
    }
  }
  const cx = origin.x + Math.floor((box.innerSize.x + 1) / 2)
  const cz = origin.z + Math.floor((box.innerSize.z + 1) / 2)
  place(blocks, cx, outerMax.y - 1, cz, pal.light)
  return blocks
}

// ─── Shape: cylinder ─────────────────────────────────────────────────────────

function buildCylinderShell(box: RoomBox, pal: ResolvedPalette): BlockEntry[] {
  const { origin, outerMax, room } = box
  const blocks: BlockEntry[] = []
  const radius = room.radius ?? Math.max(2, Math.floor((outerMax.x - origin.x) / 2))
  const cx = origin.x + radius
  const cz = origin.z + radius
  const r2  = radius * radius
  const ri  = Math.max(0, radius - 1)
  const ri2 = ri * ri

  for (let x = origin.x; x <= origin.x + 2 * radius; x++) {
    for (let z = origin.z; z <= origin.z + 2 * radius; z++) {
      const dx = x - cx, dz = z - cz
      const d2 = dx * dx + dz * dz
      if (d2 > r2) continue
      for (let y = origin.y; y <= outerMax.y; y++) {
        if (y === origin.y)   { place(blocks, x, y, z, pal.floor);   continue }
        if (y === outerMax.y) { place(blocks, x, y, z, pal.ceiling); continue }
        if (d2 > ri2)           place(blocks, x, y, z, pal.wall)
        // hollow interior: no block
      }
    }
  }
  place(blocks, cx, outerMax.y - 1, cz, pal.light)
  return blocks
}

// ─── Shape: column (solid shaft) ─────────────────────────────────────────────

function buildColumnShell(box: RoomBox, pal: ResolvedPalette): BlockEntry[] {
  const { origin, outerMax } = box
  const blocks: BlockEntry[] = []
  for (let x = origin.x; x <= outerMax.x; x++)
    for (let z = origin.z; z <= outerMax.z; z++)
      for (let y = origin.y; y <= outerMax.y; y++)
        place(blocks, x, y, z, pal.wall)
  return blocks
}

// ─── Shape: cross ────────────────────────────────────────────────────────────

function buildCrossShell(box: RoomBox, pal: ResolvedPalette): BlockEntry[] {
  const { origin, outerMax, room } = box
  const armLen = Math.max(0, Math.floor(room.arm_length ?? 3))
  const armW   = Math.max(1, Math.floor(room.arm_width  ?? 3))
  const blocks: BlockEntry[] = []

  // Place a hollow-shell rectangular section; returns its blocks.
  function rectSection(x0: number, x1: number, z0: number, z1: number): BlockEntry[] {
    const out: BlockEntry[] = []
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        for (let y = origin.y; y <= outerMax.y; y++) {
          const isFloor   = y === origin.y
          const isCeiling = y === outerMax.y
          const isWall    = !isFloor && !isCeiling && (x === x0 || x === x1 || z === z0 || z === z1)
          if (isFloor)        place(out, x, y, z, pal.floor)
          else if (isCeiling) place(out, x, y, z, pal.ceiling)
          else if (isWall)    place(out, x, y, z, pal.wall)
        }
      }
    }
    return out
  }

  // Center rectangle
  blocks.push(...rectSection(origin.x, outerMax.x, origin.z, outerMax.z))

  // Arm centerlines (in the perpendicular axis)
  const cxLo = Math.floor((origin.x + outerMax.x) / 2) - Math.floor(armW / 2)
  const cxHi = cxLo + armW - 1
  const czLo = Math.floor((origin.z + outerMax.z) / 2) - Math.floor(armW / 2)
  const czHi = czLo + armW - 1

  if (armLen > 0) {
    blocks.push(...rectSection(outerMax.x,        outerMax.x + armLen, czLo, czHi))
    blocks.push(...rectSection(origin.x - armLen, origin.x,           czLo, czHi))
    blocks.push(...rectSection(cxLo, cxHi, outerMax.z,        outerMax.z + armLen))
    blocks.push(...rectSection(cxLo, cxHi, origin.z - armLen, origin.z))
  }

  // Deduplicate, then punch open the junctions between center and each arm
  // (the shared wall face where center east/west/north/south meets arm interior).
  const junctions = new Set<string>()
  function addJunction(fixX: number | null, fixZ: number | null,
                       rMin: number, rMax: number) {
    for (let r = rMin + 1; r < rMax; r++) {
      for (let y = origin.y + 1; y < outerMax.y; y++) {
        const key = fixX !== null
          ? `${fixX},${y},${r}`
          : `${r},${y},${fixZ}`
        junctions.add(key)
      }
    }
  }
  if (armLen > 0) {
    addJunction(outerMax.x,  null,       czLo, czHi)  // +X arm junction
    addJunction(origin.x,    null,       czLo, czHi)  // -X arm junction
    addJunction(null,        outerMax.z, cxLo, cxHi)  // +Z arm junction
    addJunction(null,        origin.z,   cxLo, cxHi)  // -Z arm junction
  }

  const deduped = deduplicateBlocks(blocks)
  const result  = deduped.filter(b => !junctions.has(`${b.x},${b.y},${b.z}`))

  // Center ceiling light
  const lx = Math.floor((origin.x + outerMax.x) / 2)
  const lz = Math.floor((origin.z + outerMax.z) / 2)
  place(result, lx, outerMax.y - 1, lz, pal.light)
  return result
}

// ─── Shape: octagon ──────────────────────────────────────────────────────────

function buildOctagonShell(box: RoomBox, pal: ResolvedPalette): BlockEntry[] {
  const { origin, outerMax, innerSize, room } = box
  const blocks: BlockEntry[] = []
  const cut = Math.max(1, Math.round((room.radius ?? Math.min(innerSize.x, innerSize.z) * 0.3)))
  const wx  = outerMax.x - origin.x
  const wz  = outerMax.z - origin.z

  function inOct(x: number, z: number): boolean {
    const dx = x - origin.x, dz = z - origin.z
    if (dx + dz < cut)              return false  // SW corner
    if (dx + (wz - dz) < cut)      return false  // NW corner
    if ((wx - dx) + dz < cut)      return false  // SE corner
    if ((wx - dx) + (wz - dz) < cut) return false // NE corner
    return true
  }

  function isPerimeter(x: number, z: number): boolean {
    return x === origin.x || x === outerMax.x || z === origin.z || z === outerMax.z ||
           !inOct(x - 1, z) || !inOct(x + 1, z) || !inOct(x, z - 1) || !inOct(x, z + 1)
  }

  for (let x = origin.x; x <= outerMax.x; x++) {
    for (let z = origin.z; z <= outerMax.z; z++) {
      if (!inOct(x, z)) continue
      for (let y = origin.y; y <= outerMax.y; y++) {
        if (y === origin.y)        { place(blocks, x, y, z, pal.floor);   continue }
        if (y === outerMax.y)      { place(blocks, x, y, z, pal.ceiling); continue }
        if (isPerimeter(x, z))       place(blocks, x, y, z, pal.wall)
        // hollow interior
      }
    }
  }

  const lx = Math.floor((origin.x + outerMax.x) / 2)
  const lz = Math.floor((origin.z + outerMax.z) / 2)
  place(blocks, lx, outerMax.y - 1, lz, pal.light)
  return blocks
}

// ─── Shape: wedge ────────────────────────────────────────────────────────────

function buildWedgeShell(box: RoomBox, pal: ResolvedPalette): BlockEntry[] {
  const { origin, outerMax, room } = box
  const blocks: BlockEntry[] = []
  const dir = (room.direction ?? 'NE').toUpperCase()
  const wx = outerMax.x - origin.x
  const wz = outerMax.z - origin.z

  // Returns true if (x,z) is inside the wedge triangle.
  // Direction = the corner the apex points toward.
  // At the apex corner, only 1 block; at the opposite edge, full width.
  function inWedge(x: number, z: number): boolean {
    if (wz === 0) return true
    const dx = x - origin.x   // 0..wx
    const dz = z - origin.z   // 0..wz
    const t  = dz / wz        // 0 at north, 1 at south
    switch (dir) {
      // NE apex = (maxX, minZ): at north full width, at south only east edge
      case 'NE': return dx >= Math.floor(t * wx)
      // NW apex = (minX, minZ): at north full width, at south only west edge
      case 'NW': return dx <= wx - Math.floor(t * wx)
      // SE apex = (maxX, maxZ): at north only east, at south full width
      case 'SE': return dx >= wx - Math.floor((1 - t) * wx)
      // SW apex = (minX, maxZ): at north only west, at south full width
      case 'SW': return dx <= Math.floor((1 - t) * wx)
      default:   return dx >= Math.floor(t * wx)
    }
  }

  function isWedgeWall(x: number, z: number): boolean {
    return !inWedge(x - 1, z) || !inWedge(x + 1, z) ||
           !inWedge(x, z - 1) || !inWedge(x, z + 1)
  }

  const stairsId = stairsForBase(pal.wall.blockId)

  for (let x = origin.x; x <= outerMax.x; x++) {
    for (let z = origin.z; z <= outerMax.z; z++) {
      if (!inWedge(x, z)) continue
      const onDiag = isWedgeWall(x, z)
      for (let y = origin.y; y <= outerMax.y; y++) {
        if (y === origin.y)        { place(blocks, x, y, z, pal.floor);   continue }
        if (y === outerMax.y)      { place(blocks, x, y, z, pal.ceiling); continue }
        if (!onDiag) continue  // hollow interior
        // Diagonal face: use stairs for the angled look if available
        if (onDiag && stairsId &&
            x !== origin.x && x !== outerMax.x && z !== origin.z && z !== outerMax.z) {
          // Determine stair facing from which neighbor is outside the wedge
          let facing = 'north'
          if      (!inWedge(x - 1, z)) facing = 'east'
          else if (!inWedge(x + 1, z)) facing = 'west'
          else if (!inWedge(x, z - 1)) facing = 'south'
          else if (!inWedge(x, z + 1)) facing = 'north'
          place(blocks, x, y, z, {
            blockId: stairsId,
            blockState: { facing, half: 'bottom', shape: 'straight', waterlogged: 'false' },
          })
        } else {
          place(blocks, x, y, z, pal.wall)
        }
      }
    }
  }

  // Light near base of apex
  const lightX = dir.includes('E') ? origin.x + Math.floor(wx * 0.6) : origin.x + Math.floor(wx * 0.4)
  const lightZ = dir.includes('S') ? origin.z + Math.floor(wz * 0.6) : origin.z + Math.floor(wz * 0.4)
  place(blocks, lightX, outerMax.y - 1, lightZ, pal.light)
  return blocks
}

// ─── Room shell dispatcher ────────────────────────────────────────────────────

function buildRoomShell(box: RoomBox, pal: ResolvedPalette): BlockEntry[] {
  const shape = (box.room.shape ?? 'rectangle').toLowerCase()
  let blocks: BlockEntry[]

  switch (shape) {
    case 'cylinder': blocks = buildCylinderShell(box, pal); break
    case 'column':   blocks = buildColumnShell(box, pal);   break
    case 'cross':    blocks = buildCrossShell(box, pal);    break
    case 'octagon':  blocks = buildOctagonShell(box, pal);  break
    case 'wedge':    blocks = buildWedgeShell(box, pal);    break
    default:         blocks = buildRectShell(box, pal)
  }

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

// ─── Features ────────────────────────────────────────────────────────────────

function addCornerPillars(blocks: BlockEntry[], box: RoomBox, framed: ResolvedBlock) {
  const { origin, outerMax } = box
  for (const [x, z] of [
    [origin.x + 1, origin.z + 1], [outerMax.x - 1, origin.z + 1],
    [origin.x + 1, outerMax.z - 1], [outerMax.x - 1, outerMax.z - 1],
  ] as [number, number][]) {
    for (let y = origin.y + 1; y < outerMax.y; y++) place(blocks, x, y, z, framed)
  }
}

function addArchedCeiling(blocks: BlockEntry[], box: RoomBox, pal: ResolvedPalette) {
  const { origin, outerMax } = box
  const ceilY    = outerMax.y - 1
  const stairsId = stairsForBase(pal.ceiling.blockId) ?? stairsForBase(pal.wall.blockId)

  if (!stairsId) {
    for (let z = origin.z + 2; z < outerMax.z - 1; z += 3)
      for (let x = origin.x + 1; x < outerMax.x; x++)
        place(blocks, x, ceilY, z, pal.framedPillar)
    return
  }

  const stair = (facing: string): ResolvedBlock => ({
    blockId: stairsId,
    blockState: { facing, half: 'top', shape: 'straight', waterlogged: 'false' },
  })
  const archY = ceilY - 1
  for (let x = origin.x + 1; x < outerMax.x; x++) {
    place(blocks, x, archY, origin.z + 1,   stair('south'))
    place(blocks, x, archY, outerMax.z - 1, stair('north'))
  }
  for (let z = origin.z + 2; z < outerMax.z - 1; z++) {
    place(blocks, origin.x + 1,   archY, z, stair('east'))
    place(blocks, outerMax.x - 1, archY, z, stair('west'))
  }
}

function addLargeWindows(blocks: BlockEntry[], box: RoomBox) {
  const { origin, outerMax } = box
  const glass: ResolvedBlock = { blockId: 'minecraft:glass', blockState: {} }
  const yLo = origin.y + 1, yHi = origin.y + 2
  if (yHi >= outerMax.y) return

  for (let x = origin.x + 1; x < outerMax.x; x++) {
    if (((x - origin.x) % 3) !== 0) continue
    place(blocks, x, yLo, origin.z,   glass)
    place(blocks, x, yHi, origin.z,   glass)
    place(blocks, x, yLo, outerMax.z, glass)
    place(blocks, x, yHi, outerMax.z, glass)
  }
  for (let z = origin.z + 1; z < outerMax.z; z++) {
    if (((z - origin.z) % 3) !== 0) continue
    place(blocks, origin.x,   yLo, z, glass)
    place(blocks, origin.x,   yHi, z, glass)
    place(blocks, outerMax.x, yLo, z, glass)
    place(blocks, outerMax.x, yHi, z, glass)
  }
}

// ─── Connectivity helpers ─────────────────────────────────────────────────────

interface SharedWall {
  axis:  'x' | 'z'
  plane: number
  yMin:  number
  span:  { min: number; max: number }
}

function findSharedWall(a: RoomBox, b: RoomBox): SharedWall | null {
  const yMin = Math.max(a.origin.y, b.origin.y)
  const yMax = Math.min(a.outerMax.y, b.outerMax.y)
  if (yMax - yMin < 3) return null

  if (a.outerMax.x === b.origin.x || b.outerMax.x === a.origin.x) {
    const plane = a.outerMax.x === b.origin.x ? a.outerMax.x : b.outerMax.x
    const zMin  = Math.max(a.origin.z, b.origin.z) + 1
    const zMax  = Math.min(a.outerMax.z, b.outerMax.z) - 1
    if (zMax - zMin < 1) return null
    return { axis: 'x', plane, yMin, span: { min: zMin, max: zMax } }
  }
  if (a.outerMax.z === b.origin.z || b.outerMax.z === a.origin.z) {
    const plane = a.outerMax.z === b.origin.z ? a.outerMax.z : b.outerMax.z
    const xMin  = Math.max(a.origin.x, b.origin.x) + 1
    const xMax  = Math.min(a.outerMax.x, b.outerMax.x) - 1
    if (xMax - xMin < 1) return null
    return { axis: 'z', plane, yMin, span: { min: xMin, max: xMax } }
  }
  return null
}

function carveDoorway(blocks: BlockEntry[], wall: SharedWall): BlockEntry[] {
  const center   = Math.floor((wall.span.min + wall.span.max) / 2)
  const minOther = Math.max(wall.span.min, center - 1)
  const yFloor   = wall.yMin + 1
  const facing   = wall.axis === 'x' ? 'east' : 'south'
  const pos: Vec3 = wall.axis === 'x'
    ? { x: wall.plane, y: yFloor, z: minOther }
    : { x: minOther,   y: yFloor, z: wall.plane }
  return carveOpening(blocks, pos, facing, 2, 3)
}

// Shaft connection: carve a 3×3 hole through the shared ceiling/floor of stacked rooms.
function carveShaftOpening(blocks: BlockEntry[], a: RoomBox, b: RoomBox): BlockEntry[] {
  const lower = a.origin.y <= b.origin.y ? a : b
  const upper = a.origin.y <= b.origin.y ? b : a
  // Only carve if rooms are directly adjacent vertically
  if (upper.origin.y !== lower.outerMax.y) return blocks

  const xMin = Math.max(lower.origin.x, upper.origin.x) + 1
  const xMax = Math.min(lower.outerMax.x, upper.outerMax.x) - 1
  const zMin = Math.max(lower.origin.z, upper.origin.z) + 1
  const zMax = Math.min(lower.outerMax.z, upper.outerMax.z) - 1
  if (xMax < xMin || zMax < zMin) return blocks

  const cx = Math.floor((xMin + xMax) / 2)
  const cz = Math.floor((zMin + zMax) / 2)
  const shaftY = lower.outerMax.y   // shared ceiling=floor layer

  const remove = new Set<string>()
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++)
      remove.add(`${cx + dx},${shaftY},${cz + dz}`)

  return blocks.filter(b => !remove.has(`${b.x},${b.y},${b.z}`))
}

// Bridge connection: 3-wide open walkway at the ceiling of the higher room.
function buildBridge(a: RoomBox, b: RoomBox, pal: ResolvedPalette): BlockEntry[] {
  const bridgeY = Math.max(a.outerMax.y, b.outerMax.y)
  const blocks: BlockEntry[] = []

  function walkway(xStart: number, xEnd: number, zStart: number, zEnd: number) {
    for (let x = xStart; x <= xEnd; x++) {
      for (let z = zStart; z <= zEnd; z++) {
        place(blocks, x, bridgeY, z, pal.floor)
        // Parapets: 1-block wall on the sides of the 3-wide walkway
      }
    }
    // Identify which axis the bridge runs along and add parapets on the sides
    if (xStart === xEnd) {
      // runs along Z — parapets at x±1
      for (let z = zStart; z <= zEnd; z++) {
        place(blocks, xStart - 1, bridgeY + 1, z, pal.wall)
        place(blocks, xStart + 1, bridgeY + 1, z, pal.wall)
      }
    } else {
      // runs along X — parapets at z±1
      for (let x = xStart; x <= xEnd; x++) {
        place(blocks, x, bridgeY + 1, zStart - 1, pal.wall)
        place(blocks, x, bridgeY + 1, zStart + 1, pal.wall)
      }
    }
  }

  if (a.outerMax.x <= b.origin.x) {
    const z = Math.floor((Math.max(a.origin.z, b.origin.z) + Math.min(a.outerMax.z, b.outerMax.z)) / 2)
    walkway(a.outerMax.x, b.origin.x, z, z)
  } else if (b.outerMax.x <= a.origin.x) {
    const z = Math.floor((Math.max(a.origin.z, b.origin.z) + Math.min(a.outerMax.z, b.outerMax.z)) / 2)
    walkway(b.outerMax.x, a.origin.x, z, z)
  } else if (a.outerMax.z <= b.origin.z) {
    const x = Math.floor((Math.max(a.origin.x, b.origin.x) + Math.min(a.outerMax.x, b.outerMax.x)) / 2)
    walkway(x, x, a.outerMax.z, b.origin.z)
  } else if (b.outerMax.z <= a.origin.z) {
    const x = Math.floor((Math.max(a.origin.x, b.origin.x) + Math.min(a.outerMax.x, b.outerMax.x)) / 2)
    walkway(x, x, b.outerMax.z, a.origin.z)
  }
  return blocks
}

// Corridor: connect non-adjacent rooms with a secondary-wall hallway.
function buildCorridor(a: RoomBox, b: RoomBox, pal: ResolvedPalette): BlockEntry[] {
  const blocks: BlockEntry[] = []
  const yBase = Math.max(a.origin.y, b.origin.y)
  const yTop  = yBase + 4 + 1   // 4 inner (MIN_INNER_HEIGHT) + floor + ceiling

  function hallway(x0: number, x1: number, z0: number, z1: number) {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        for (let y = yBase; y <= yTop; y++) {
          const isF = y === yBase, isC = y === yTop
          const isW = !isF && !isC && (x === x0 || x === x1 || z === z0 || z === z1)
          if (isF)       place(blocks, x, y, z, pal.floor)
          else if (isC)  place(blocks, x, y, z, pal.ceiling)
          else if (isW)  place(blocks, x, y, z, pal.secondaryWall)
        }
      }
    }
  }

  if (a.outerMax.x < b.origin.x) {
    const zC = Math.floor((Math.max(a.origin.z, b.origin.z) + Math.min(a.outerMax.z, b.outerMax.z)) / 2)
    hallway(a.outerMax.x, b.origin.x, zC - 1, zC + 1)
  } else if (b.outerMax.x < a.origin.x) {
    const zC = Math.floor((Math.max(a.origin.z, b.origin.z) + Math.min(a.outerMax.z, b.outerMax.z)) / 2)
    hallway(b.outerMax.x, a.origin.x, zC - 1, zC + 1)
  } else if (a.outerMax.z < b.origin.z) {
    const xC = Math.floor((Math.max(a.origin.x, b.origin.x) + Math.min(a.outerMax.x, b.outerMax.x)) / 2)
    hallway(xC - 1, xC + 1, a.outerMax.z, b.origin.z)
  } else if (b.outerMax.z < a.origin.z) {
    const xC = Math.floor((Math.max(a.origin.x, b.origin.x) + Math.min(a.outerMax.x, b.outerMax.x)) / 2)
    hallway(xC - 1, xC + 1, b.outerMax.z, a.origin.z)
  }
  return blocks
}

// ─── Utility gap layers ───────────────────────────────────────────────────────

function insertUtilityGaps(blocks: BlockEntry[], boxes: RoomBox[]): BlockEntry[] {
  const sorted = [...boxes].sort((a, b) => a.origin.y - b.origin.y)
  const out = [...blocks]
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const lower = sorted[i], upper = sorted[j]
      if (upper.origin.y !== lower.outerMax.y) continue
      const xMin = Math.max(lower.origin.x, upper.origin.x)
      const xMax = Math.min(lower.outerMax.x, upper.outerMax.x)
      const zMin = Math.max(lower.origin.z, upper.origin.z)
      const zMax = Math.min(lower.outerMax.z, upper.outerMax.z)
      if (xMax <= xMin || zMax <= zMin) continue
      const y = lower.outerMax.y
      for (let x = xMin + 1; x < xMax; x++)
        for (let z = zMin + 1; z < zMax; z++)
          out.push({ x, y, z, blockId: UTILITY_GAP_MARKER,
                     blockState: { type: 'bottom', waterlogged: 'false', utility: 'true' } })
    }
  }
  return out
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export interface LayoutResult {
  blocks:     BlockEntry[]
  dimensions: Vec3
  origin:     Vec3
}

export function layoutBlueprint(blueprint: Blueprint): LayoutResult {
  const pal   = resolvePalette(blueprint)
  const boxes = blueprint.rooms.map(computeBox)

  let blocks: BlockEntry[] = []
  for (const box of boxes) blocks = blocks.concat(buildRoomShell(box, pal))

  const seen  = new Set<string>()
  const byId  = new Map(boxes.map(b => [b.room.id, b]))

  for (const a of boxes) {
    for (const targetId of a.room.connects_to ?? []) {
      const b = byId.get(targetId)
      if (!b) continue
      const pairKey = [a.room.id, b.room.id].sort().join('::')
      if (seen.has(pairKey)) continue
      seen.add(pairKey)

      // Resolve connection type from either end of the connection
      const connType = a.room.connect_types?.[targetId]
                    ?? b.room.connect_types?.[a.room.id]
                    ?? 'doorway'

      if (connType === 'shaft') {
        blocks = carveShaftOpening(blocks, a, b)
      } else if (connType === 'bridge') {
        blocks = blocks.concat(buildBridge(a, b, pal))
      } else {
        const wall = findSharedWall(a, b)
        if (wall) {
          blocks = carveDoorway(blocks, wall)
        } else {
          blocks = blocks.concat(buildCorridor(a, b, pal))
        }
      }
    }
  }

  if (blueprint.utility_gap) blocks = insertUtilityGaps(blocks, boxes)

  blocks = deduplicateBlocks(blocks)

  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (const b of blocks) {
    if (b.x < minX) minX = b.x; if (b.x > maxX) maxX = b.x
    if (b.y < minY) minY = b.y; if (b.y > maxY) maxY = b.y
    if (b.z < minZ) minZ = b.z; if (b.z > maxZ) maxZ = b.z
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
  sourceImage?: string,
): Omit<TemplateModule, 'id' | 'createdAt' | 'updatedAt'> {
  const layout      = layoutBlueprint(blueprint)
  const materialList = computeMaterialList(layout.blocks)
  const promptTag   = prompt ? ` — ${prompt.slice(0, 40)}` : ''
  const name        = `${blueprint.theme || 'Structure'}${promptTag}`.trim()

  return {
    name,
    category:  blueprint.rooms[0]?.type ?? 'custom',
    tags: ['ai-generated', blueprint.theme, ...blueprint.rooms.map(r => r.type)].filter(Boolean) as string[],
    dimensions: layout.dimensions,
    origin:     layout.origin,
    anchors: blueprint.rooms.map(r => ({
      id: uuidv4(), name: r.label || r.id,
      position: r.position, facing: 'north' as const, purpose: r.type,
    })),
    connectionPorts: [],
    blocks: layout.blocks,
    materialList,
    styleProfile: {
      name:          blueprint.theme,
      keywords:      blueprint.style_notes.split(/[,\s]+/).filter(Boolean),
      primaryBlocks: [resolveMaterial(blueprint.material_palette.primary_wall)],
      accentBlocks:  [resolveMaterial(blueprint.material_palette.accent)],
      floorBlocks:   [resolveMaterial(blueprint.material_palette.floor)],
      ceilingBlocks: [resolveMaterial(blueprint.material_palette.ceiling)],
    },
    sourceImages: sourceImage ? [sourceImage] : [],
    notes:        blueprint.style_notes,
    projectId,
    sourcePrompt: prompt,
    exportStatus: 'not_exported',
    compatibilityNotes: '',
    relatedModuleIds: [],
  }
}
