import type { BlockState } from './types.js'

// =============================================================================
// Block Registry — ATM10 to the Sky expanded palette
// =============================================================================
// Each RegistryEntry is the canonical record for a buildable block.
// The `id` field is the lookup key used in Blueprint material_palette values.
// resolveBlock() accepts abstract ids, namespaced block IDs, and framed_ prefix forms.

export interface RegistryEntry {
  id:            string                    // abstract name used in blueprints + palette dropdowns
  displayName:   string                    // shown in UI
  blockId:       string                    // actual in-game block ID
  isFramed:      boolean                   // true → framed_blocks:framed_cube with CamoState
  camoBlockId?:  string                    // required when isFramed is true
  properties?:   Record<string, string>    // block state properties (e.g. axis, facing)
  category:      string                    // UI grouping
  rendererColor: string                    // hex color for the 3D renderer
}

// Back-compat shape returned by resolveBlock() — consumed by layout engine + renderer
export interface ResolvedBlock {
  blockId:    string
  blockState: BlockState
  nbtData?:   Record<string, unknown>
}

// =============================================================================
// Registry entries — extend this array to add new blocks
// =============================================================================

export const REGISTRY_ENTRIES: RegistryEntry[] = [

  // ── vanilla_structural ───────────────────────────────────────────────────
  // Abstract names used by the AI Design Brain must live here.

  { id: 'stone',                    displayName: 'Stone',                     blockId: 'minecraft:stone',                       isFramed: false, category: 'vanilla_structural', rendererColor: '#7f7f7f' },
  { id: 'stone_brick',              displayName: 'Stone Bricks',              blockId: 'minecraft:stone_bricks',                isFramed: false, category: 'vanilla_structural', rendererColor: '#787878' },
  { id: 'stone_bricks',             displayName: 'Stone Bricks',              blockId: 'minecraft:stone_bricks',                isFramed: false, category: 'vanilla_structural', rendererColor: '#787878' },
  { id: 'cobblestone',              displayName: 'Cobblestone',               blockId: 'minecraft:cobblestone',                 isFramed: false, category: 'vanilla_structural', rendererColor: '#6b6b6b' },
  { id: 'smooth_stone',             displayName: 'Smooth Stone',              blockId: 'minecraft:smooth_stone',                isFramed: false, category: 'vanilla_structural', rendererColor: '#8a8a8a' },
  { id: 'smooth_stone_slab',        displayName: 'Smooth Stone Slab',         blockId: 'minecraft:smooth_stone_slab',           isFramed: false, category: 'vanilla_structural', rendererColor: '#9e9e9e' },
  { id: 'mossy_stone_brick',        displayName: 'Mossy Stone Bricks',        blockId: 'minecraft:mossy_stone_bricks',          isFramed: false, category: 'vanilla_structural', rendererColor: '#6b7862' },
  { id: 'mossy_stone_bricks',       displayName: 'Mossy Stone Bricks',        blockId: 'minecraft:mossy_stone_bricks',          isFramed: false, category: 'vanilla_structural', rendererColor: '#6b7862' },
  { id: 'polished_andesite',        displayName: 'Polished Andesite',         blockId: 'minecraft:polished_andesite',           isFramed: false, category: 'vanilla_structural', rendererColor: '#8a8a8a' },
  { id: 'polished_diorite',         displayName: 'Polished Diorite',          blockId: 'minecraft:polished_diorite',            isFramed: false, category: 'vanilla_structural', rendererColor: '#bfbfbf' },
  { id: 'polished_granite',         displayName: 'Polished Granite',          blockId: 'minecraft:polished_granite',            isFramed: false, category: 'vanilla_structural', rendererColor: '#9d6b53' },
  { id: 'polished_blackstone_bricks', displayName: 'Polished Blackstone Bricks', blockId: 'minecraft:polished_blackstone_bricks', isFramed: false, category: 'vanilla_structural', rendererColor: '#252030' },
  { id: 'blackstone',               displayName: 'Blackstone',                blockId: 'minecraft:blackstone',                  isFramed: false, category: 'vanilla_structural', rendererColor: '#2b272e' },
  { id: 'deepslate',                displayName: 'Deepslate Bricks',          blockId: 'minecraft:deepslate_bricks',            isFramed: false, category: 'vanilla_structural', rendererColor: '#3a3a42' },
  { id: 'deepslate_bricks',         displayName: 'Deepslate Bricks',          blockId: 'minecraft:deepslate_bricks',            isFramed: false, category: 'vanilla_structural', rendererColor: '#3a3a42' },
  { id: 'polished_deepslate',       displayName: 'Polished Deepslate',        blockId: 'minecraft:polished_deepslate',          isFramed: false, category: 'vanilla_structural', rendererColor: '#575757' },
  { id: 'obsidian',                 displayName: 'Obsidian',                  blockId: 'minecraft:obsidian',                    isFramed: false, category: 'vanilla_structural', rendererColor: '#1a0d24' },
  { id: 'end_stone',                displayName: 'End Stone',                 blockId: 'minecraft:end_stone',                   isFramed: false, category: 'vanilla_structural', rendererColor: '#d4cc9a' },
  { id: 'end_stone_bricks',         displayName: 'End Stone Bricks',          blockId: 'minecraft:end_stone_bricks',            isFramed: false, category: 'vanilla_structural', rendererColor: '#d4cc9a' },
  { id: 'purpur',                   displayName: 'Purpur Block',              blockId: 'minecraft:purpur_block',                isFramed: false, category: 'vanilla_structural', rendererColor: '#9a6b9a' },
  { id: 'purpur_block',             displayName: 'Purpur Block',              blockId: 'minecraft:purpur_block',                isFramed: false, category: 'vanilla_structural', rendererColor: '#9a6b9a' },
  { id: 'nether_brick',             displayName: 'Nether Bricks',             blockId: 'minecraft:nether_bricks',               isFramed: false, category: 'vanilla_structural', rendererColor: '#3a1e1e' },
  { id: 'nether_bricks',            displayName: 'Nether Bricks',             blockId: 'minecraft:nether_bricks',               isFramed: false, category: 'vanilla_structural', rendererColor: '#3a1e1e' },
  { id: 'quartz',                   displayName: 'Quartz Block',              blockId: 'minecraft:quartz_block',                isFramed: false, properties: { axis: 'y' }, category: 'vanilla_structural', rendererColor: '#eae6de' },
  { id: 'quartz_block',             displayName: 'Quartz Block',              blockId: 'minecraft:quartz_block',                isFramed: false, properties: { axis: 'y' }, category: 'vanilla_structural', rendererColor: '#eae6de' },
  { id: 'smooth_quartz',            displayName: 'Smooth Quartz',             blockId: 'minecraft:smooth_quartz',               isFramed: false, category: 'vanilla_structural', rendererColor: '#eae6de' },
  { id: 'white_concrete',           displayName: 'White Concrete',            blockId: 'minecraft:white_concrete',              isFramed: false, category: 'vanilla_structural', rendererColor: '#cfcfcf' },
  { id: 'light_gray_concrete',      displayName: 'Light Gray Concrete',       blockId: 'minecraft:light_gray_concrete',         isFramed: false, category: 'vanilla_structural', rendererColor: '#9b9b9b' },
  { id: 'cyan_concrete',            displayName: 'Cyan Concrete',             blockId: 'minecraft:cyan_concrete',               isFramed: false, category: 'vanilla_structural', rendererColor: '#207a8a' },
  { id: 'orange_concrete',          displayName: 'Orange Concrete',           blockId: 'minecraft:orange_concrete',             isFramed: false, category: 'vanilla_structural', rendererColor: '#e07030' },
  { id: 'iron_block',               displayName: 'Iron Block',                blockId: 'minecraft:iron_block',                  isFramed: false, category: 'vanilla_structural', rendererColor: '#d8d8d8' },
  { id: 'iron_bars',                displayName: 'Iron Bars',                 blockId: 'minecraft:iron_bars',                   isFramed: false, category: 'vanilla_structural', rendererColor: '#8a8a8a' },
  { id: 'copper',                   displayName: 'Exposed Copper',            blockId: 'minecraft:exposed_copper',              isFramed: false, category: 'vanilla_structural', rendererColor: '#b05030' },
  { id: 'exposed_copper',           displayName: 'Exposed Copper',            blockId: 'minecraft:exposed_copper',              isFramed: false, category: 'vanilla_structural', rendererColor: '#b05030' },
  { id: 'oxidized_copper',          displayName: 'Oxidized Copper',           blockId: 'minecraft:oxidized_copper',             isFramed: false, category: 'vanilla_structural', rendererColor: '#3da888' },
  { id: 'copper_block',             displayName: 'Copper Block',              blockId: 'minecraft:copper_block',                isFramed: false, category: 'vanilla_structural', rendererColor: '#c07040' },
  { id: 'glass',                    displayName: 'Glass',                     blockId: 'minecraft:glass',                       isFramed: false, category: 'vanilla_structural', rendererColor: '#c0e8f090' },
  { id: 'oak_planks',               displayName: 'Oak Planks',                blockId: 'minecraft:oak_planks',                  isFramed: false, category: 'vanilla_structural', rendererColor: '#9e814a' },
  { id: 'oak_log',                  displayName: 'Oak Log',                   blockId: 'minecraft:oak_log',                     isFramed: false, properties: { axis: 'y' }, category: 'vanilla_structural', rendererColor: '#7a6035' },
  { id: 'spruce_planks',            displayName: 'Spruce Planks',             blockId: 'minecraft:spruce_planks',               isFramed: false, category: 'vanilla_structural', rendererColor: '#6b4a2a' },
  { id: 'spruce_log',               displayName: 'Spruce Log',                blockId: 'minecraft:spruce_log',                  isFramed: false, properties: { axis: 'y' }, category: 'vanilla_structural', rendererColor: '#5a3520' },
  { id: 'dark_oak_planks',          displayName: 'Dark Oak Planks',           blockId: 'minecraft:dark_oak_planks',             isFramed: false, category: 'vanilla_structural', rendererColor: '#3b2b1a' },
  { id: 'dark_oak_log',             displayName: 'Dark Oak Log',              blockId: 'minecraft:dark_oak_log',                isFramed: false, properties: { axis: 'y' }, category: 'vanilla_structural', rendererColor: '#2a1a10' },
  { id: 'terracotta',               displayName: 'Terracotta',                blockId: 'minecraft:terracotta',                  isFramed: false, category: 'vanilla_structural', rendererColor: '#985a3a' },
  { id: 'chain',                    displayName: 'Chain',                     blockId: 'minecraft:chain',                       isFramed: false, properties: { axis: 'y' }, category: 'vanilla_structural', rendererColor: '#606060' },
  // compat aliases for Create blocks referenced without prefix
  { id: 'grate',                    displayName: 'Create Grate',              blockId: 'create:grate',                          isFramed: false, category: 'vanilla_structural', rendererColor: '#4a4a4a' },
  { id: 'copper_grate',             displayName: 'Create Copper Grate',       blockId: 'create:copper_grate',                   isFramed: false, category: 'vanilla_structural', rendererColor: '#7a4a2a' },

  // ── dark_industrial ──────────────────────────────────────────────────────

  { id: 'black_concrete',           displayName: 'Black Concrete',            blockId: 'minecraft:black_concrete',              isFramed: false, category: 'dark_industrial', rendererColor: '#1a1a1a' },
  { id: 'black_terracotta',         displayName: 'Black Terracotta',          blockId: 'minecraft:black_terracotta',            isFramed: false, category: 'dark_industrial', rendererColor: '#2a1f1f' },
  { id: 'gray_concrete',            displayName: 'Gray Concrete',             blockId: 'minecraft:gray_concrete',               isFramed: false, category: 'dark_industrial', rendererColor: '#3a3a3a' },
  { id: 'dark_prismarine',          displayName: 'Dark Prismarine',           blockId: 'minecraft:dark_prismarine',             isFramed: false, category: 'dark_industrial', rendererColor: '#2d4a3e' },
  { id: 'polished_blackstone',      displayName: 'Polished Blackstone',       blockId: 'minecraft:polished_blackstone',         isFramed: false, category: 'dark_industrial', rendererColor: '#1e1a24' },
  { id: 'polished_blackstone_brick', displayName: 'Polished Blackstone Bricks', blockId: 'minecraft:polished_blackstone_bricks', isFramed: false, category: 'dark_industrial', rendererColor: '#252030' },
  { id: 'gilded_blackstone',        displayName: 'Gilded Blackstone',         blockId: 'minecraft:gilded_blackstone',           isFramed: false, category: 'dark_industrial', rendererColor: '#2a2015' },
  { id: 'deepslate_brick',          displayName: 'Deepslate Bricks',          blockId: 'minecraft:deepslate_bricks',            isFramed: false, category: 'dark_industrial', rendererColor: '#3a3a42' },
  { id: 'deepslate_tile',           displayName: 'Deepslate Tiles',           blockId: 'minecraft:deepslate_tiles',             isFramed: false, category: 'dark_industrial', rendererColor: '#2e2e38' },

  // ── create_mod ───────────────────────────────────────────────────────────

  { id: 'create_grate',             displayName: 'Create Grate',              blockId: 'create:grate',                          isFramed: false, category: 'create_mod', rendererColor: '#4a4a4a' },
  { id: 'create_copper_grate',      displayName: 'Create Copper Grate',       blockId: 'create:copper_grate',                   isFramed: false, category: 'create_mod', rendererColor: '#7a4a2a' },
  { id: 'create_industrial_iron',   displayName: 'Industrial Iron Block',      blockId: 'create:industrial_iron_block',          isFramed: false, category: 'create_mod', rendererColor: '#5a6a6a' },
  { id: 'create_shaft',             displayName: 'Create Shaft',              blockId: 'create:shaft',                          isFramed: false, properties: { axis: 'y' }, category: 'create_mod', rendererColor: '#6a5a4a' },
  { id: 'create_fluid_pipe',        displayName: 'Fluid Pipe',                blockId: 'create:fluid_pipe',                     isFramed: false, category: 'create_mod', rendererColor: '#5a5a6a' },
  { id: 'create_chute',             displayName: 'Chute',                     blockId: 'create:chute',                          isFramed: false, category: 'create_mod', rendererColor: '#4a5a5a' },
  { id: 'create_depot',             displayName: 'Depot',                     blockId: 'create:depot',                          isFramed: false, category: 'create_mod', rendererColor: '#5a5050' },
  { id: 'create_andesite_casing',   displayName: 'Andesite Machine Casing',   blockId: 'create:andesite_machine_casing',        isFramed: false, category: 'create_mod', rendererColor: '#5a5a52' },
  { id: 'create_brass_casing',      displayName: 'Brass Machine Casing',      blockId: 'create:brass_machine_casing',           isFramed: false, category: 'create_mod', rendererColor: '#7a6a3a' },
  { id: 'create_copper_casing',     displayName: 'Copper Machine Casing',     blockId: 'create:copper_machine_casing',          isFramed: false, category: 'create_mod', rendererColor: '#7a4a2a' },

  // ── framed_decorative ────────────────────────────────────────────────────
  // Explicit framed entries take precedence over the framed_ prefix fallback.

  { id: 'framed_blackstone',        displayName: 'Framed Blackstone',         blockId: 'framed_blocks:framed_cube', isFramed: true, camoBlockId: 'minecraft:polished_blackstone_bricks', category: 'framed_decorative', rendererColor: '#252030' },
  { id: 'framed_deepslate',         displayName: 'Framed Deepslate',          blockId: 'framed_blocks:framed_cube', isFramed: true, camoBlockId: 'minecraft:deepslate_bricks',           category: 'framed_decorative', rendererColor: '#3a3a42' },
  { id: 'framed_dark_prismarine',   displayName: 'Framed Dark Prismarine',    blockId: 'framed_blocks:framed_cube', isFramed: true, camoBlockId: 'minecraft:dark_prismarine',            category: 'framed_decorative', rendererColor: '#2d4a3e' },
  { id: 'framed_obsidian',          displayName: 'Framed Obsidian',           blockId: 'framed_blocks:framed_cube', isFramed: true, camoBlockId: 'minecraft:obsidian',                   category: 'framed_decorative', rendererColor: '#150f1f' },
  { id: 'framed_quartz',            displayName: 'Framed Quartz',             blockId: 'framed_blocks:framed_cube', isFramed: true, camoBlockId: 'minecraft:quartz_block',               category: 'framed_decorative', rendererColor: '#e8e4dc' },
  { id: 'framed_copper',            displayName: 'Framed Copper',             blockId: 'framed_blocks:framed_cube', isFramed: true, camoBlockId: 'minecraft:exposed_copper',             category: 'framed_decorative', rendererColor: '#7a6a4a' },
  { id: 'framed_iron',              displayName: 'Framed Iron',               blockId: 'framed_blocks:framed_cube', isFramed: true, camoBlockId: 'minecraft:iron_block',                 category: 'framed_decorative', rendererColor: '#d0d0d0' },
  { id: 'framed_netherite',         displayName: 'Framed Netherite',          blockId: 'framed_blocks:framed_cube', isFramed: true, camoBlockId: 'minecraft:netherite_block',            category: 'framed_decorative', rendererColor: '#3a3540' },

  // ── immersive_engineering ────────────────────────────────────────────────

  { id: 'ie_steel_block',           displayName: 'IE Steel Block',            blockId: 'immersiveengineering:storage_steel',         isFramed: false, category: 'immersive_engineering', rendererColor: '#5a6878' },
  { id: 'ie_aluminum_block',        displayName: 'IE Aluminum Block',         blockId: 'immersiveengineering:storage_aluminum',      isFramed: false, category: 'immersive_engineering', rendererColor: '#8a9aaa' },
  { id: 'ie_lead_block',            displayName: 'IE Lead Block',             blockId: 'immersiveengineering:storage_lead',          isFramed: false, category: 'immersive_engineering', rendererColor: '#4a4a5a' },
  { id: 'ie_treated_wood',          displayName: 'IE Treated Wood',           blockId: 'immersiveengineering:treated_wood_horizontal', isFramed: false, category: 'immersive_engineering', rendererColor: '#5a4a2a' },
  { id: 'ie_concrete',              displayName: 'IE Concrete',               blockId: 'immersiveengineering:concrete',              isFramed: false, category: 'immersive_engineering', rendererColor: '#7a7a72' },
  { id: 'ie_sheetmetal_steel',      displayName: 'IE Steel Sheetmetal',       blockId: 'immersiveengineering:sheetmetal_steel',      isFramed: false, category: 'immersive_engineering', rendererColor: '#6a7888' },
  { id: 'ie_sheetmetal_aluminum',   displayName: 'IE Aluminum Sheetmetal',    blockId: 'immersiveengineering:sheetmetal_aluminum',   isFramed: false, category: 'immersive_engineering', rendererColor: '#8aabb8' },

  // ── mekanism ─────────────────────────────────────────────────────────────

  { id: 'mek_steel_casing',         displayName: 'Mek Steel Casing',          blockId: 'mekanism:steel_casing',                     isFramed: false, category: 'mekanism', rendererColor: '#5a6878' },
  { id: 'mek_basic_control',        displayName: 'Mek Basic Control Circuit', blockId: 'mekanism:basic_control_circuit',            isFramed: false, category: 'mekanism', rendererColor: '#3a5a3a' },
  { id: 'mek_hdpe',                 displayName: 'Mek HDPE Glass',            blockId: 'mekanism:hdpe_reinforced_glass',            isFramed: false, category: 'mekanism', rendererColor: '#a0c8d0' },
  { id: 'mek_teleporter_frame',     displayName: 'Mek Teleporter Frame',      blockId: 'mekanism:teleporter_frame',                 isFramed: false, category: 'mekanism', rendererColor: '#2a3a5a' },

  // ── thermal ───────────────────────────────────────────────────────────────

  { id: 'thermal_machine_frame',    displayName: 'Thermal Machine Frame',     blockId: 'thermal:machine_frame',                     isFramed: false, category: 'thermal', rendererColor: '#7a6a3a' },
  { id: 'thermal_rockwool',         displayName: 'Thermal Rockwool',          blockId: 'thermal:rockwool',                          isFramed: false, category: 'thermal', rendererColor: '#8a7a6a' },
  { id: 'thermal_duct',             displayName: 'Thermal Duct',              blockId: 'thermal:duct',                              isFramed: false, category: 'thermal', rendererColor: '#6a5a4a' },

  // ── lighting ─────────────────────────────────────────────────────────────

  { id: 'lantern',                  displayName: 'Lantern',                   blockId: 'minecraft:lantern',                         isFramed: false, properties: { hanging: 'false' }, category: 'lighting', rendererColor: '#d0a040' },
  { id: 'soul_lantern',             displayName: 'Soul Lantern',              blockId: 'minecraft:soul_lantern',                    isFramed: false, properties: { hanging: 'false' }, category: 'lighting', rendererColor: '#40a0d0' },
  { id: 'sea_lantern',              displayName: 'Sea Lantern',               blockId: 'minecraft:sea_lantern',                     isFramed: false, category: 'lighting', rendererColor: '#a0c8cc' },
  { id: 'glowstone',                displayName: 'Glowstone',                 blockId: 'minecraft:glowstone',                       isFramed: false, category: 'lighting', rendererColor: '#e0c060' },
  { id: 'shroomlight',              displayName: 'Shroomlight',               blockId: 'minecraft:shroomlight',                     isFramed: false, category: 'lighting', rendererColor: '#e09040' },
  { id: 'end_rod',                  displayName: 'End Rod',                   blockId: 'minecraft:end_rod',                         isFramed: false, properties: { facing: 'up' }, category: 'lighting', rendererColor: '#f0f0e0' },
  { id: 'create_blaze_lantern',     displayName: 'Create Blaze Lantern',      blockId: 'create:blaze_lantern',                      isFramed: false, category: 'lighting', rendererColor: '#e06020' },

  // ── accent_glass ─────────────────────────────────────────────────────────

  { id: 'tinted_glass',             displayName: 'Tinted Glass',              blockId: 'minecraft:tinted_glass',                    isFramed: false, category: 'accent_glass', rendererColor: '#2a2a3a' },
  { id: 'cyan_glass',               displayName: 'Cyan Stained Glass',        blockId: 'minecraft:cyan_stained_glass',              isFramed: false, category: 'accent_glass', rendererColor: '#20a0b0' },
  { id: 'purple_glass',             displayName: 'Purple Stained Glass',      blockId: 'minecraft:purple_stained_glass',            isFramed: false, category: 'accent_glass', rendererColor: '#8020a0' },
  { id: 'blue_glass',               displayName: 'Blue Stained Glass',        blockId: 'minecraft:blue_stained_glass',              isFramed: false, category: 'accent_glass', rendererColor: '#2040b0' },
  { id: 'create_framed_glass',      displayName: 'Create Framed Glass',       blockId: 'create:framed_glass',                       isFramed: false, category: 'accent_glass', rendererColor: '#d0e8f0' },
]

// =============================================================================
// Internal lookup maps (built at module load)
// =============================================================================

// First-wins: primary definitions (earlier in the array) take precedence over aliases.
const ENTRY_MAP = new Map<string, RegistryEntry>()
for (const entry of REGISTRY_ENTRIES) {
  if (!ENTRY_MAP.has(entry.id)) ENTRY_MAP.set(entry.id, entry)
}

// Category → entries, preserving insertion order
const CATEGORY_MAP = new Map<string, RegistryEntry[]>()
for (const entry of REGISTRY_ENTRIES) {
  if (!CATEGORY_MAP.has(entry.category)) CATEGORY_MAP.set(entry.category, [])
  CATEGORY_MAP.get(entry.category)!.push(entry)
}

// =============================================================================
// Public query helpers (for UI dropdowns, palette editors, etc.)
// =============================================================================

export function getAllEntries(): RegistryEntry[] {
  return REGISTRY_ENTRIES
}

export function getEntriesByCategory(): Map<string, RegistryEntry[]> {
  return CATEGORY_MAP
}

export function findEntryById(id: string): RegistryEntry | undefined {
  return ENTRY_MAP.get(normalizeKey(id))
}

// =============================================================================
// Core: resolve an abstract material name → ResolvedBlock for the layout engine
// =============================================================================

const FRAMED_BLOCK_ID = 'framed_blocks:framed_cube'
const DEFAULT_RESOLVED: ResolvedBlock = { blockId: 'minecraft:stone_bricks', blockState: {} }

function normalizeKey(name: string): string {
  return name.toLowerCase().trim().replace(/[\s-]+/g, '_')
}

function entryToResolved(entry: RegistryEntry): ResolvedBlock {
  if (entry.isFramed && entry.camoBlockId) {
    return {
      blockId: FRAMED_BLOCK_ID,
      blockState: {},
      nbtData: {
        CamoState:  { Name: entry.camoBlockId, Properties: {} },
        CamoState2: { Name: 'minecraft:air',   Properties: {} },
      },
    }
  }
  return {
    blockId:    entry.blockId,
    blockState: entry.properties ? { ...entry.properties } : {},
  }
}

/**
 * Resolve an abstract material name to a ResolvedBlock.
 *
 * Resolution order:
 *  1. Namespaced IDs (contain ':') → returned verbatim
 *  2. Explicit ENTRY_MAP hit → resolved via entry (handles isFramed entries too)
 *  3. 'framed_<x>' with no explicit entry → prefix logic: look up <x> for the camo
 *  4. Unknown → console.warn + minecraft:stone_bricks fallback
 */
export function resolveBlock(name: string | undefined | null): ResolvedBlock {
  if (!name) return { ...DEFAULT_RESOLVED }
  const trimmed = name.trim()

  // 1. Namespaced passthrough
  if (trimmed.includes(':')) {
    return { blockId: trimmed, blockState: {} }
  }

  const key = normalizeKey(trimmed)

  // 2. Explicit registry entry (covers both regular and isFramed entries)
  const entry = ENTRY_MAP.get(key)
  if (entry) return entryToResolved(entry)

  // 3. Implicit framed prefix: 'framed_<material>' where no explicit entry exists
  if (key.startsWith('framed_')) {
    const camoKey = key.slice('framed_'.length)
    const camoEntry = ENTRY_MAP.get(camoKey)
    if (!camoEntry) {
      console.warn(`[blockRegistry] unknown framed camo '${name}', defaulting CamoState to minecraft:stone_bricks`)
    }
    const camoBlockId = camoEntry ? camoEntry.blockId : 'minecraft:stone_bricks'
    const camoProps   = camoEntry?.properties ?? {}
    return {
      blockId: FRAMED_BLOCK_ID,
      blockState: {},
      nbtData: {
        CamoState:  { Name: camoBlockId, Properties: camoProps },
        CamoState2: { Name: 'minecraft:air', Properties: {} },
      },
    }
  }

  // 4. Unknown
  console.warn(`[blockRegistry] unknown material '${name}', falling back to minecraft:stone_bricks`)
  return { ...DEFAULT_RESOLVED }
}

// =============================================================================
// Utility helpers (unchanged interface)
// =============================================================================

const SOFT_FALLBACK: Record<string, string> = {
  'create:grate':                   'minecraft:iron_bars',
  'create:copper_grate':            'minecraft:iron_bars',
  'create:industrial_iron_block':   'minecraft:iron_block',
  'create:andesite_machine_casing': 'minecraft:stone',
  'create:brass_machine_casing':    'minecraft:gold_block',
  'create:copper_machine_casing':   'minecraft:copper_block',
  'create:framed_glass':            'minecraft:glass',
  'create:blaze_lantern':           'minecraft:lantern',
  'create:fluid_pipe':              'minecraft:iron_bars',
  'create:chute':                   'minecraft:iron_bars',
  'create:depot':                   'minecraft:stone',
  'create:shaft':                   'minecraft:stick',
  'immersiveengineering:storage_steel':          'minecraft:iron_block',
  'immersiveengineering:storage_aluminum':       'minecraft:iron_block',
  'immersiveengineering:storage_lead':           'minecraft:iron_block',
  'immersiveengineering:treated_wood_horizontal':'minecraft:oak_planks',
  'immersiveengineering:concrete':               'minecraft:smooth_stone',
  'immersiveengineering:sheetmetal_steel':       'minecraft:iron_block',
  'immersiveengineering:sheetmetal_aluminum':    'minecraft:iron_block',
  'mekanism:steel_casing':          'minecraft:iron_block',
  'mekanism:teleporter_frame':      'minecraft:iron_block',
  'thermal:machine_frame':          'minecraft:iron_block',
  'thermal:rockwool':               'minecraft:white_wool',
  'thermal:duct':                   'minecraft:iron_bars',
}

/** Returns a vanilla fallback for a mod block ID, or the original ID if no fallback applies. */
export function softFallback(blockId: string): string {
  return SOFT_FALLBACK[blockId] ?? blockId
}

/** Maps a base wall block ID to its stair variant. Returns null if none mapped. */
export function stairsForBase(baseBlockId: string): string | null {
  const m: Record<string, string> = {
    'minecraft:stone_bricks':                 'minecraft:stone_brick_stairs',
    'minecraft:mossy_stone_bricks':           'minecraft:mossy_stone_brick_stairs',
    'minecraft:cobblestone':                  'minecraft:cobblestone_stairs',
    'minecraft:smooth_stone':                 'minecraft:smooth_stone_stairs',
    'minecraft:polished_blackstone_bricks':   'minecraft:polished_blackstone_brick_stairs',
    'minecraft:polished_blackstone':          'minecraft:polished_blackstone_stairs',
    'minecraft:blackstone':                   'minecraft:blackstone_stairs',
    'minecraft:deepslate_bricks':             'minecraft:deepslate_brick_stairs',
    'minecraft:polished_deepslate':           'minecraft:polished_deepslate_stairs',
    'minecraft:deepslate_tiles':              'minecraft:deepslate_tile_stairs',
    'minecraft:nether_bricks':                'minecraft:nether_brick_stairs',
    'minecraft:end_stone_bricks':             'minecraft:end_stone_brick_stairs',
    'minecraft:purpur_block':                 'minecraft:purpur_stairs',
    'minecraft:quartz_block':                 'minecraft:quartz_stairs',
    'minecraft:smooth_quartz':                'minecraft:smooth_quartz_stairs',
    'minecraft:oak_planks':                   'minecraft:oak_stairs',
    'minecraft:spruce_planks':                'minecraft:spruce_stairs',
    'minecraft:dark_oak_planks':              'minecraft:dark_oak_stairs',
  }
  return m[baseBlockId] ?? null
}

/** Extract the camo block ID from a framed-block tile entity's NBT. */
export function getCamoBlockId(nbtData: Record<string, unknown> | undefined): string | null {
  if (!nbtData) return null
  const camo = nbtData['CamoState'] as { Name?: unknown } | undefined
  if (camo && typeof camo.Name === 'string') return camo.Name
  return null
}

export const FRAMED_CUBE_BLOCK_ID = FRAMED_BLOCK_ID
export const UTILITY_GAP_BLOCK_ID = 'minecraft:smooth_stone_slab'
