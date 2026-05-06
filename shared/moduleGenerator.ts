import type { BlockEntry, DesignBrief, TemplateModule, Vec3, Anchor, ConnectionPort } from './types.js'
import { buildRoom, carveOpening, deduplicateBlocks, computeMaterialList } from './voxelOps.js'
import { v4 as uuidv4 } from 'uuid'

// Default block palettes per module type
const PALETTE_DEFAULTS: Record<string, { wall: string; floor: string; ceiling: string; accent: string; light: string }> = {
  starter_room: {
    wall: 'minecraft:stone_bricks',
    floor: 'minecraft:smooth_stone',
    ceiling: 'minecraft:stone_bricks',
    accent: 'minecraft:iron_bars',
    light: 'minecraft:sea_lantern',
  },
  machine_room: {
    wall: 'minecraft:polished_deepslate',
    floor: 'minecraft:smooth_stone',
    ceiling: 'minecraft:polished_deepslate',
    accent: 'minecraft:gray_concrete',
    light: 'minecraft:sea_lantern',
  },
  hallway: {
    wall: 'minecraft:stone_bricks',
    floor: 'minecraft:smooth_stone',
    ceiling: 'minecraft:stone_bricks',
    accent: 'minecraft:iron_bars',
    light: 'minecraft:lantern',
  },
  elevator: {
    wall: 'minecraft:polished_deepslate',
    floor: 'minecraft:polished_deepslate',
    ceiling: 'minecraft:polished_deepslate',
    accent: 'minecraft:iron_bars',
    light: 'minecraft:sea_lantern',
  },
  ae2_room: {
    wall: 'minecraft:white_concrete',
    floor: 'minecraft:light_gray_concrete',
    ceiling: 'minecraft:white_concrete',
    accent: 'minecraft:cyan_concrete',
    light: 'minecraft:sea_lantern',
  },
  mekanism_room: {
    wall: 'minecraft:gray_concrete',
    floor: 'minecraft:smooth_stone',
    ceiling: 'minecraft:gray_concrete',
    accent: 'minecraft:cyan_concrete',
    light: 'minecraft:glowstone',
  },
  mystical_ag_room: {
    wall: 'minecraft:stone_bricks',
    floor: 'minecraft:dirt',
    ceiling: 'minecraft:stone_bricks',
    accent: 'minecraft:oak_planks',
    light: 'minecraft:glowstone',
  },
  power_room: {
    wall: 'minecraft:polished_blackstone',
    floor: 'minecraft:polished_blackstone',
    ceiling: 'minecraft:polished_blackstone',
    accent: 'minecraft:orange_concrete',
    light: 'minecraft:shroomlight',
  },
  platform: {
    wall: 'minecraft:stone_bricks',
    floor: 'minecraft:smooth_stone',
    ceiling: 'minecraft:air',
    accent: 'minecraft:iron_bars',
    light: 'minecraft:lantern',
  },
  bridge: {
    wall: 'minecraft:stone_bricks',
    floor: 'minecraft:smooth_stone',
    ceiling: 'minecraft:stone_bricks',
    accent: 'minecraft:glass',
    light: 'minecraft:lantern',
  },
  tower: {
    wall: 'minecraft:stone_bricks',
    floor: 'minecraft:smooth_stone',
    ceiling: 'minecraft:stone_bricks',
    accent: 'minecraft:polished_andesite',
    light: 'minecraft:glowstone',
  },
  custom: {
    wall: 'minecraft:stone_bricks',
    floor: 'minecraft:smooth_stone',
    ceiling: 'minecraft:stone_bricks',
    accent: 'minecraft:stone',
    light: 'minecraft:glowstone',
  },
}

export function generateModuleFromBrief(
  brief: DesignBrief,
  projectId: string,
  prompt?: string
): Omit<TemplateModule, 'id' | 'createdAt' | 'updatedAt'> {
  const pal = selectPalette(brief)
  let blocks = generateStructure(brief, pal)
  blocks = deduplicateBlocks(blocks)

  const dims: Vec3 = {
    x: brief.dimensions.x,
    y: brief.dimensions.y,
    z: brief.dimensions.z,
  }

  const anchors = generateAnchors(brief)
  const ports = generatePorts(brief)
  const materialList = computeMaterialList(blocks)

  return {
    name: `${brief.intendedModuleType.replace(/_/g, ' ')} ${dims.x}x${dims.y}x${dims.z}`,
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

function selectPalette(brief: DesignBrief) {
  const base = PALETTE_DEFAULTS[brief.intendedModuleType] ?? PALETTE_DEFAULTS.custom
  const overrides = brief.blockPalette

  return {
    wall: overrides[0] ?? base.wall,
    floor: overrides[1] ?? base.floor,
    ceiling: overrides[2] ?? base.ceiling,
    accent: overrides[3] ?? base.accent,
    light: overrides[4] ?? base.light,
  }
}

function generateStructure(
  brief: DesignBrief,
  pal: ReturnType<typeof selectPalette>
): BlockEntry[] {
  const { x: width, y: height, z: depth } = brief.dimensions
  const moduleType = brief.intendedModuleType

  if (moduleType === 'hallway') return generateHallway(brief, pal)
  if (moduleType === 'elevator') return generateElevator(brief, pal)
  if (moduleType === 'platform') return generatePlatform(brief, pal)
  if (moduleType === 'bridge') return generateBridge(brief, pal)

  // Standard room
  let blocks = buildRoom({
    width,
    height,
    depth,
    wallBlock: pal.wall,
    floorBlock: pal.floor,
    ceilingBlock: pal.ceiling,
    lightBlock: pal.light,
    lightSpacing: brief.lightingStyle === 'bright' ? 4 : 6,
  })

  // Apply floor pattern
  blocks = applyFloorPattern(blocks, brief, pal, width, depth)

  // Carve entrances for each desired facing
  for (const facing of brief.entranceDirections) {
    const pos = getEntrancePosition(facing, width, depth, brief.interiorClearance)
    blocks = carveOpening(blocks, pos, facing as 'north' | 'south' | 'east' | 'west', 3, Math.min(3, height - 2))
  }

  // Interior accent columns
  if (brief.decorativeDensity > 0.3 && moduleType !== 'mystical_ag_room') {
    blocks = addInteriorColumns(blocks, pal.accent, width, height, depth)
  }

  // Mystical AG: add farm rows
  if (moduleType === 'mystical_ag_room') {
    blocks = addFarmRows(blocks, pal, width, depth)
  }

  return blocks
}

function generateHallway(brief: DesignBrief, pal: ReturnType<typeof selectPalette>): BlockEntry[] {
  const { x: width, y: height, z: depth } = brief.dimensions
  const blocks = buildRoom({
    width, height, depth,
    wallBlock: pal.wall, floorBlock: pal.floor, ceilingBlock: pal.ceiling,
    lightBlock: pal.light, lightSpacing: 5,
  })
  return carveOpening(carveOpening(blocks,
    { x: 1, y: 1, z: 0 }, 'north', width - 2, height - 2),
    { x: 1, y: 1, z: depth - 1 }, 'south', width - 2, height - 2)
}

function generateElevator(brief: DesignBrief, pal: ReturnType<typeof selectPalette>): BlockEntry[] {
  const { x: width, y: height, z: depth } = brief.dimensions
  const blocks: BlockEntry[] = []
  // Hollow shaft
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        const onEdge = x === 0 || x === width - 1 || z === 0 || z === depth - 1
        if (onEdge) blocks.push({ x, y, z, blockId: pal.wall, blockState: {} })
        else if (y % 4 === 0) blocks.push({ x, y, z, blockId: pal.floor, blockState: {} })
      }
    }
    // Lights every 4 levels
    if (y % 4 === 3) {
      blocks.push({ x: 1, y, z: 1, blockId: pal.light, blockState: {} })
    }
  }
  return blocks
}

function generatePlatform(brief: DesignBrief, pal: ReturnType<typeof selectPalette>): BlockEntry[] {
  const { x: width, y: height, z: depth } = brief.dimensions
  const blocks: BlockEntry[] = []
  // Base platform
  for (let x = 0; x < width; x++)
    for (let z = 0; z < depth; z++)
      blocks.push({ x, y: 0, z, blockId: pal.floor, blockState: {} })
  // Low perimeter wall
  const wallH = Math.min(3, height)
  for (let y = 1; y < wallH; y++) {
    for (let x = 0; x < width; x++) {
      blocks.push({ x, y, z: 0, blockId: pal.wall, blockState: {} })
      blocks.push({ x, y, z: depth - 1, blockId: pal.wall, blockState: {} })
    }
    for (let z = 1; z < depth - 1; z++) {
      blocks.push({ x: 0, y, z, blockId: pal.wall, blockState: {} })
      blocks.push({ x: width - 1, y, z, blockId: pal.wall, blockState: {} })
    }
  }
  return blocks
}

function generateBridge(brief: DesignBrief, pal: ReturnType<typeof selectPalette>): BlockEntry[] {
  const { x: width, y: height, z: depth } = brief.dimensions
  const blocks: BlockEntry[] = []
  for (let z = 0; z < depth; z++) {
    for (let x = 0; x < width; x++)
      blocks.push({ x, y: 0, z, blockId: pal.floor, blockState: {} })
    blocks.push({ x: 0, y: 1, z, blockId: pal.accent, blockState: {} })
    blocks.push({ x: width - 1, y: 1, z, blockId: pal.accent, blockState: {} })
    if (brief.roofStyle !== 'none') {
      for (let x = 0; x < width; x++)
        blocks.push({ x, y: height - 1, z, blockId: pal.ceiling, blockState: {} })
    }
    if (z % 6 === 0) {
      blocks.push({ x: Math.floor(width / 2), y: height - 2, z, blockId: pal.light, blockState: {} })
    }
  }
  return blocks
}

function applyFloorPattern(
  blocks: BlockEntry[], brief: DesignBrief,
  pal: ReturnType<typeof selectPalette>,
  width: number, depth: number
): BlockEntry[] {
  if (brief.floorPattern === 'plain') return blocks

  const floorMap = new Map<string, BlockEntry>()
  for (const b of blocks) floorMap.set(`${b.x},${b.y},${b.z}`, b)

  for (let x = 1; x < width - 1; x++) {
    for (let z = 1; z < depth - 1; z++) {
      const key = `${x},0,${z}`
      if (!floorMap.has(key)) continue
      let useAccent = false
      if (brief.floorPattern === 'checkerboard') useAccent = (x + z) % 2 === 0
      else if (brief.floorPattern === 'diagonal') useAccent = (x + z) % 4 === 0
      else if (brief.floorPattern === 'bordered') {
        useAccent = x === 1 || x === width - 2 || z === 1 || z === depth - 2
      }
      if (useAccent) floorMap.set(key, { x, y: 0, z, blockId: pal.accent, blockState: {} })
    }
  }

  return Array.from(floorMap.values())
}

function addInteriorColumns(
  blocks: BlockEntry[], accentBlock: string,
  width: number, height: number, depth: number
): BlockEntry[] {
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

function addFarmRows(
  blocks: BlockEntry[],
  pal: ReturnType<typeof selectPalette>,
  width: number, depth: number
): BlockEntry[] {
  const extra: BlockEntry[] = []
  for (let x = 2; x < width - 2; x += 3) {
    for (let z = 1; z < depth - 1; z++) {
      extra.push({ x, y: 1, z, blockId: 'minecraft:farmland', blockState: { moisture: '7' } })
      extra.push({ x, y: 2, z, blockId: 'mysticalagriculture:inferium_crop', blockState: { age: '3' } })
    }
    // Lighting row
    if ((x % 6) === 2) {
      extra.push({ x, y: 3, z: Math.floor(depth / 2), blockId: pal.light, blockState: {} })
    }
  }
  return [...blocks, ...extra]
}

function getEntrancePosition(facing: string, width: number, depth: number, _clearance: number): Vec3 {
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
    position: getEntrancePosition(facing, width, depth, brief.interiorClearance),
    facing: facing as Anchor['facing'],
    purpose: 'entrance',
  }))
}

function generatePorts(brief: DesignBrief): ConnectionPort[] {
  return brief.connectionPorts.map(p => ({
    ...p,
    id: uuidv4(),
  }))
}
