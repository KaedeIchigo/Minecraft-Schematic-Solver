import type { BlockEntry, DesignBrief, TemplateModule, Vec3, Anchor, ConnectionPort } from './types.js'
import { buildRoom, carveOpening, deduplicateBlocks, computeMaterialList } from './voxelOps.js'
import { v4 as uuidv4 } from 'uuid'

type Pal = { wall: string; floor: string; ceiling: string; accent: string; light: string }

// Default block palettes per module type
const PALETTE_DEFAULTS: Record<string, Pal> = {
  starter_room:    { wall: 'minecraft:stone_bricks',        floor: 'minecraft:smooth_stone',       ceiling: 'minecraft:stone_bricks',        accent: 'minecraft:iron_bars',        light: 'minecraft:sea_lantern' },
  machine_room:    { wall: 'minecraft:polished_deepslate',  floor: 'minecraft:smooth_stone',       ceiling: 'minecraft:polished_deepslate',  accent: 'minecraft:gray_concrete',    light: 'minecraft:sea_lantern' },
  hallway:         { wall: 'minecraft:stone_bricks',        floor: 'minecraft:smooth_stone',       ceiling: 'minecraft:stone_bricks',        accent: 'minecraft:iron_bars',        light: 'minecraft:lantern' },
  elevator:        { wall: 'minecraft:polished_deepslate',  floor: 'minecraft:polished_deepslate', ceiling: 'minecraft:polished_deepslate',  accent: 'minecraft:iron_bars',        light: 'minecraft:sea_lantern' },
  ae2_room:        { wall: 'minecraft:white_concrete',      floor: 'minecraft:light_gray_concrete',ceiling: 'minecraft:white_concrete',      accent: 'minecraft:cyan_concrete',    light: 'minecraft:sea_lantern' },
  mekanism_room:   { wall: 'minecraft:gray_concrete',       floor: 'minecraft:smooth_stone',       ceiling: 'minecraft:gray_concrete',       accent: 'minecraft:cyan_concrete',    light: 'minecraft:glowstone' },
  mystical_ag_room:{ wall: 'minecraft:stone_bricks',        floor: 'minecraft:dirt',               ceiling: 'minecraft:stone_bricks',        accent: 'minecraft:oak_planks',       light: 'minecraft:glowstone' },
  power_room:      { wall: 'minecraft:polished_blackstone', floor: 'minecraft:polished_blackstone',ceiling: 'minecraft:polished_blackstone', accent: 'minecraft:orange_concrete',  light: 'minecraft:shroomlight' },
  platform:        { wall: 'minecraft:stone_bricks',        floor: 'minecraft:smooth_stone',       ceiling: 'minecraft:air',                 accent: 'minecraft:iron_bars',        light: 'minecraft:lantern' },
  bridge:          { wall: 'minecraft:stone_bricks',        floor: 'minecraft:smooth_stone',       ceiling: 'minecraft:stone_bricks',        accent: 'minecraft:glass',            light: 'minecraft:lantern' },
  tower:           { wall: 'minecraft:stone_bricks',        floor: 'minecraft:smooth_stone',       ceiling: 'minecraft:stone_bricks',        accent: 'minecraft:polished_andesite',light: 'minecraft:glowstone' },
  custom:          { wall: 'minecraft:stone_bricks',        floor: 'minecraft:smooth_stone',       ceiling: 'minecraft:stone_bricks',        accent: 'minecraft:stone',            light: 'minecraft:glowstone' },
}

// Style-keyword palette overrides
const STYLE_PALETTE_OVERRIDES: Array<{ keywords: string[]; patch: Partial<Pal> }> = [
  { keywords: ['magic', 'mystical', 'purple', 'arcane'], patch: { wall: 'minecraft:purpur_block', floor: 'minecraft:end_stone_bricks', ceiling: 'minecraft:purpur_block', accent: 'minecraft:amethyst_block', light: 'minecraft:amethyst_cluster' } },
  { keywords: ['dark', 'shadow', 'void', 'dark-industrial'], patch: { wall: 'minecraft:polished_blackstone', floor: 'minecraft:polished_blackstone', ceiling: 'minecraft:polished_blackstone', accent: 'minecraft:crying_obsidian', light: 'minecraft:shroomlight' } },
  { keywords: ['nature', 'organic', 'farming', 'forest'], patch: { wall: 'minecraft:mossy_stone_bricks', floor: 'minecraft:dirt', ceiling: 'minecraft:moss_block', accent: 'minecraft:oak_log', light: 'minecraft:glowstone' } },
  { keywords: ['nether', 'hellish', 'fire'], patch: { wall: 'minecraft:nether_bricks', floor: 'minecraft:nether_bricks', ceiling: 'minecraft:nether_bricks', accent: 'minecraft:magma_block', light: 'minecraft:shroomlight' } },
  { keywords: ['end', 'ender', 'endgame'], patch: { wall: 'minecraft:end_stone_bricks', floor: 'minecraft:end_stone_bricks', ceiling: 'minecraft:end_stone_bricks', accent: 'minecraft:purpur_block', light: 'minecraft:end_rod' } },
  { keywords: ['white-lab', 'clean', 'sterile'], patch: { wall: 'minecraft:white_concrete', floor: 'minecraft:light_gray_concrete', ceiling: 'minecraft:white_concrete', accent: 'minecraft:cyan_concrete', light: 'minecraft:sea_lantern' } },
  { keywords: ['wood', 'cozy', 'rustic'], patch: { wall: 'minecraft:oak_planks', floor: 'minecraft:spruce_planks', ceiling: 'minecraft:oak_planks', accent: 'minecraft:oak_log', light: 'minecraft:lantern' } },
  { keywords: ['quartz', 'marble', 'roman'], patch: { wall: 'minecraft:quartz_block', floor: 'minecraft:smooth_quartz', ceiling: 'minecraft:quartz_block', accent: 'minecraft:quartz_pillar', light: 'minecraft:sea_lantern' } },
]

export function generateModuleFromBrief(
  brief: DesignBrief,
  projectId: string,
  prompt?: string
): Omit<TemplateModule, 'id' | 'createdAt' | 'updatedAt'> {
  const pal = selectPalette(brief, prompt)
  let blocks = generateStructure(brief, pal, prompt)
  blocks = deduplicateBlocks(blocks)

  const dims: Vec3 = { x: brief.dimensions.x, y: brief.dimensions.y, z: brief.dimensions.z }
  const anchors = generateAnchors(brief)
  const ports = generatePorts(brief)
  const materialList = computeMaterialList(blocks)

  const promptTag = prompt ? ` — ${prompt.slice(0, 40)}` : ''
  return {
    name: `${brief.intendedModuleType.replace(/_/g, ' ')} ${dims.x}x${dims.y}x${dims.z}${promptTag}`,
    category: brief.intendedModuleType,
    tags: [...brief.styleKeywords, brief.intendedModuleType],
    dimensions: dims,
    origin: { x: 0, y: 0, z: 0 },
    anchors,
    connectionPorts: ports,
    blocks,
    materialList,
    styleProfile: {
      name: brief.styleKeywords.join(', '),
      keywords: brief.styleKeywords,
      primaryBlocks: [pal.wall, pal.floor],
      accentBlocks: [pal.accent],
      floorBlocks: [pal.floor],
      ceilingBlocks: [pal.ceiling],
    },
    sourceImages: [],
    notes: brief.notes,
    designBrief: brief,
    projectId,
    sourcePrompt: prompt,
    exportStatus: 'not_exported',
    compatibilityNotes: '',
    relatedModuleIds: [],
  }
}

// ─── Palette selection ────────────────────────────────────────────────────────

function selectPalette(brief: DesignBrief, prompt?: string): Pal {
  const base = { ...(PALETTE_DEFAULTS[brief.intendedModuleType] ?? PALETTE_DEFAULTS.custom) }
  const overrides = brief.blockPalette

  // Apply style-keyword palette overrides (first match wins)
  const allKeywords = [...brief.styleKeywords, ...(prompt ?? '').toLowerCase().split(/\s+/)]
  for (const { keywords, patch } of STYLE_PALETTE_OVERRIDES) {
    if (keywords.some(k => allKeywords.includes(k))) {
      Object.assign(base, patch)
      break
    }
  }

  // User-supplied blockPalette overrides take final priority
  return {
    wall:    overrides[0] ?? base.wall,
    floor:   overrides[1] ?? base.floor,
    ceiling: overrides[2] ?? base.ceiling,
    accent:  overrides[3] ?? base.accent,
    light:   overrides[4] ?? base.light,
  }
}

// ─── Top-level dispatcher ─────────────────────────────────────────────────────

function generateStructure(brief: DesignBrief, pal: Pal, prompt?: string): BlockEntry[] {
  const type = brief.intendedModuleType
  if (type === 'hallway')         return generateHallway(brief, pal)
  if (type === 'elevator')        return generateElevator(brief, pal)
  if (type === 'platform')        return generatePlatform(brief, pal)
  if (type === 'bridge')          return generateBridge(brief, pal)
  if (type === 'tower')           return generateTower(brief, pal)
  if (type === 'machine_room')    return generateMachineRoom(brief, pal)
  if (type === 'ae2_room')        return generateAE2Room(brief, pal)
  if (type === 'mekanism_room')   return generateMekanismRoom(brief, pal)
  if (type === 'power_room')      return generatePowerRoom(brief, pal)
  if (type === 'mystical_ag_room')return generateMysticalAG(brief, pal)
  return generateGenericRoom(brief, pal, prompt)
}

// ─── Helper: carve all entrances ─────────────────────────────────────────────

function carveEntrances(blocks: BlockEntry[], brief: DesignBrief): BlockEntry[] {
  const { x: width, y: height, z: depth } = brief.dimensions
  for (const facing of brief.entranceDirections) {
    const pos = getEntrancePosition(facing, width, depth)
    blocks = carveOpening(blocks, pos, facing as 'north' | 'south' | 'east' | 'west', 3, Math.min(3, height - 2))
  }
  return blocks
}

// ─── Tower — circular cross-section with battlements ─────────────────────────

function generateTower(brief: DesignBrief, pal: Pal): BlockEntry[] {
  const { x: width, y: height, z: depth } = brief.dimensions
  const cx = (width - 1) / 2
  const cz = (depth - 1) / 2
  const outerR = Math.min(cx, cz) - 0.3
  const innerR = outerR - 1.5
  const blocks: BlockEntry[] = []

  for (let y = 0; y < height; y++) {
    const isBottom = y === 0
    const isTop = y === height - 1
    // Interior floors every 5 levels (multi-storey feel)
    const isInteriorFloor = y > 0 && !isTop && y % 5 === 0

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        const dist = Math.sqrt((x - cx) ** 2 + (z - cz) ** 2)
        if (dist > outerR) continue

        const isWall = dist >= innerR
        const isFloor = isBottom || isInteriorFloor
        const isCeiling = isTop

        if (isCeiling && isWall && brief.roofStyle !== 'none') {
          // Battlements: alternate merlons and crenels around perimeter
          const angle = Math.atan2(z - cz, x - cx)
          const segment = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 16)
          if (segment % 2 === 0) {
            blocks.push({ x, y, z, blockId: pal.wall, blockState: {} })
          }
          // else: crenel gap (open air)
        } else if (isWall && !isBottom) {
          blocks.push({ x, y, z, blockId: pal.wall, blockState: {} })
        } else if (isFloor) {
          blocks.push({ x, y, z, blockId: y === 0 ? pal.floor : pal.accent, blockState: {} })
        }
        // interior is open air
      }
    }

    // Central light pillar every 4 levels
    if (y % 4 === 3 && y < height - 1) {
      blocks.push({ x: Math.round(cx), y, z: Math.round(cz), blockId: pal.light, blockState: {} })
    }
  }

  // Decorative columns at 4 cardinal points on the interior wall
  if (brief.decorativeDensity > 0.2) {
    const colPositions = [
      { x: Math.round(cx), z: Math.round(cz - innerR + 1) },
      { x: Math.round(cx), z: Math.round(cz + innerR - 1) },
      { x: Math.round(cx - innerR + 1), z: Math.round(cz) },
      { x: Math.round(cx + innerR - 1), z: Math.round(cz) },
    ]
    for (const cp of colPositions) {
      for (let y = 1; y < height - 1; y++) {
        if (y % 5 !== 0) blocks.push({ x: cp.x, y, z: cp.z, blockId: pal.accent, blockState: {} })
      }
    }
  }

  return carveEntrances(deduplicateBlocks(blocks), brief)
}

// ─── Machine Room — industrial bays + cable channel ──────────────────────────

function generateMachineRoom(brief: DesignBrief, pal: Pal): BlockEntry[] {
  const { x: width, y: height, z: depth } = brief.dimensions

  let blocks = buildRoom({ width, height, depth, wallBlock: pal.wall, floorBlock: pal.floor, ceilingBlock: pal.ceiling, lightBlock: pal.light, lightSpacing: 4 })
  blocks = applyFloorPattern(blocks, brief, pal, width, depth)

  // Wall support pillars (corner pillars, full height)
  const pillarPositions = [
    { x: 1, z: 1 }, { x: width - 2, z: 1 },
    { x: 1, z: depth - 2 }, { x: width - 2, z: depth - 2 },
  ]
  for (const { x, z } of pillarPositions) {
    for (let y = 0; y < height - 1; y++) {
      blocks.push({ x, y, z, blockId: pal.accent, blockState: {} })
    }
  }

  // Cable cross channel on sub-ceiling (one below ceiling)
  const ccy = height - 2
  for (let x = 1; x < width - 1; x++)
    blocks.push({ x, y: ccy, z: Math.floor(depth / 2), blockId: pal.accent, blockState: {} })
  for (let z = 1; z < depth - 1; z++)
    blocks.push({ x: Math.floor(width / 2), y: ccy, z, blockId: pal.accent, blockState: {} })

  // Machine bays: recessed alcoves in north and south walls
  // Each bay = 3 wide × bayH tall, carved 1 deep into the wall, lined with accent
  const bayH = Math.min(height - 3, 4)
  const numBays = Math.max(1, Math.floor(width / 8))
  for (let i = 0; i < numBays; i++) {
    const bx = Math.round((width / (numBays + 1)) * (i + 1)) - 1
    for (let dx = 0; dx < 3 && bx + dx < width - 1; dx++) {
      // North wall bay: z=1 row becomes accent (machine back-panel)
      blocks.push({ x: bx + dx, y: 1,    z: 1, blockId: pal.accent, blockState: {} })
      blocks.push({ x: bx + dx, y: bayH, z: 1, blockId: pal.accent, blockState: {} })
      // South wall bay
      blocks.push({ x: bx + dx, y: 1,    z: depth - 2, blockId: pal.accent, blockState: {} })
      blocks.push({ x: bx + dx, y: bayH, z: depth - 2, blockId: pal.accent, blockState: {} })
    }
    // Bay side brackets
    for (let dy = 1; dy <= bayH; dy++) {
      blocks.push({ x: bx,     y: dy, z: 1, blockId: pal.accent, blockState: {} })
      blocks.push({ x: bx + 2, y: dy, z: 1, blockId: pal.accent, blockState: {} })
      blocks.push({ x: bx,     y: dy, z: depth - 2, blockId: pal.accent, blockState: {} })
      blocks.push({ x: bx + 2, y: dy, z: depth - 2, blockId: pal.accent, blockState: {} })
    }
  }

  return carveEntrances(deduplicateBlocks(blocks), brief)
}

// ─── AE2 Room — server racks + raised data floor ─────────────────────────────

function generateAE2Room(brief: DesignBrief, pal: Pal): BlockEntry[] {
  const { x: width, y: height, z: depth } = brief.dimensions

  let blocks = buildRoom({ width, height, depth, wallBlock: pal.wall, floorBlock: pal.floor, ceilingBlock: pal.ceiling, lightBlock: pal.light, lightSpacing: 5 })

  // Raised access floor (y=1) in central strip — accent tile pattern
  for (let x = 2; x < width - 2; x++) {
    for (let z = 2; z < depth - 2; z++) {
      if ((x + z) % 2 === 0) blocks.push({ x, y: 1, z, blockId: pal.accent, blockState: {} })
    }
  }

  // Server rack columns along east and west walls (every 2 blocks, full height)
  const rackH = Math.min(height - 2, 5)
  for (let z = 2; z < depth - 2; z += 2) {
    for (let y = 1; y <= rackH; y++) {
      blocks.push({ x: 1,         y, z, blockId: pal.accent, blockState: {} })
      blocks.push({ x: width - 2, y, z, blockId: pal.accent, blockState: {} })
    }
    // Drive indicator lights
    blocks.push({ x: 1,         y: rackH, z, blockId: pal.light, blockState: {} })
    blocks.push({ x: width - 2, y: rackH, z, blockId: pal.light, blockState: {} })
  }

  // Overhead cable tray (sub-ceiling, center lines)
  const ccy = height - 2
  for (let x = 1; x < width - 1; x++)
    blocks.push({ x, y: ccy, z: Math.floor(depth / 2), blockId: pal.wall, blockState: {} })

  return carveEntrances(deduplicateBlocks(blocks), brief)
}

// ─── Mekanism Room — processing chambers ────────────────────────────────────

function generateMekanismRoom(brief: DesignBrief, pal: Pal): BlockEntry[] {
  const { x: width, y: height, z: depth } = brief.dimensions

  let blocks = buildRoom({ width, height, depth, wallBlock: pal.wall, floorBlock: pal.floor, ceilingBlock: pal.ceiling, lightBlock: pal.light, lightSpacing: 5 })
  blocks = applyFloorPattern(blocks, brief, pal, width, depth)

  // Three processing chamber pads: raised 1-block platforms in a row
  const padWidth = Math.max(3, Math.floor(width / 4))
  const padPositions = [
    Math.floor(width / 4),
    Math.floor(width / 2) - 1,
    Math.floor(3 * width / 4) - 1,
  ]
  for (const px of padPositions) {
    for (let dx = 0; dx < padWidth && px + dx < width - 1; dx++) {
      for (let z = 2; z < depth - 2; z += Math.floor(depth / 3) + 1) {
        blocks.push({ x: px + dx, y: 1, z, blockId: pal.accent, blockState: {} })
      }
    }
  }

  // Wall-mounted pipe conduits (horizontal lines at mid-height on N/S walls)
  const pipeY = Math.floor(height / 2)
  for (let x = 1; x < width - 1; x++) {
    blocks.push({ x, y: pipeY, z: 0,       blockId: pal.accent, blockState: {} })
    blocks.push({ x, y: pipeY, z: depth -1, blockId: pal.accent, blockState: {} })
  }
  // Vertical drops from pipes down at intervals
  for (let x = 3; x < width - 3; x += 4) {
    for (let y = 1; y <= pipeY; y++) {
      blocks.push({ x, y, z: 1,       blockId: pal.accent, blockState: {} })
      blocks.push({ x, y, z: depth-2, blockId: pal.accent, blockState: {} })
    }
  }

  return carveEntrances(deduplicateBlocks(blocks), brief)
}

// ─── Power Room — central reactor ────────────────────────────────────────────

function generatePowerRoom(brief: DesignBrief, pal: Pal): BlockEntry[] {
  const { x: width, y: height, z: depth } = brief.dimensions
  const cx = Math.floor(width / 2)
  const cz = Math.floor(depth / 2)

  let blocks = buildRoom({ width, height, depth, wallBlock: pal.wall, floorBlock: pal.floor, ceilingBlock: pal.ceiling, lightBlock: pal.light, lightSpacing: 6 })

  // Reactor core: 3×3 base of accent blocks at y=1
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      blocks.push({ x: cx + dx, y: 1, z: cz + dz, blockId: pal.accent, blockState: {} })
    }
  }

  // Central glowing column rising from core (light block every 2)
  const coreH = Math.min(height - 3, 7)
  for (let y = 2; y <= coreH; y++) {
    const blockId = y % 2 === 0 ? pal.light : pal.accent
    blocks.push({ x: cx, y, z: cz, blockId, blockState: {} })
  }

  // 4 corner support pylons around reactor
  const pylonR = 3
  const pylonCorners = [
    { x: cx - pylonR, z: cz - pylonR }, { x: cx + pylonR, z: cz - pylonR },
    { x: cx - pylonR, z: cz + pylonR }, { x: cx + pylonR, z: cz + pylonR },
  ]
  for (const { x, z } of pylonCorners) {
    if (x < 1 || x > width - 2 || z < 1 || z > depth - 2) continue
    for (let y = 1; y < height - 1; y++) {
      blocks.push({ x, y, z, blockId: pal.accent, blockState: {} })
    }
    // Pylon caps with lights
    blocks.push({ x, y: height - 2, z, blockId: pal.light, blockState: {} })
  }

  // Energy conduit lines from pylons to core along floor
  for (const { x, z } of pylonCorners) {
    if (x < 1 || x > width - 2 || z < 1 || z > depth - 2) continue
    const stepX = x < cx ? 1 : -1
    const stepZ = z < cz ? 1 : -1
    let px = x, pz = z
    while (px !== cx) { blocks.push({ x: px, y: 1, z: pz, blockId: pal.accent, blockState: {} }); px += stepX }
    while (pz !== cz) { blocks.push({ x: cx, y: 1, z: pz, blockId: pal.accent, blockState: {} }); pz += stepZ }
  }

  return carveEntrances(deduplicateBlocks(blocks), brief)
}

// ─── Mystical Agriculture Room ───────────────────────────────────────────────

function generateMysticalAG(brief: DesignBrief, pal: Pal): BlockEntry[] {
  const { x: width, y: height, z: depth } = brief.dimensions

  let blocks = buildRoom({ width, height, depth, wallBlock: pal.wall, floorBlock: pal.floor, ceilingBlock: pal.ceiling, lightBlock: pal.light, lightSpacing: 5 })

  // Water channels between crop rows (every 4 blocks)
  for (let x = 1; x < width - 1; x += 4) {
    for (let z = 1; z < depth - 1; z++) {
      blocks.push({ x, y: 0, z, blockId: 'minecraft:water', blockState: {} })
    }
  }

  // Crop rows (farmland + crops, every 2 blocks, offset from water)
  for (let x = 2; x < width - 2; x += 4) {
    for (let z = 1; z < depth - 1; z++) {
      blocks.push({ x, y: 1, z, blockId: 'minecraft:farmland', blockState: { moisture: '7' } })
      blocks.push({ x, y: 2, z, blockId: 'mysticalagriculture:inferium_crop', blockState: { age: '3' } })
    }
    // Overhead grow lights
    blocks.push({ x, y: Math.min(4, height - 2), z: Math.floor(depth / 2), blockId: pal.light, blockState: {} })
  }

  // Support beams across ceiling
  for (let z = 2; z < depth - 2; z += 4) {
    for (let x = 1; x < width - 1; x++) {
      blocks.push({ x, y: height - 2, z, blockId: pal.accent, blockState: {} })
    }
  }

  return carveEntrances(deduplicateBlocks(blocks), brief)
}

// ─── Generic Room (starter, custom) ──────────────────────────────────────────

function generateGenericRoom(brief: DesignBrief, pal: Pal, prompt?: string): BlockEntry[] {
  const { x: width, y: height, z: depth } = brief.dimensions

  // Detect circular/dome shape from prompt or style keywords
  const allText = [...brief.styleKeywords, brief.notes, prompt ?? ''].join(' ').toLowerCase()
  const wantCircular = /circular|round|dome|rotunda/.test(allText)

  if (wantCircular) {
    return generateTower({ ...brief, intendedModuleType: 'tower' }, pal)
  }

  let blocks = buildRoom({ width, height, depth, wallBlock: pal.wall, floorBlock: pal.floor, ceilingBlock: pal.ceiling, lightBlock: pal.light, lightSpacing: brief.lightingStyle === 'bright' ? 4 : 6 })
  blocks = applyFloorPattern(blocks, brief, pal, width, depth)

  if (brief.decorativeDensity > 0.3) {
    blocks = addInteriorColumns(blocks, pal.accent, width, height, depth)
  }

  // Arched ceiling ribs if decorative
  if (brief.decorativeDensity > 0.5 && height >= 6) {
    for (let z = 2; z < depth - 2; z += 3) {
      for (let x = 1; x < width - 1; x++) {
        blocks.push({ x, y: height - 2, z, blockId: pal.accent, blockState: {} })
      }
    }
  }

  return carveEntrances(deduplicateBlocks(blocks), brief)
}

// ─── Hallway ──────────────────────────────────────────────────────────────────

function generateHallway(brief: DesignBrief, pal: Pal): BlockEntry[] {
  const { x: width, y: height, z: depth } = brief.dimensions
  let blocks = buildRoom({ width, height, depth, wallBlock: pal.wall, floorBlock: pal.floor, ceilingBlock: pal.ceiling, lightBlock: pal.light, lightSpacing: 5 })

  // Full-width pass-throughs on north/south
  blocks = carveOpening(blocks, { x: 1, y: 1, z: 0 }, 'north', width - 2, height - 2)
  blocks = carveOpening(blocks, { x: 1, y: 1, z: depth - 1 }, 'south', width - 2, height - 2)

  // Wall sconces / accent strips at mid-height
  const midY = Math.floor(height / 2)
  for (let z = 1; z < depth - 1; z += 3) {
    blocks.push({ x: 0,       y: midY, z, blockId: pal.light, blockState: {} })
    blocks.push({ x: width-1, y: midY, z, blockId: pal.light, blockState: {} })
  }

  return deduplicateBlocks(blocks)
}

// ─── Elevator ────────────────────────────────────────────────────────────────

function generateElevator(brief: DesignBrief, pal: Pal): BlockEntry[] {
  const { x: width, y: height, z: depth } = brief.dimensions
  const blocks: BlockEntry[] = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        const onEdge = x === 0 || x === width - 1 || z === 0 || z === depth - 1
        if (onEdge) blocks.push({ x, y, z, blockId: pal.wall, blockState: {} })
        else if (y % 5 === 0) blocks.push({ x, y, z, blockId: pal.floor, blockState: {} })
      }
    }
    if (y % 4 === 3) blocks.push({ x: 1, y, z: 1, blockId: pal.light, blockState: {} })
  }

  // Entrance on each requested facing
  return carveEntrances(blocks, brief)
}

// ─── Platform ────────────────────────────────────────────────────────────────

function generatePlatform(brief: DesignBrief, pal: Pal): BlockEntry[] {
  const { x: width, y: height, z: depth } = brief.dimensions
  const blocks: BlockEntry[] = []

  // Base platform slab
  for (let x = 0; x < width; x++)
    for (let z = 0; z < depth; z++)
      blocks.push({ x, y: 0, z, blockId: pal.floor, blockState: {} })

  // Low perimeter wall
  const wallH = Math.min(3, height)
  for (let y = 1; y < wallH; y++) {
    for (let x = 0; x < width; x++) {
      blocks.push({ x, y, z: 0,       blockId: pal.wall, blockState: {} })
      blocks.push({ x, y, z: depth-1, blockId: pal.wall, blockState: {} })
    }
    for (let z = 1; z < depth - 1; z++) {
      blocks.push({ x: 0,       y, z, blockId: pal.wall, blockState: {} })
      blocks.push({ x: width-1, y, z, blockId: pal.wall, blockState: {} })
    }
  }

  // Corner lanterns
  for (const [lx, lz] of [[1, 1], [width-2, 1], [1, depth-2], [width-2, depth-2]] as [number, number][]) {
    blocks.push({ x: lx, y: wallH, z: lz, blockId: pal.light, blockState: {} })
  }

  return deduplicateBlocks(blocks)
}

// ─── Bridge ──────────────────────────────────────────────────────────────────

function generateBridge(brief: DesignBrief, pal: Pal): BlockEntry[] {
  const { x: width, y: height, z: depth } = brief.dimensions
  const blocks: BlockEntry[] = []

  for (let z = 0; z < depth; z++) {
    // Floor
    for (let x = 0; x < width; x++)
      blocks.push({ x, y: 0, z, blockId: pal.floor, blockState: {} })
    // Railings
    blocks.push({ x: 0,       y: 1, z, blockId: pal.accent, blockState: {} })
    blocks.push({ x: width-1, y: 1, z, blockId: pal.accent, blockState: {} })
    // Roof
    if (brief.roofStyle !== 'none') {
      for (let x = 0; x < width; x++)
        blocks.push({ x, y: height - 1, z, blockId: pal.ceiling, blockState: {} })
    }
    // Lights
    if (z % 6 === 0)
      blocks.push({ x: Math.floor(width / 2), y: height - 2, z, blockId: pal.light, blockState: {} })
    // Support arch ribs every 6 blocks
    if (z % 6 === 3) {
      for (let y = 1; y < height - 1; y++) {
        blocks.push({ x: 0,       y, z, blockId: pal.wall, blockState: {} })
        blocks.push({ x: width-1, y, z, blockId: pal.wall, blockState: {} })
      }
    }
  }
  return deduplicateBlocks(blocks)
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function applyFloorPattern(blocks: BlockEntry[], brief: DesignBrief, pal: Pal, width: number, depth: number): BlockEntry[] {
  if (brief.floorPattern === 'plain') return blocks
  const floorMap = new Map<string, BlockEntry>()
  for (const b of blocks) floorMap.set(`${b.x},${b.y},${b.z}`, b)
  for (let x = 1; x < width - 1; x++) {
    for (let z = 1; z < depth - 1; z++) {
      const key = `${x},0,${z}`
      if (!floorMap.has(key)) continue
      let useAccent = false
      if (brief.floorPattern === 'checkerboard') useAccent = (x + z) % 2 === 0
      else if (brief.floorPattern === 'diagonal')    useAccent = (x + z) % 4 === 0
      else if (brief.floorPattern === 'bordered')    useAccent = x === 1 || x === width - 2 || z === 1 || z === depth - 2
      if (useAccent) floorMap.set(key, { x, y: 0, z, blockId: pal.accent, blockState: {} })
    }
  }
  return Array.from(floorMap.values())
}

function addInteriorColumns(blocks: BlockEntry[], accentBlock: string, width: number, height: number, depth: number): BlockEntry[] {
  const extra: BlockEntry[] = []
  const spacing = 4
  for (let x = 2; x < width - 2; x += spacing) {
    for (let z = 2; z < depth - 2; z += spacing) {
      for (let y = 1; y < height - 1; y++) {
        extra.push({ x, y, z, blockId: accentBlock, blockState: {} })
      }
    }
  }
  return [...blocks, ...extra]
}

function getEntrancePosition(facing: string, width: number, depth: number): Vec3 {
  switch (facing) {
    case 'north': return { x: Math.floor(width / 2) - 1, y: 1, z: 0 }
    case 'south': return { x: Math.floor(width / 2) - 1, y: 1, z: depth - 1 }
    case 'east':  return { x: width - 1, y: 1, z: Math.floor(depth / 2) - 1 }
    case 'west':  return { x: 0, y: 1, z: Math.floor(depth / 2) - 1 }
    default:      return { x: 0, y: 1, z: 0 }
  }
}

function generateAnchors(brief: DesignBrief): Anchor[] {
  const { x: width, z: depth } = brief.dimensions
  return brief.entranceDirections.map((facing) => ({
    id: uuidv4(),
    name: `Entrance ${facing}`,
    position: getEntrancePosition(facing, width, depth),
    facing: facing as Anchor['facing'],
    purpose: 'entrance',
  }))
}

function generatePorts(brief: DesignBrief): ConnectionPort[] {
  return brief.connectionPorts.map(p => ({ ...p, id: uuidv4() }))
}
