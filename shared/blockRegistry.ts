import type { BlockState } from './types.js'

// =============================================================================
// Block Palette Resolver — abstract material name → real ATM10 block ID
// =============================================================================

export interface ResolvedBlock {
  blockId: string
  blockState: BlockState
  nbtData?: Record<string, unknown>
}

const FRAMED_BLOCK_ID = 'framed_blocks:framed_cube'

// Real-block registry. Keys are normalized (lowercase, spaces/dashes → '_').
// Values are the actual block ID + properties to place.
const REGISTRY: Record<string, ResolvedBlock> = {
  // ── Vanilla stone family ─────────────────────────────────────────────────
  stone:                       { blockId: 'minecraft:stone',                       blockState: {} },
  stone_brick:                 { blockId: 'minecraft:stone_bricks',                blockState: {} },
  stone_bricks:                { blockId: 'minecraft:stone_bricks',                blockState: {} },
  cobblestone:                 { blockId: 'minecraft:cobblestone',                 blockState: {} },
  smooth_stone:                { blockId: 'minecraft:smooth_stone',                blockState: {} },
  mossy_stone_brick:           { blockId: 'minecraft:mossy_stone_bricks',          blockState: {} },
  polished_andesite:           { blockId: 'minecraft:polished_andesite',           blockState: {} },
  polished_diorite:            { blockId: 'minecraft:polished_diorite',            blockState: {} },
  polished_granite:            { blockId: 'minecraft:polished_granite',            blockState: {} },
  polished_blackstone:         { blockId: 'minecraft:polished_blackstone_bricks',  blockState: {} },
  polished_blackstone_bricks:  { blockId: 'minecraft:polished_blackstone_bricks',  blockState: {} },
  blackstone:                  { blockId: 'minecraft:blackstone',                  blockState: {} },
  deepslate:                   { blockId: 'minecraft:deepslate_bricks',            blockState: {} },
  deepslate_brick:             { blockId: 'minecraft:deepslate_bricks',            blockState: {} },
  deepslate_bricks:            { blockId: 'minecraft:deepslate_bricks',            blockState: {} },
  polished_deepslate:          { blockId: 'minecraft:polished_deepslate',          blockState: {} },
  deepslate_tiles:             { blockId: 'minecraft:deepslate_tiles',             blockState: {} },
  obsidian:                    { blockId: 'minecraft:obsidian',                    blockState: {} },

  // ── End / Nether ─────────────────────────────────────────────────────────
  end_stone:                   { blockId: 'minecraft:end_stone',                   blockState: {} },
  end_stone_bricks:            { blockId: 'minecraft:end_stone_bricks',            blockState: {} },
  purpur:                      { blockId: 'minecraft:purpur_block',                blockState: {} },
  purpur_block:                { blockId: 'minecraft:purpur_block',                blockState: {} },
  nether_brick:                { blockId: 'minecraft:nether_bricks',               blockState: {} },
  nether_bricks:               { blockId: 'minecraft:nether_bricks',               blockState: {} },

  // ── Quartz (axis=y so it stands as a pillar variant correctly) ───────────
  quartz:                      { blockId: 'minecraft:quartz_block',                blockState: { axis: 'y' } },
  quartz_block:                { blockId: 'minecraft:quartz_block',                blockState: { axis: 'y' } },
  smooth_quartz:               { blockId: 'minecraft:smooth_quartz',               blockState: {} },

  // ── Concrete ─────────────────────────────────────────────────────────────
  white_concrete:              { blockId: 'minecraft:white_concrete',              blockState: {} },
  light_gray_concrete:         { blockId: 'minecraft:light_gray_concrete',         blockState: {} },
  gray_concrete:               { blockId: 'minecraft:gray_concrete',               blockState: {} },
  black_concrete:              { blockId: 'minecraft:black_concrete',              blockState: {} },
  cyan_concrete:               { blockId: 'minecraft:cyan_concrete',               blockState: {} },
  orange_concrete:             { blockId: 'minecraft:orange_concrete',             blockState: {} },

  // ── Metals / functional ──────────────────────────────────────────────────
  iron_block:                  { blockId: 'minecraft:iron_block',                  blockState: {} },
  iron_bars:                   { blockId: 'minecraft:iron_bars',                   blockState: {} },
  copper:                      { blockId: 'minecraft:exposed_copper',              blockState: {} },
  exposed_copper:              { blockId: 'minecraft:exposed_copper',              blockState: {} },
  oxidized_copper:             { blockId: 'minecraft:oxidized_copper',             blockState: {} },
  copper_block:                { blockId: 'minecraft:copper_block',                blockState: {} },

  // ── Glass / transparent ──────────────────────────────────────────────────
  glass:                       { blockId: 'minecraft:glass',                       blockState: {} },
  tinted_glass:                { blockId: 'minecraft:tinted_glass',                blockState: {} },

  // ── Wood ─────────────────────────────────────────────────────────────────
  oak_planks:                  { blockId: 'minecraft:oak_planks',                  blockState: {} },
  oak_log:                     { blockId: 'minecraft:oak_log',                     blockState: { axis: 'y' } },
  spruce_planks:               { blockId: 'minecraft:spruce_planks',               blockState: {} },
  spruce_log:                  { blockId: 'minecraft:spruce_log',                  blockState: { axis: 'y' } },
  dark_oak_planks:             { blockId: 'minecraft:dark_oak_planks',             blockState: {} },
  dark_oak_log:                { blockId: 'minecraft:dark_oak_log',                blockState: { axis: 'y' } },

  // ── Misc ─────────────────────────────────────────────────────────────────
  terracotta:                  { blockId: 'minecraft:terracotta',                  blockState: {} },

  // ── Decorative / structural ──────────────────────────────────────────────
  chain:                       { blockId: 'minecraft:chain',                       blockState: { axis: 'y' } },
  lantern:                     { blockId: 'minecraft:lantern',                     blockState: { hanging: 'false' } },
  soul_lantern:                { blockId: 'minecraft:soul_lantern',                blockState: { hanging: 'false' } },
  // Create mod with vanilla fallback
  grate:                       { blockId: 'create:grate',                          blockState: {} },
  copper_grate:                { blockId: 'create:copper_grate',                   blockState: {} },

  // ── Lights ───────────────────────────────────────────────────────────────
  glowstone:                   { blockId: 'minecraft:glowstone',                   blockState: {} },
  sea_lantern:                 { blockId: 'minecraft:sea_lantern',                 blockState: {} },
  shroomlight:                 { blockId: 'minecraft:shroomlight',                 blockState: {} },
}

// Vanilla fallback for blocks that may not exist in stripped-down setups.
const SOFT_FALLBACK: Record<string, string> = {
  'create:grate':        'minecraft:iron_bars',
  'create:copper_grate': 'minecraft:iron_bars',
}

const DEFAULT_RESOLVED: ResolvedBlock = { blockId: 'minecraft:stone_bricks', blockState: {} }

function normalizeKey(name: string): string {
  return name.toLowerCase().trim().replace(/[\s-]+/g, '_')
}

/**
 * Resolve an abstract material name (from a Blueprint) to a real block ID.
 *
 * - "framed_<material>" → framed_blocks:framed_cube with CamoState
 * - "minecraft:foo" / any namespaced ID → returned verbatim
 * - Known abstract name → registry entry
 * - Unknown → console.warn + minecraft:stone_bricks fallback
 */
export function resolveBlock(name: string | undefined | null): ResolvedBlock {
  if (!name) return { ...DEFAULT_RESOLVED }
  const trimmed = name.trim()

  // Pre-namespaced pass-through (for power users / Blueprint authors)
  if (trimmed.includes(':')) {
    return { blockId: trimmed, blockState: {} }
  }

  const key = normalizeKey(trimmed)

  // Framed block routing
  if (key.startsWith('framed_')) {
    const camoKey = key.slice('framed_'.length)
    const camo = REGISTRY[camoKey]
    if (!camo) {
      console.warn(`[blockRegistry] unknown framed camo '${name}', defaulting CamoState to minecraft:stone_bricks`)
    }
    const camoBlock = camo ?? DEFAULT_RESOLVED
    return {
      blockId: FRAMED_BLOCK_ID,
      blockState: {},
      nbtData: {
        CamoState:  { Name: camoBlock.blockId, Properties: camoBlock.blockState },
        CamoState2: { Name: 'minecraft:air',   Properties: {} },
      },
    }
  }

  const hit = REGISTRY[key]
  if (hit) return { ...hit, blockState: { ...hit.blockState } }

  console.warn(`[blockRegistry] unknown material '${name}', falling back to minecraft:stone_bricks`)
  return { ...DEFAULT_RESOLVED }
}

/**
 * Returns the soft-fallback block ID for environments without the modded block,
 * or the original ID if no fallback applies. Used by exporters / validators.
 */
export function softFallback(blockId: string): string {
  return SOFT_FALLBACK[blockId] ?? blockId
}

/**
 * For a block intended to be placed as a stairs variant (e.g. arched_ceiling),
 * map a base wall material to its stairs variant. Returns null if none exists.
 */
export function stairsForBase(baseBlockId: string): string | null {
  const m: Record<string, string> = {
    'minecraft:stone_bricks':                'minecraft:stone_brick_stairs',
    'minecraft:mossy_stone_bricks':          'minecraft:mossy_stone_brick_stairs',
    'minecraft:cobblestone':                 'minecraft:cobblestone_stairs',
    'minecraft:smooth_stone':                'minecraft:smooth_stone_stairs',
    'minecraft:polished_blackstone_bricks':  'minecraft:polished_blackstone_brick_stairs',
    'minecraft:polished_blackstone':         'minecraft:polished_blackstone_stairs',
    'minecraft:blackstone':                  'minecraft:blackstone_stairs',
    'minecraft:deepslate_bricks':            'minecraft:deepslate_brick_stairs',
    'minecraft:polished_deepslate':          'minecraft:polished_deepslate_stairs',
    'minecraft:deepslate_tiles':             'minecraft:deepslate_tile_stairs',
    'minecraft:nether_bricks':               'minecraft:nether_brick_stairs',
    'minecraft:end_stone_bricks':            'minecraft:end_stone_brick_stairs',
    'minecraft:purpur_block':                'minecraft:purpur_stairs',
    'minecraft:quartz_block':                'minecraft:quartz_stairs',
    'minecraft:smooth_quartz':               'minecraft:smooth_quartz_stairs',
    'minecraft:oak_planks':                  'minecraft:oak_stairs',
    'minecraft:spruce_planks':               'minecraft:spruce_stairs',
    'minecraft:dark_oak_planks':             'minecraft:dark_oak_stairs',
  }
  return m[baseBlockId] ?? null
}

/**
 * Extract the camo block ID from a framed-block tile entity NBT, if present.
 * Used by the renderer to color framed blocks like their underlying camo.
 */
export function getCamoBlockId(nbtData: Record<string, unknown> | undefined): string | null {
  if (!nbtData) return null
  const camo = nbtData['CamoState'] as { Name?: unknown } | undefined
  if (camo && typeof camo.Name === 'string') return camo.Name
  return null
}

export const FRAMED_CUBE_BLOCK_ID = FRAMED_BLOCK_ID
export const UTILITY_GAP_BLOCK_ID = 'minecraft:smooth_stone_slab'
