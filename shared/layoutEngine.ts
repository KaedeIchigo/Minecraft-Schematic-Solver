import type { BlockEntry, Blueprint, BlueprintRoom, RoomBound, TemplateModule, Vec3 } from './types.js'
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

  // Allow ±1 gap so near-adjacent rooms (1 block apart) still get a doorway
  if (Math.abs(a.outerMax.x - b.origin.x) <= 1 || Math.abs(b.outerMax.x - a.origin.x) <= 1) {
    const plane = Math.abs(a.outerMax.x - b.origin.x) <= 1 ? a.outerMax.x : b.outerMax.x
    const zMin  = Math.max(a.origin.z, b.origin.z) + 1
    const zMax  = Math.min(a.outerMax.z, b.outerMax.z) - 1
    if (zMax - zMin < 1) return null
    return { axis: 'x', plane, yMin, span: { min: zMin, max: zMax } }
  }
  if (Math.abs(a.outerMax.z - b.origin.z) <= 1 || Math.abs(b.outerMax.z - a.origin.z) <= 1) {
    const plane = Math.abs(a.outerMax.z - b.origin.z) <= 1 ? a.outerMax.z : b.outerMax.z
    const xMin  = Math.max(a.origin.x, b.origin.x) + 1
    const xMax  = Math.min(a.outerMax.x, b.outerMax.x) - 1
    if (xMax - xMin < 1) return null
    return { axis: 'z', plane, yMin, span: { min: xMin, max: xMax } }
  }
  return null
}

function carveDoorway(blocks: BlockEntry[], wall: SharedWall): BlockEntry[] {
  const center   = Math.floor((wall.span.min + wall.span.max) / 2)
  // 3-wide opening centred on the shared wall span
  const minOther = Math.max(wall.span.min, center - 1)
  const yFloor   = wall.yMin + 1
  const facing   = wall.axis === 'x' ? 'east' : 'south'
  const pos: Vec3 = wall.axis === 'x'
    ? { x: wall.plane, y: yFloor, z: minOther }
    : { x: minOther,   y: yFloor, z: wall.plane }
  return carveOpening(blocks, pos, facing, 3, 4)
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

// Bridge connection: 3-wide platform at (ceiling - 2) with iron_bars railings.
function buildBridge(a: RoomBox, b: RoomBox, pal: ResolvedPalette): BlockEntry[] {
  // Place bridge floor 2 below the higher ceiling so it's accessible from inside
  const bridgeY = Math.max(a.outerMax.y, b.outerMax.y) - 2
  const blocks: BlockEntry[] = []
  const ironBars = resolveBlock('iron_bars')

  function walkway(xStart: number, xEnd: number, zStart: number, zEnd: number) {
    const X0 = Math.min(xStart, xEnd), X1 = Math.max(xStart, xEnd)
    const Z0 = Math.min(zStart, zEnd), Z1 = Math.max(zStart, zEnd)
    const runsAlongZ = (X0 === X1)

    for (let x = X0; x <= X1; x++)
      for (let z = Z0; z <= Z1; z++)
        place(blocks, x, bridgeY, z, pal.floor)

    // iron_bars railings on the two long sides
    if (runsAlongZ) {
      for (let z = Z0; z <= Z1; z++) {
        place(blocks, X0 - 1, bridgeY + 1, z, ironBars)
        place(blocks, X1 + 1, bridgeY + 1, z, ironBars)
      }
    } else {
      for (let x = X0; x <= X1; x++) {
        place(blocks, x, bridgeY + 1, Z0 - 1, ironBars)
        place(blocks, x, bridgeY + 1, Z1 + 1, ironBars)
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

// Corridor: connect non-adjacent rooms with a secondary-wall 3×4 (w×h) hallway.
// Uses an L-shaped path (X segment first, then Z) when rooms are diagonally offset.
// Also carves 3×4 openings into the room walls at both connection points.
function buildCorridor(a: RoomBox, b: RoomBox, pal: ResolvedPalette): { newBlocks: BlockEntry[]; removeKeys: Set<string> } {
  const newBlocks: BlockEntry[] = []
  const removeKeys = new Set<string>()  // positions to delete from existing blocks
  const yBase = Math.max(a.origin.y, b.origin.y)
  const yTop  = yBase + 5   // floor + 4 inner + ceiling

  function tube(x0: number, x1: number, z0: number, z1: number) {
    const X0 = Math.min(x0, x1), X1 = Math.max(x0, x1)
    const Z0 = Math.min(z0, z1), Z1 = Math.max(z0, z1)
    for (let x = X0; x <= X1; x++) {
      for (let z = Z0; z <= Z1; z++) {
        for (let y = yBase; y <= yTop; y++) {
          const isF = y === yBase, isC = y === yTop
          const isW = !isF && !isC && (x === X0 || x === X1 || z === Z0 || z === Z1)
          if (isF)      place(newBlocks, x, y, z, pal.floor)
          else if (isC) place(newBlocks, x, y, z, pal.ceiling)
          else if (isW) place(newBlocks, x, y, z, pal.secondaryWall)
        }
      }
    }
  }

  // Carve a 3-wide × 4-tall opening through room wall into existing blocks
  function punchWall(wallX: number, wallZ: number, axis: 'x' | 'z') {
    for (let dy = 1; dy <= 4; dy++) {
      for (let ds = -1; ds <= 1; ds++) {
        const px = axis === 'x' ? wallX : wallX + ds
        const pz = axis === 'z' ? wallZ : wallZ + ds
        removeKeys.add(`${px},${yBase + dy},${pz}`)
      }
    }
  }

  const azC = Math.floor((a.origin.z + a.outerMax.z) / 2)
  const bzC = Math.floor((b.origin.z + b.outerMax.z) / 2)
  const axC = Math.floor((a.origin.x + a.outerMax.x) / 2)
  const bxC = Math.floor((b.origin.x + b.outerMax.x) / 2)

  if (a.outerMax.x < b.origin.x) {
    // A is west of B — go X first, then Z
    tube(a.outerMax.x, b.origin.x, azC - 1, azC + 1)
    punchWall(a.outerMax.x, azC, 'x')
    if (Math.abs(azC - bzC) > 2) {
      tube(b.origin.x - 1, b.origin.x + 1, azC, bzC)
    }
    punchWall(b.origin.x, bzC, 'x')
  } else if (b.outerMax.x < a.origin.x) {
    tube(b.outerMax.x, a.origin.x, bzC - 1, bzC + 1)
    punchWall(b.outerMax.x, bzC, 'x')
    if (Math.abs(azC - bzC) > 2) {
      tube(a.origin.x - 1, a.origin.x + 1, azC, bzC)
    }
    punchWall(a.origin.x, azC, 'x')
  } else if (a.outerMax.z < b.origin.z) {
    tube(axC - 1, axC + 1, a.outerMax.z, b.origin.z)
    punchWall(axC, a.outerMax.z, 'z')
    if (Math.abs(axC - bxC) > 2) {
      tube(axC, bxC, b.origin.z - 1, b.origin.z + 1)
    }
    punchWall(bxC, b.origin.z, 'z')
  } else if (b.outerMax.z < a.origin.z) {
    tube(bxC - 1, bxC + 1, b.outerMax.z, a.origin.z)
    punchWall(bxC, b.outerMax.z, 'z')
    if (Math.abs(axC - bxC) > 2) {
      tube(axC, bxC, a.origin.z - 1, a.origin.z + 1)
    }
    punchWall(axC, a.origin.z, 'z')
  }

  return { newBlocks, removeKeys }
}

// ─── Interior decoration ──────────────────────────────────────────────────────
// Runs after shell generation for each room. Adds detail blocks inside the
// shell using last-writer-wins semantics (deduplicateBlocks at the end).

function interiorDecorate(box: RoomBox, pal: ResolvedPalette): BlockEntry[] {
  const blocks: BlockEntry[] = []
  const { origin, outerMax, room } = box
  const features = new Set(room.features.map(f => f.toLowerCase()))
  const type = (room.type ?? 'room').toLowerCase()

  const x0 = origin.x + 1, x1 = outerMax.x - 1
  const y0 = origin.y + 1, y1 = outerMax.y - 1
  const z0 = origin.z + 1, z1 = outerMax.z - 1

  // Too cramped to decorate
  if (x0 > x1 || y0 > y1 || z0 > z1) return blocks

  const cx = Math.floor((origin.x + outerMax.x) / 2)
  const cz = Math.floor((origin.z + outerMax.z) / 2)
  const framedBlackstone = resolveBlock('framed_blackstone')

  // ── Universal: floor border ─────────────────────────────────────────────
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      if (x === x0 || x === x1 || z === z0 || z === z1) {
        place(blocks, x, origin.y, z, pal.accent)
      }
    }
  }

  // ── Universal: wall paneling (accent every 4 blocks, 2 tall at mid-wall) ─
  const yMid = origin.y + Math.floor((outerMax.y - origin.y) / 2)
  if (yMid >= y0 && yMid + 1 <= y1) {
    // N and S walls
    for (let x = x0; x <= x1; x++) {
      if ((x - x0) % 4 === 0) {
        place(blocks, x, yMid,     origin.z,   pal.accent)
        place(blocks, x, yMid + 1, origin.z,   pal.accent)
        place(blocks, x, yMid,     outerMax.z, pal.accent)
        place(blocks, x, yMid + 1, outerMax.z, pal.accent)
      }
    }
    // E and W walls
    for (let z = z0; z <= z1; z++) {
      if ((z - z0) % 4 === 0) {
        place(blocks, origin.x,   yMid,     z, pal.accent)
        place(blocks, origin.x,   yMid + 1, z, pal.accent)
        place(blocks, outerMax.x, yMid,     z, pal.accent)
        place(blocks, outerMax.x, yMid + 1, z, pal.accent)
      }
    }
  }

  // ── Universal: corner pillars ───────────────────────────────────────────
  if (x1 > x0 && z1 > z0) {
    for (const [px, pz] of [[x0, z0], [x0, z1], [x1, z0], [x1, z1]] as [number, number][]) {
      for (let y = y0; y <= y1; y++) place(blocks, px, y, pz, framedBlackstone)
    }
  }

  // ── Universal: ceiling light grid (sea_lantern every 5 blocks, inset 2) ─
  for (let x = x0 + 1; x <= x1 - 1; x++) {
    for (let z = z0 + 1; z <= z1 - 1; z++) {
      if ((x - x0 - 1) % 5 === 0 && (z - z0 - 1) % 5 === 0) {
        place(blocks, x, outerMax.y, z, pal.light)
      }
    }
  }

  // ── Per-type ────────────────────────────────────────────────────────────
  switch (type) {
    case 'hall':     decorateHall(blocks, box, pal, features, cx, cz, framedBlackstone); break  // features/framedBlackstone forwarded for future use
    case 'room':     decorateRoom(blocks, box, pal, features, cx, cz);                   break
    case 'utility':  decorateUtility(blocks, box, pal, features);                        break
    case 'corridor': decorateCorridor(blocks, box, pal);                                 break
    case 'stairwell':decorateStairwell(blocks, box, pal);                                break
  }

  return blocks
}

function decorateHall(
  blocks: BlockEntry[], box: RoomBox, pal: ResolvedPalette,
  _features: Set<string>, cx: number, cz: number, _framedBlackstone: ResolvedBlock,
) {
  const { origin, outerMax, innerSize } = box
  const chain   = resolveBlock('chain')
  const lantern = resolveBlock('lantern')

  // 3×3 cross on floor using accent
  for (const [dx, dz] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]] as [number,number][]) {
    place(blocks, cx + dx, origin.y, cz + dz, pal.accent)
  }

  // Hanging chain + lantern if inner height >= 6
  if (innerSize.y >= 6) {
    const hangTop = outerMax.y - 1
    if (hangTop - 3 > origin.y + 1) {
      place(blocks, cx, hangTop,     cz, chain)
      place(blocks, cx, hangTop - 1, cz, chain)
      place(blocks, cx, hangTop - 2, cz, chain)
      place(blocks, cx, hangTop - 3, cz, lantern)
    }
  }

  // arched_ceiling is already handled by the shell builder (addArchedCeiling).
  // No re-processing here to avoid overwriting the stair blocks it places.
}

function decorateRoom(
  blocks: BlockEntry[], box: RoomBox, pal: ResolvedPalette,
  features: Set<string>, cx: number, cz: number,
) {
  const { origin, outerMax, innerSize } = box
  const x0 = origin.x + 1, x1 = outerMax.x - 1
  const z0 = origin.z + 1, z1 = outerMax.z - 1
  const andesite  = resolveBlock('create_andesite_casing')
  const brass     = resolveBlock('create_brass_casing')
  const seaLantern = resolveBlock('sea_lantern')

  // Console in each quadrant: 2×2 andesite → 2×2 brass → sea_lantern
  if (innerSize.y >= 3) {
    const qx: number[] = [
      Math.max(x0, Math.floor((x0 + cx) / 2) - 1),
      Math.max(x0, Math.floor((cx + x1) / 2) - 1),
    ]
    const qz: number[] = [
      Math.max(z0, Math.floor((z0 + cz) / 2) - 1),
      Math.max(z0, Math.floor((cz + z1) / 2) - 1),
    ]
    for (const qxv of qx) {
      for (const qzv of qz) {
        if (qxv + 1 > x1 || qzv + 1 > z1) continue
        for (let dx = 0; dx <= 1; dx++) {
          for (let dz = 0; dz <= 1; dz++) {
            place(blocks, qxv + dx, origin.y + 1, qzv + dz, andesite)
            if (origin.y + 2 < outerMax.y) place(blocks, qxv + dx, origin.y + 2, qzv + dz, brass)
          }
        }
        if (origin.y + 3 < outerMax.y) place(blocks, qxv, origin.y + 3, qzv, seaLantern)
      }
    }
  }

  // Raised platform in back half (z >= cz) with deepslate_tile stairs
  if (features.has('raised_platform') && cz > z0) {
    const stairId = stairsForBase('minecraft:deepslate_tiles') ?? 'minecraft:deepslate_brick_stairs'
    for (let x = x0; x <= x1; x++) {
      for (let z = cz; z <= z1; z++) {
        place(blocks, x, origin.y + 1, z, pal.floor)
      }
      if (cz - 1 >= z0) {
        place(blocks, x, origin.y + 1, cz - 1, {
          blockId: stairId,
          blockState: { facing: 'south', half: 'bottom', shape: 'straight', waterlogged: 'false' },
        })
      }
    }
  }

  // Equipment consoles: shelf at y+2 along walls, create_chute at y+3
  if (features.has('equipment_consoles')) {
    const chute  = resolveBlock('create_chute')
    const sY = origin.y + 2, tY = origin.y + 3
    if (sY < outerMax.y) {
      for (let x = x0; x <= x1; x++) {
        place(blocks, x, sY, origin.z,   pal.floor)
        place(blocks, x, sY, outerMax.z, pal.floor)
        if (tY < outerMax.y) {
          place(blocks, x, tY, origin.z,   chute)
          place(blocks, x, tY, outerMax.z, chute)
        }
      }
      for (let z = z0; z <= z1; z++) {
        place(blocks, origin.x,   sY, z, pal.floor)
        place(blocks, outerMax.x, sY, z, pal.floor)
        if (tY < outerMax.y) {
          place(blocks, origin.x,   tY, z, chute)
          place(blocks, outerMax.x, tY, z, chute)
        }
      }
    }
  }
}

function decorateUtility(
  blocks: BlockEntry[], box: RoomBox, _pal: ResolvedPalette, features: Set<string>,
) {
  const { origin, outerMax, innerSize } = box
  const x0 = origin.x + 1, x1 = outerMax.x - 1
  const y0 = origin.y + 1, y1 = outerMax.y - 1
  const z0 = origin.z + 1, z1 = outerMax.z - 1
  const shaft   = resolveBlock('create_shaft')
  const pipe    = resolveBlock('create_fluid_pipe')
  const ieSteel = resolveBlock('ie_sheetmetal_steel')
  const midY    = Math.max(y0, Math.min(y1, origin.y + Math.floor(innerSize.y / 2)))

  // 3×3 grid of shaft columns evenly spaced across the interior
  const shafts: [number, number][][] = []
  for (let i = 0; i < 3; i++) {
    shafts.push([])
    for (let j = 0; j < 3; j++) {
      const sx = Math.min(x1, x0 + Math.round(i * (x1 - x0) / 2))
      const sz = Math.min(z1, z0 + Math.round(j * (z1 - z0) / 2))
      shafts[i].push([sx, sz])
      for (let y = y0; y <= y1; y++) place(blocks, sx, y, sz, shaft)
    }
  }

  // Horizontal fluid pipes connecting adjacent shaft columns at mid-height
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 3; j++) {
      const [ax, az] = shafts[i][j], [bx] = shafts[i + 1][j]
      for (let x = ax + 1; x < bx; x++) place(blocks, x, midY, az, pipe)
    }
  }
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      const [ax, az] = shafts[i][j], [, bz] = shafts[i][j + 1]
      for (let z = az + 1; z < bz; z++) place(blocks, ax, midY, z, pipe)
    }
  }

  // Cabling: ie_sheetmetal_steel ceiling grid every 3 blocks
  if (features.has('cabling')) {
    for (let x = x0; x <= x1; x += 3) {
      for (let z = z0; z <= z1; z += 3) {
        place(blocks, x, outerMax.y - 1, z, ieSteel)
      }
    }
  }
}

function decorateCorridor(blocks: BlockEntry[], box: RoomBox, pal: ResolvedPalette) {
  const { origin, outerMax, innerSize } = box
  const x0 = origin.x + 1, x1 = outerMax.x - 1
  const y0 = origin.y + 1
  const z0 = origin.z + 1, z1 = outerMax.z - 1
  const ieSteel  = resolveBlock('ie_sheetmetal_steel')
  const deepslate = resolveBlock('deepslate_tile')
  const runsAlongX = innerSize.x >= innerSize.z

  if (runsAlongX) {
    const zCenter = Math.floor((origin.z + outerMax.z) / 2)
    // Floor stripe along X
    for (let x = x0; x <= x1; x++) place(blocks, x, origin.y, zCenter, deepslate)
    // Wall-mounted lights every 6 blocks
    for (let x = x0; x <= x1; x += 6) {
      place(blocks, x, y0,     origin.z,   ieSteel)
      place(blocks, x, y0 + 1, origin.z,   { blockId: 'minecraft:end_rod', blockState: { facing: 'north' } })
      place(blocks, x, y0,     outerMax.z, ieSteel)
      place(blocks, x, y0 + 1, outerMax.z, { blockId: 'minecraft:end_rod', blockState: { facing: 'south' } })
    }
  } else {
    const xCenter = Math.floor((origin.x + outerMax.x) / 2)
    // Floor stripe along Z
    for (let z = z0; z <= z1; z++) place(blocks, xCenter, origin.y, z, deepslate)
    // Wall-mounted lights every 6 blocks
    for (let z = z0; z <= z1; z += 6) {
      place(blocks, origin.x,   y0,     z, ieSteel)
      place(blocks, origin.x,   y0 + 1, z, { blockId: 'minecraft:end_rod', blockState: { facing: 'west' } })
      place(blocks, outerMax.x, y0,     z, ieSteel)
      place(blocks, outerMax.x, y0 + 1, z, { blockId: 'minecraft:end_rod', blockState: { facing: 'east' } })
    }
  }
  // Suppress unused palette warning
  void pal
}

function decorateStairwell(blocks: BlockEntry[], box: RoomBox, pal: ResolvedPalette) {
  const { origin, outerMax, innerSize } = box
  const x0 = origin.x + 1, x1 = outerMax.x - 1
  const z0 = origin.z + 1, z1 = outerMax.z - 1
  const ironBars = resolveBlock('iron_bars')
  const stairId  = stairsForBase('minecraft:deepslate_tiles') ?? 'minecraft:deepslate_brick_stairs'

  // Ordered list of positions spiraling clockwise around the perimeter
  type Step = { x: number; z: number; facing: string; railDX: number; railDZ: number }
  const perimSteps: Step[] = []
  // S face: walk East
  for (let x = x0; x <= x1; x++) perimSteps.push({ x, z: z0, facing: 'east',  railDX: 0,  railDZ: 1  })
  // E face: walk South
  for (let z = z0 + 1; z <= z1; z++) perimSteps.push({ x: x1, z, facing: 'south', railDX: -1, railDZ: 0  })
  // N face: walk West
  for (let x = x1 - 1; x >= x0; x--) perimSteps.push({ x, z: z1, facing: 'west',  railDX: 0,  railDZ: -1 })
  // W face: walk North
  for (let z = z1 - 1; z >= z0; z--) perimSteps.push({ x: x0, z, facing: 'north', railDX: 1,  railDZ: 0  })

  const perim = perimSteps.length
  const innerH = Math.floor(innerSize.y)
  const stepEvery = Math.max(1, Math.floor(perim / innerH))
  let curY = origin.y + 1

  for (let idx = 0; idx < perimSteps.length && curY <= outerMax.y - 1; idx++) {
    const { x, z, facing, railDX, railDZ } = perimSteps[idx]
    // Stair block
    place(blocks, x, curY, z, {
      blockId: stairId,
      blockState: { facing, half: 'bottom', shape: 'straight', waterlogged: 'false' },
    })
    // Solid fill below stair for structural support
    for (let y = origin.y + 1; y < curY; y++) place(blocks, x, y, z, pal.floor)
    // Railing on the inside face
    const rx = x + railDX, rz = z + railDZ
    if (rx >= x0 && rx <= x1 && rz >= z0 && rz <= z1) {
      place(blocks, rx, curY, rz, ironBars)
    }
    // Advance stair height
    if ((idx + 1) % stepEvery === 0) curY = Math.min(curY + 1, outerMax.y - 1)
  }
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
  roomBounds: RoomBound[]
}

export function layoutBlueprint(blueprint: Blueprint): LayoutResult {
  const pal   = resolvePalette(blueprint)
  const boxes = blueprint.rooms.map(computeBox)

  let blocks: BlockEntry[] = []
  for (const box of boxes) {
    blocks = blocks.concat(buildRoomShell(box, pal))
    blocks = blocks.concat(interiorDecorate(box, pal))
  }

  const seen  = new Set<string>()
  const byId  = new Map(boxes.map(b => [b.room.id, b]))

  let nDoorways = 0, nCorridors = 0, nShafts = 0

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
        nShafts++
      } else if (connType === 'bridge') {
        blocks = blocks.concat(buildBridge(a, b, pal))
      } else {
        const wall = findSharedWall(a, b)
        if (wall) {
          blocks = carveDoorway(blocks, wall)
          nDoorways++
        } else {
          const { newBlocks, removeKeys } = buildCorridor(a, b, pal)
          if (removeKeys.size > 0) {
            blocks = blocks.filter(bl => !removeKeys.has(`${bl.x},${bl.y},${bl.z}`))
          }
          blocks = blocks.concat(newBlocks)
          nCorridors++
        }
      }
    }
  }

  console.log(`[Connectivity] ${nDoorways} doorways punched, ${nCorridors} corridors generated, ${nShafts} shafts created`)

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

  // Compute normalized room bounds for block-to-room lookup in the renderer
  const roomBounds: RoomBound[] = boxes.map(box => ({
    id:    box.room.id,
    label: box.room.label || box.room.id,
    type:  box.room.type,
    min: {
      x: box.origin.x - minX,
      y: box.origin.y - minY,
      z: box.origin.z - minZ,
    },
    max: {
      x: box.outerMax.x - minX,
      y: box.outerMax.y - minY,
      z: box.outerMax.z - minZ,
    },
  }))

  return {
    blocks: normalized,
    dimensions: { x: maxX - minX + 1, y: maxY - minY + 1, z: maxZ - minZ + 1 },
    origin: { x: 0, y: 0, z: 0 },
    roomBounds,
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
    roomBounds: layout.roomBounds,
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
