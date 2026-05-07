import type { BlockState } from './types.js'

export interface RegistryEntry {
  id:            string
  displayName:   string
  blockId:       string
  isFramed:      boolean
  camoBlockId?:  string
  properties?:   Record<string, string>
  category:      string
  rendererColor: string
  isLightSource?: boolean   // true → renderer treats as emissive
}

export interface ResolvedBlock {
  blockId:    string
  blockState: BlockState
  nbtData?:   Record<string, unknown>
}

// =============================================================================
// Luminax generator — 16 colors × 2 variants × 4 block types = 128 entries
// =============================================================================

const LUMINAX_COLORS: Array<{ name: string; bright: string; dim: string }> = [
  { name: 'white',      bright: '#ffffff', dim: '#cccccc' },
  { name: 'light_gray', bright: '#aaaaaa', dim: '#888888' },
  { name: 'gray',       bright: '#888888', dim: '#555555' },
  { name: 'black',      bright: '#404040', dim: '#222222' },
  { name: 'brown',      bright: '#996633', dim: '#664422' },
  { name: 'red',        bright: '#ff2020', dim: '#b81010' },
  { name: 'orange',     bright: '#ff8800', dim: '#cc6600' },
  { name: 'yellow',     bright: '#ffee00', dim: '#ccbb00' },
  { name: 'lime',       bright: '#80ff00', dim: '#55bb00' },
  { name: 'green',      bright: '#20cc20', dim: '#158815' },
  { name: 'cyan',       bright: '#00ffee', dim: '#00b8a8' },
  { name: 'light_blue', bright: '#80ccff', dim: '#5599cc' },
  { name: 'blue',       bright: '#4040ff', dim: '#2828b8' },
  { name: 'purple',     bright: '#cc00ff', dim: '#880099' },
  { name: 'magenta',    bright: '#ff40cc', dim: '#cc2299' },
  { name: 'pink',       bright: '#ff80bb', dim: '#cc5588' },
]

const LUMINAX_TYPES: Array<{ suffix: string; label: string }> = [
  { suffix: '',        label: '' },
  { suffix: '_slab',   label: ' Slab' },
  { suffix: '_stairs', label: ' Stairs' },
  { suffix: '_wall',   label: ' Wall' },
]

function generateLuminaxEntries(): RegistryEntry[] {
  const out: RegistryEntry[] = []
  for (const col of LUMINAX_COLORS) {
    for (const variant of ['bright', 'dim'] as const) {
      const color    = variant === 'bright' ? col.bright : col.dim
      const category = variant === 'bright' ? 'luminax_bright' : 'luminax_dim'
      const varLabel = variant === 'bright' ? 'Bright' : 'Dim'
      for (const type of LUMINAX_TYPES) {
        const colLabel = col.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        out.push({
          id:            `luminax_${col.name}_${variant}${type.suffix}`,
          displayName:   `Luminax ${colLabel} ${varLabel}${type.label}`,
          blockId:       `luminax:${col.name}_${variant}${type.suffix}`,
          isFramed:      false,
          category,
          rendererColor: color,
          isLightSource: true,
        })
      }
    }
  }
  return out
}

// =============================================================================
// Registry entries
// =============================================================================

export const REGISTRY_ENTRIES: RegistryEntry[] = [

  // ── vanilla_structural ───────────────────────────────────────────────────

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

  // ── create_extended ──────────────────────────────────────────────────────

  { id: 'create_encased_fan',       displayName: 'Encased Fan',               blockId: 'create:encased_fan',                    isFramed: false, category: 'create_extended', rendererColor: '#7a6a5a' },
  { id: 'create_mechanical_piston', displayName: 'Mechanical Piston',         blockId: 'create:mechanical_piston',              isFramed: false, category: 'create_extended', rendererColor: '#8a7a6a' },
  { id: 'create_flywheel',          displayName: 'Flywheel',                  blockId: 'create:flywheel',                       isFramed: false, category: 'create_extended', rendererColor: '#9a8a7a' },
  { id: 'create_cogwheel',          displayName: 'Cogwheel',                  blockId: 'create:cogwheel',                       isFramed: false, category: 'create_extended', rendererColor: '#8a7050' },
  { id: 'create_large_cogwheel',    displayName: 'Large Cogwheel',            blockId: 'create:large_cogwheel',                 isFramed: false, category: 'create_extended', rendererColor: '#8a7050' },
  { id: 'create_sail_frame',        displayName: 'Sail Frame',                blockId: 'create:sail_frame',                     isFramed: false, category: 'create_extended', rendererColor: '#c0b890' },
  { id: 'create_track',             displayName: 'Track',                     blockId: 'create:track',                          isFramed: false, category: 'create_extended', rendererColor: '#7a6a5a' },
  { id: 'create_display_link',      displayName: 'Display Link',              blockId: 'create:display_link',                   isFramed: false, category: 'create_extended', rendererColor: '#5a6878' },
  { id: 'create_nixie_tube',        displayName: 'Nixie Tube',                blockId: 'create:nixie_tube',                     isFramed: false, category: 'create_extended', rendererColor: '#4060a0', isLightSource: true },
  { id: 'create_item_drain',        displayName: 'Item Drain',                blockId: 'create:item_drain',                     isFramed: false, category: 'create_extended', rendererColor: '#6a7888' },
  { id: 'create_spout',             displayName: 'Spout',                     blockId: 'create:spout',                          isFramed: false, category: 'create_extended', rendererColor: '#5a6878' },
  { id: 'create_mechanical_arm',    displayName: 'Mechanical Arm',            blockId: 'create:mechanical_arm',                 isFramed: false, category: 'create_extended', rendererColor: '#8a7a6a' },
  { id: 'create_rose_quartz_lamp',  displayName: 'Rose Quartz Lamp',          blockId: 'create:rose_quartz_lamp',               isFramed: false, category: 'create_extended', rendererColor: '#e080a0', isLightSource: true },
  { id: 'create_chromatic_compound',displayName: 'Chromatic Compound',        blockId: 'create:chromatic_compound',             isFramed: false, category: 'create_extended', rendererColor: '#a060c0' },
  { id: 'create_refined_radiance',  displayName: 'Refined Radiance',          blockId: 'create:refined_radiance',               isFramed: false, category: 'create_extended', rendererColor: '#f0f0e8', isLightSource: true },

  // ── framed_decorative ────────────────────────────────────────────────────

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

  // ── ie_extended ──────────────────────────────────────────────────────────

  { id: 'ie_storage_copper',        displayName: 'IE Copper Block',           blockId: 'immersiveengineering:storage_copper',        isFramed: false, category: 'ie_extended', rendererColor: '#c87840' },
  { id: 'ie_storage_silver',        displayName: 'IE Silver Block',           blockId: 'immersiveengineering:storage_silver',        isFramed: false, category: 'ie_extended', rendererColor: '#c0c8d0' },
  { id: 'ie_storage_nickel',        displayName: 'IE Nickel Block',           blockId: 'immersiveengineering:storage_nickel',        isFramed: false, category: 'ie_extended', rendererColor: '#a8b098' },
  { id: 'ie_concrete_tile',         displayName: 'IE Concrete Tile',          blockId: 'immersiveengineering:concrete_tile',         isFramed: false, category: 'ie_extended', rendererColor: '#888880' },
  { id: 'ie_concrete_leaded',       displayName: 'IE Leaded Concrete',        blockId: 'immersiveengineering:concrete_leaded',       isFramed: false, category: 'ie_extended', rendererColor: '#7a7a72' },
  { id: 'ie_hempcrete',             displayName: 'IE Hempcrete',              blockId: 'immersiveengineering:hempcrete',             isFramed: false, category: 'ie_extended', rendererColor: '#909878' },
  { id: 'ie_engineering_light',     displayName: 'IE Engineering Light',      blockId: 'immersiveengineering:engineering_light',     isFramed: false, category: 'ie_extended', rendererColor: '#d0e0f0', isLightSource: true },
  { id: 'ie_lantern',               displayName: 'IE Lantern',                blockId: 'immersiveengineering:lantern',               isFramed: false, category: 'ie_extended', rendererColor: '#d09030', isLightSource: true },
  { id: 'ie_razor_wire',            displayName: 'IE Razor Wire',             blockId: 'immersiveengineering:razor_wire',            isFramed: false, category: 'ie_extended', rendererColor: '#9a9aaa' },
  { id: 'ie_strip_curtain',         displayName: 'IE Strip Curtain',          blockId: 'immersiveengineering:strip_curtain',         isFramed: false, category: 'ie_extended', rendererColor: '#c0a840' },

  // ── mekanism ─────────────────────────────────────────────────────────────

  { id: 'mek_steel_casing',         displayName: 'Mek Steel Casing',          blockId: 'mekanism:steel_casing',                     isFramed: false, category: 'mekanism', rendererColor: '#5a6878' },
  { id: 'mek_basic_control',        displayName: 'Mek Basic Control Circuit', blockId: 'mekanism:basic_control_circuit',            isFramed: false, category: 'mekanism', rendererColor: '#3a5a3a' },
  { id: 'mek_hdpe',                 displayName: 'Mek HDPE Glass',            blockId: 'mekanism:hdpe_reinforced_glass',            isFramed: false, category: 'mekanism', rendererColor: '#a0c8d0' },
  { id: 'mek_teleporter_frame',     displayName: 'Mek Teleporter Frame',      blockId: 'mekanism:teleporter_frame',                 isFramed: false, category: 'mekanism', rendererColor: '#2a3a5a' },

  // ── mekanism_extended ────────────────────────────────────────────────────

  { id: 'mek_bronze_block',         displayName: 'Mek Bronze Block',          blockId: 'mekanism:bronze_block',                     isFramed: false, category: 'mekanism_extended', rendererColor: '#9a7030' },
  { id: 'mek_osmium_block',         displayName: 'Mek Osmium Block',          blockId: 'mekanism:osmium_block',                     isFramed: false, category: 'mekanism_extended', rendererColor: '#5a7888' },
  { id: 'mek_tin_block',            displayName: 'Mek Tin Block',             blockId: 'mekanism:tin_block',                        isFramed: false, category: 'mekanism_extended', rendererColor: '#a0b0b8' },
  { id: 'mek_uranium_block',        displayName: 'Mek Uranium Block',         blockId: 'mekanism:uranium_block',                    isFramed: false, category: 'mekanism_extended', rendererColor: '#507840' },
  { id: 'mek_fluorite_block',       displayName: 'Mek Fluorite Block',        blockId: 'mekanism:fluorite_block',                   isFramed: false, category: 'mekanism_extended', rendererColor: '#60a890' },
  { id: 'mek_ultimate_casing',      displayName: 'Mek Ultimate Machine Casing', blockId: 'mekanism:ultimate_machine_casing',        isFramed: false, category: 'mekanism_extended', rendererColor: '#4a5878' },
  { id: 'mek_reinforced_glass',     displayName: 'Mek Reinforced Glass',      blockId: 'mekanism:reinforced_glass',                 isFramed: false, category: 'mekanism_extended', rendererColor: '#a0c8d0' },
  { id: 'mek_structural_glass',     displayName: 'Mek Structural Glass',      blockId: 'mekanism:structural_glass',                 isFramed: false, category: 'mekanism_extended', rendererColor: '#90b8c8' },
  { id: 'mek_dynamic_glass',        displayName: 'Mek Dynamic Glass',         blockId: 'mekanism:dynamic_glass',                    isFramed: false, category: 'mekanism_extended', rendererColor: '#80a8c0' },

  // ── thermal ───────────────────────────────────────────────────────────────

  { id: 'thermal_machine_frame',    displayName: 'Thermal Machine Frame',     blockId: 'thermal:machine_frame',                     isFramed: false, category: 'thermal', rendererColor: '#7a6a3a' },
  { id: 'thermal_rockwool',         displayName: 'Thermal Rockwool',          blockId: 'thermal:rockwool',                          isFramed: false, category: 'thermal', rendererColor: '#8a7a6a' },
  { id: 'thermal_duct',             displayName: 'Thermal Duct',              blockId: 'thermal:duct',                              isFramed: false, category: 'thermal', rendererColor: '#6a5a4a' },

  // ── thermal_extended ─────────────────────────────────────────────────────

  { id: 'thermal_tin_block',        displayName: 'Thermal Tin Block',         blockId: 'thermal:tin_block',                         isFramed: false, category: 'thermal_extended', rendererColor: '#a0b0b8' },
  { id: 'thermal_lead_block',       displayName: 'Thermal Lead Block',        blockId: 'thermal:lead_block',                        isFramed: false, category: 'thermal_extended', rendererColor: '#5a5a6a' },
  { id: 'thermal_silver_block',     displayName: 'Thermal Silver Block',      blockId: 'thermal:silver_block',                      isFramed: false, category: 'thermal_extended', rendererColor: '#c0c8d0' },
  { id: 'thermal_nickel_block',     displayName: 'Thermal Nickel Block',      blockId: 'thermal:nickel_block',                      isFramed: false, category: 'thermal_extended', rendererColor: '#a8b098' },
  { id: 'thermal_platinum_block',   displayName: 'Thermal Platinum Block',    blockId: 'thermal:platinum_block',                    isFramed: false, category: 'thermal_extended', rendererColor: '#c0d0e0' },
  { id: 'thermal_enderium_block',   displayName: 'Thermal Enderium Block',    blockId: 'thermal:enderium_block',                    isFramed: false, category: 'thermal_extended', rendererColor: '#308080' },
  { id: 'thermal_lumium_block',     displayName: 'Thermal Lumium Block',      blockId: 'thermal:lumium_block',                      isFramed: false, category: 'thermal_extended', rendererColor: '#d0c040', isLightSource: true },
  { id: 'thermal_signalum_block',   displayName: 'Thermal Signalum Block',    blockId: 'thermal:signalum_block',                    isFramed: false, category: 'thermal_extended', rendererColor: '#c04020' },
  { id: 'thermal_pyrotheum',        displayName: 'Blazing Pyrotheum',         blockId: 'thermal:blazing_pyrotheum',                 isFramed: false, category: 'thermal_extended', rendererColor: '#e06020', isLightSource: true },
  { id: 'thermal_cryotheum',        displayName: 'Gelidium Cryotheum',        blockId: 'thermal:gelidium_cryotheum',                isFramed: false, category: 'thermal_extended', rendererColor: '#40a0c0', isLightSource: true },
  { id: 'thermal_aerotheum',        displayName: 'Aerotheum',                 blockId: 'thermal:aerotheum',                         isFramed: false, category: 'thermal_extended', rendererColor: '#80c0e0' },
  { id: 'thermal_petrotheum',       displayName: 'Petrotheum',                blockId: 'thermal:petrotheum',                        isFramed: false, category: 'thermal_extended', rendererColor: '#404840' },

  // ── lighting ─────────────────────────────────────────────────────────────

  { id: 'lantern',                  displayName: 'Lantern',                   blockId: 'minecraft:lantern',                         isFramed: false, properties: { hanging: 'false' }, category: 'lighting', rendererColor: '#d0a040', isLightSource: true },
  { id: 'soul_lantern',             displayName: 'Soul Lantern',              blockId: 'minecraft:soul_lantern',                    isFramed: false, properties: { hanging: 'false' }, category: 'lighting', rendererColor: '#40a0d0', isLightSource: true },
  { id: 'sea_lantern',              displayName: 'Sea Lantern',               blockId: 'minecraft:sea_lantern',                     isFramed: false, category: 'lighting', rendererColor: '#a0c8cc', isLightSource: true },
  { id: 'glowstone',                displayName: 'Glowstone',                 blockId: 'minecraft:glowstone',                       isFramed: false, category: 'lighting', rendererColor: '#e0c060', isLightSource: true },
  { id: 'shroomlight',              displayName: 'Shroomlight',               blockId: 'minecraft:shroomlight',                     isFramed: false, category: 'lighting', rendererColor: '#e09040', isLightSource: true },
  { id: 'end_rod',                  displayName: 'End Rod',                   blockId: 'minecraft:end_rod',                         isFramed: false, properties: { facing: 'up' }, category: 'lighting', rendererColor: '#f0f0e0', isLightSource: true },
  { id: 'create_blaze_lantern',     displayName: 'Create Blaze Lantern',      blockId: 'create:blaze_lantern',                      isFramed: false, category: 'lighting', rendererColor: '#e06020', isLightSource: true },

  // ── accent_glass ─────────────────────────────────────────────────────────

  { id: 'tinted_glass',             displayName: 'Tinted Glass',              blockId: 'minecraft:tinted_glass',                    isFramed: false, category: 'accent_glass', rendererColor: '#2a2a3a' },
  { id: 'cyan_glass',               displayName: 'Cyan Stained Glass',        blockId: 'minecraft:cyan_stained_glass',              isFramed: false, category: 'accent_glass', rendererColor: '#20a0b0' },
  { id: 'purple_glass',             displayName: 'Purple Stained Glass',      blockId: 'minecraft:purple_stained_glass',            isFramed: false, category: 'accent_glass', rendererColor: '#8020a0' },
  { id: 'blue_glass',               displayName: 'Blue Stained Glass',        blockId: 'minecraft:blue_stained_glass',              isFramed: false, category: 'accent_glass', rendererColor: '#2040b0' },
  { id: 'create_framed_glass',      displayName: 'Create Framed Glass',       blockId: 'create:framed_glass',                       isFramed: false, category: 'accent_glass', rendererColor: '#d0e8f0' },

  // ── ae2 ──────────────────────────────────────────────────────────────────

  { id: 'ae2_quartz_block',         displayName: 'AE2 Quartz Block',          blockId: 'ae2:quartz_block',                          isFramed: false, category: 'ae2', rendererColor: '#d0c8e8' },
  { id: 'ae2_fluix_block',          displayName: 'AE2 Fluix Block',           blockId: 'ae2:fluix_block',                           isFramed: false, category: 'ae2', rendererColor: '#9070c0' },
  { id: 'ae2_sky_stone_block',      displayName: 'AE2 Sky Stone',             blockId: 'ae2:sky_stone_block',                       isFramed: false, category: 'ae2', rendererColor: '#4a4a52' },
  { id: 'ae2_sky_stone_brick',      displayName: 'AE2 Sky Stone Brick',       blockId: 'ae2:sky_stone_brick',                       isFramed: false, category: 'ae2', rendererColor: '#525260' },
  { id: 'ae2_sky_stone_small_brick',displayName: 'AE2 Sky Stone Small Brick', blockId: 'ae2:sky_stone_small_brick',                 isFramed: false, category: 'ae2', rendererColor: '#484856' },
  { id: 'ae2_quartz_glass',         displayName: 'AE2 Quartz Glass',          blockId: 'ae2:quartz_glass',                          isFramed: false, category: 'ae2', rendererColor: '#c0b8e0' },
  { id: 'ae2_fluix_glass',          displayName: 'AE2 Fluix Glass',           blockId: 'ae2:fluix_glass',                           isFramed: false, category: 'ae2', rendererColor: '#a080d0' },
  { id: 'ae2_me_chest',             displayName: 'AE2 ME Chest',              blockId: 'ae2:me_chest',                              isFramed: false, category: 'ae2', rendererColor: '#304878' },
  { id: 'ae2_controller',           displayName: 'AE2 ME Controller',         blockId: 'ae2:controller',                            isFramed: false, category: 'ae2', rendererColor: '#203060', isLightSource: true },
  { id: 'ae2_drive',                displayName: 'AE2 ME Drive',              blockId: 'ae2:drive',                                 isFramed: false, category: 'ae2', rendererColor: '#284070' },
  { id: 'ae2_energy_acceptor',      displayName: 'AE2 Energy Acceptor',       blockId: 'ae2:energy_acceptor',                       isFramed: false, category: 'ae2', rendererColor: '#204060' },
  { id: 'ae2_crafting_unit',        displayName: 'AE2 Crafting Unit',         blockId: 'ae2:crafting_unit',                         isFramed: false, category: 'ae2', rendererColor: '#283850' },

  // ── powah ─────────────────────────────────────────────────────────────────

  { id: 'powah_thermo_generator',   displayName: 'Powah Thermo Generator',    blockId: 'powah:thermo_generator_basic',              isFramed: false, category: 'powah', rendererColor: '#c04020' },
  { id: 'powah_energizing_orb',     displayName: 'Powah Energizing Orb',      blockId: 'powah:energizing_orb',                      isFramed: false, category: 'powah', rendererColor: '#4060c0', isLightSource: true },
  { id: 'powah_dielectric_casing',  displayName: 'Powah Dielectric Casing',   blockId: 'powah:dielectric_casing',                   isFramed: false, category: 'powah', rendererColor: '#5a6878' },
  { id: 'powah_crystal_blazing',    displayName: 'Powah Blazing Crystal',     blockId: 'powah:crystal_block_blazing',               isFramed: false, category: 'powah', rendererColor: '#e06020', isLightSource: true },
  { id: 'powah_crystal_niotic',     displayName: 'Powah Niotic Crystal',      blockId: 'powah:crystal_block_niotic',                isFramed: false, category: 'powah', rendererColor: '#4080c0', isLightSource: true },
  { id: 'powah_crystal_spirited',   displayName: 'Powah Spirited Crystal',    blockId: 'powah:crystal_block_spirited',              isFramed: false, category: 'powah', rendererColor: '#80c040', isLightSource: true },
  { id: 'powah_crystal_nitro',      displayName: 'Powah Nitro Crystal',       blockId: 'powah:crystal_block_nitro',                 isFramed: false, category: 'powah', rendererColor: '#c04080', isLightSource: true },

  // ── botania ───────────────────────────────────────────────────────────────

  { id: 'botania_livingrock',       displayName: 'Botania Livingrock',        blockId: 'botania:livingrock',                        isFramed: false, category: 'botania', rendererColor: '#c0b8a8' },
  { id: 'botania_livingrock_brick', displayName: 'Botania Livingrock Brick',  blockId: 'botania:livingrock_brick',                  isFramed: false, category: 'botania', rendererColor: '#b8a898' },
  { id: 'botania_shimmerrock',      displayName: 'Botania Shimmerrock',       blockId: 'botania:shimmerrock',                       isFramed: false, category: 'botania', rendererColor: '#c8c0e0' },
  { id: 'botania_livingwood_log',   displayName: 'Botania Livingwood',        blockId: 'botania:livingwood_log',                    isFramed: false, category: 'botania', rendererColor: '#7a6a4a' },
  { id: 'botania_dreamwood_log',    displayName: 'Botania Dreamwood',         blockId: 'botania:dreamwood_log',                     isFramed: false, category: 'botania', rendererColor: '#c8b8d8' },
  { id: 'botania_mana_glass',       displayName: 'Botania Mana Glass',        blockId: 'botania:mana_glass',                        isFramed: false, category: 'botania', rendererColor: '#80a0ff', isLightSource: true },
  { id: 'botania_elfglass',         displayName: 'Botania Elf Glass',         blockId: 'botania:elfglass',                          isFramed: false, category: 'botania', rendererColor: '#80ffa0', isLightSource: true },
  { id: 'botania_bifrost_block',    displayName: 'Botania Bifrost',           blockId: 'botania:bifrost_block',                     isFramed: false, category: 'botania', rendererColor: '#a0e0ff', isLightSource: true },
  { id: 'botania_starfield',        displayName: 'Botania Starfield Creator', blockId: 'botania:starfield_creator',                 isFramed: false, category: 'botania', rendererColor: '#202840' },

  // ── occultism ─────────────────────────────────────────────────────────────

  { id: 'occultism_otherstone',     displayName: 'Occultism Otherstone',      blockId: 'occultism:otherstone',                      isFramed: false, category: 'occultism', rendererColor: '#3a3248' },
  { id: 'occultism_otherstone_brick',displayName: 'Occultism Otherstone Brick',blockId: 'occultism:otherstone_brick',              isFramed: false, category: 'occultism', rendererColor: '#423850' },
  { id: 'occultism_silver_block',   displayName: 'Occultism Silver Block',    blockId: 'occultism:silver_block',                    isFramed: false, category: 'occultism', rendererColor: '#c0c8d0' },
  { id: 'occultism_iesnium_block',  displayName: 'Occultism Iesnium Block',   blockId: 'occultism:iesnium_block',                   isFramed: false, category: 'occultism', rendererColor: '#504868' },
  { id: 'occultism_spirit_lantern', displayName: 'Occultism Spirit Lantern',  blockId: 'occultism:spirit_lantern',                  isFramed: false, category: 'occultism', rendererColor: '#8060c0', isLightSource: true },

  // ── supplementaries ──────────────────────────────────────────────────────

  { id: 'supplementaries_flag',     displayName: 'Supplementaries Flag',      blockId: 'supplementaries:flag',                      isFramed: false, category: 'supplementaries', rendererColor: '#8a7a6a' },
  { id: 'supplementaries_sign_post',displayName: 'Supplementaries Sign Post', blockId: 'supplementaries:sign_post',                 isFramed: false, category: 'supplementaries', rendererColor: '#7a6a4a' },
  { id: 'supplementaries_rope',     displayName: 'Supplementaries Rope',      blockId: 'supplementaries:rope',                      isFramed: false, category: 'supplementaries', rendererColor: '#8a7040' },
  { id: 'supplementaries_lantern',  displayName: 'Supplementaries Lantern',   blockId: 'supplementaries:lantern',                   isFramed: false, category: 'supplementaries', rendererColor: '#d0a040', isLightSource: true },
  { id: 'supplementaries_jar',      displayName: 'Supplementaries Jar',       blockId: 'supplementaries:jar',                       isFramed: false, category: 'supplementaries', rendererColor: '#c0d8e0' },
  { id: 'supplementaries_notice_board',displayName: 'Supplementaries Notice Board', blockId: 'supplementaries:notice_board',       isFramed: false, category: 'supplementaries', rendererColor: '#9a7a5a' },
  { id: 'supplementaries_sconce',   displayName: 'Supplementaries Sconce',    blockId: 'supplementaries:sconce',                    isFramed: false, category: 'supplementaries', rendererColor: '#c08030', isLightSource: true },

  // ── macaws ───────────────────────────────────────────────────────────────

  { id: 'mcwfurnitures_oak_table',  displayName: "Macaw's Oak Table",         blockId: 'mcwfurnitures:oak_table',                   isFramed: false, category: 'macaws', rendererColor: '#8a6a4a' },
  { id: 'mcwfurnitures_iron_table', displayName: "Macaw's Iron Table",        blockId: 'mcwfurnitures:iron_table',                  isFramed: false, category: 'macaws', rendererColor: '#9a9aaa' },
  { id: 'mcwfurnitures_steel_table',displayName: "Macaw's Steel Table",       blockId: 'mcwfurnitures:steel_table',                 isFramed: false, category: 'macaws', rendererColor: '#7a8a9a' },
  { id: 'mcwfurnitures_oak_cabinet',displayName: "Macaw's Oak Cabinet",       blockId: 'mcwfurnitures:oak_cabinet',                 isFramed: false, category: 'macaws', rendererColor: '#7a5a3a' },
  { id: 'mcwfurnitures_iron_shelf', displayName: "Macaw's Iron Shelf",        blockId: 'mcwfurnitures:iron_shelf',                  isFramed: false, category: 'macaws', rendererColor: '#8a9aaa' },
  { id: 'mcwwindows_oak_window',    displayName: "Macaw's Oak Window",        blockId: 'mcwwindows:oak_window',                     isFramed: false, category: 'macaws', rendererColor: '#c8b090' },
  { id: 'mcwwindows_iron_window',   displayName: "Macaw's Iron Window",       blockId: 'mcwwindows:iron_window',                    isFramed: false, category: 'macaws', rendererColor: '#9a9aaa' },
  { id: 'mcwwindows_steel_window',  displayName: "Macaw's Steel Window",      blockId: 'mcwwindows:steel_window',                   isFramed: false, category: 'macaws', rendererColor: '#8a9aaa' },
  { id: 'mcwwindows_framed_window', displayName: "Macaw's Framed Window",     blockId: 'mcwwindows:framed_window',                  isFramed: false, category: 'macaws', rendererColor: '#c0d8e0' },
  { id: 'mcwdoors_iron_door',       displayName: "Macaw's Iron Door",         blockId: 'mcwdoors:iron_door',                        isFramed: false, category: 'macaws', rendererColor: '#aaaaaa' },
  { id: 'mcwdoors_steel_door',      displayName: "Macaw's Steel Door",        blockId: 'mcwdoors:steel_door',                       isFramed: false, category: 'macaws', rendererColor: '#8a9aaa' },
  { id: 'mcwdoors_glass_door',      displayName: "Macaw's Glass Door",        blockId: 'mcwdoors:glass_door',                       isFramed: false, category: 'macaws', rendererColor: '#c0d8e0' },

  // ── chipped ───────────────────────────────────────────────────────────────

  { id: 'chipped_alchemist_bookshelf', displayName: 'Chipped Alchemist Bookshelf', blockId: 'chipped:alchemist_bookshelf',         isFramed: false, category: 'chipped', rendererColor: '#7a5a3a' },
  { id: 'chipped_framed_stone',     displayName: 'Chipped Framed Stone',      blockId: 'chipped:framed_stone',                      isFramed: false, category: 'chipped', rendererColor: '#8a8a8a' },
  { id: 'chipped_mossy_stone_bricks',displayName: 'Chipped Mossy Stone Bricks',blockId: 'chipped:mossy_stone_bricks',              isFramed: false, category: 'chipped', rendererColor: '#6a7a5a' },
  { id: 'chipped_cracked_deepslate',displayName: 'Chipped Cracked Deepslate', blockId: 'chipped:cracked_deepslate',                 isFramed: false, category: 'chipped', rendererColor: '#3a3a42' },
  { id: 'chipped_smooth_basalt_bricks',displayName: 'Chipped Smooth Basalt Bricks', blockId: 'chipped:smooth_basalt_bricks',       isFramed: false, category: 'chipped', rendererColor: '#3a3a3a' },
  { id: 'chipped_polished_deepslate_bricks',displayName: 'Chipped Polished Deepslate Bricks', blockId: 'chipped:polished_deepslate_bricks', isFramed: false, category: 'chipped', rendererColor: '#2e2e38' },
  { id: 'chipped_gilded_deepslate', displayName: 'Chipped Gilded Deepslate',  blockId: 'chipped:gilded_deepslate',                  isFramed: false, category: 'chipped', rendererColor: '#3a3020' },
  { id: 'chipped_etched_copper',    displayName: 'Chipped Etched Copper',     blockId: 'chipped:etched_copper',                     isFramed: false, category: 'chipped', rendererColor: '#7a5a3a' },
  { id: 'chipped_corroded_copper',  displayName: 'Chipped Corroded Copper',   blockId: 'chipped:corroded_copper',                   isFramed: false, category: 'chipped', rendererColor: '#4a7a5a' },
  { id: 'chipped_bronze_bricks',    displayName: 'Chipped Bronze Bricks',     blockId: 'chipped:bronze_bricks',                     isFramed: false, category: 'chipped', rendererColor: '#8a6a3a' },
  { id: 'chipped_rusted_iron',      displayName: 'Chipped Rusted Iron',       blockId: 'chipped:rusted_iron',                       isFramed: false, category: 'chipped', rendererColor: '#7a4a3a' },
  { id: 'chipped_steel_bricks',     displayName: 'Chipped Steel Bricks',      blockId: 'chipped:steel_bricks',                      isFramed: false, category: 'chipped', rendererColor: '#5a6878' },

  // ── decorative_blocks ────────────────────────────────────────────────────

  { id: 'decorative_rocky_dirt',    displayName: 'Rocky Dirt',                blockId: 'decorative_blocks:rocky_dirt',              isFramed: false, category: 'decorative_blocks', rendererColor: '#6a5a3a' },
  { id: 'decorative_cave_moss',     displayName: 'Cave Moss',                 blockId: 'decorative_blocks:cave_moss',               isFramed: false, category: 'decorative_blocks', rendererColor: '#4a6a3a' },
  { id: 'decorative_bonfire',       displayName: 'Bonfire',                   blockId: 'decorative_blocks:bonfire',                 isFramed: false, category: 'decorative_blocks', rendererColor: '#e06020', isLightSource: true },
  { id: 'decorative_chandelier',    displayName: 'Chandelier',                blockId: 'decorative_blocks:chandelier',              isFramed: false, category: 'decorative_blocks', rendererColor: '#d0a040', isLightSource: true },
  { id: 'decorative_chain',         displayName: 'Decorative Chain',          blockId: 'decorative_blocks:chain',                   isFramed: false, category: 'decorative_blocks', rendererColor: '#8a8a9a' },
  { id: 'decorative_brazier',       displayName: 'Brazier',                   blockId: 'decorative_blocks:brazier',                 isFramed: false, category: 'decorative_blocks', rendererColor: '#c06020', isLightSource: true },
  { id: 'decorative_wall_lantern',  displayName: 'Wall Lantern',              blockId: 'decorative_blocks:wall_lantern',            isFramed: false, category: 'decorative_blocks', rendererColor: '#d09030', isLightSource: true },
  { id: 'decorative_iron_lattice',  displayName: 'Iron Lattice',              blockId: 'decorative_blocks:iron_lattice',            isFramed: false, category: 'decorative_blocks', rendererColor: '#7a7a8a' },
  { id: 'decorative_paper_wall',    displayName: 'Paper Wall',                blockId: 'decorative_blocks:paper_wall',              isFramed: false, category: 'decorative_blocks', rendererColor: '#e0d8c0' },
  { id: 'decorative_support',       displayName: 'Support',                   blockId: 'decorative_blocks:support',                 isFramed: false, category: 'decorative_blocks', rendererColor: '#8a7a5a' },
  { id: 'decorative_hedge',         displayName: 'Hedge',                     blockId: 'decorative_blocks:hedge',                   isFramed: false, category: 'decorative_blocks', rendererColor: '#3a6a2a' },
  { id: 'decorative_thatch',        displayName: 'Thatch',                    blockId: 'decorative_blocks:thatch',                  isFramed: false, category: 'decorative_blocks', rendererColor: '#c0a040' },

  // ── utility_decorative ───────────────────────────────────────────────────

  { id: 'dark_utilities_ender_hopper', displayName: 'Dark Utilities Ender Hopper', blockId: 'dark_utilities:ender_hopper',         isFramed: false, category: 'utility_decorative', rendererColor: '#2a0a3a' },
  { id: 'dark_utilities_filter_block', displayName: 'Dark Utilities Filter Block', blockId: 'dark_utilities:filter_block',         isFramed: false, category: 'utility_decorative', rendererColor: '#3a5a3a' },

  // ── storage ───────────────────────────────────────────────────────────────

  { id: 'storagedrawers_oak_drawers',  displayName: 'Storage Drawers Oak (1x)',  blockId: 'storagedrawers:oak_full_drawers_1',    isFramed: false, category: 'storage', rendererColor: '#9a7a4a' },
  { id: 'storagedrawers_iron_drawers', displayName: 'Storage Drawers Iron (1x)', blockId: 'storagedrawers:iron_full_drawers_1',   isFramed: false, category: 'storage', rendererColor: '#8a9aaa' },
  { id: 'storagedrawers_trim',         displayName: 'Storage Drawers Trim',      blockId: 'storagedrawers:trim',                  isFramed: false, category: 'storage', rendererColor: '#7a6a5a' },

  // ── generated Luminax entries (128 blocks) ───────────────────────────────
  ...generateLuminaxEntries(),
]

// =============================================================================
// Internal lookup maps
// =============================================================================

const ENTRY_MAP = new Map<string, RegistryEntry>()
for (const entry of REGISTRY_ENTRIES) {
  if (!ENTRY_MAP.has(entry.id)) ENTRY_MAP.set(entry.id, entry)
}

const CATEGORY_MAP = new Map<string, RegistryEntry[]>()
for (const entry of REGISTRY_ENTRIES) {
  if (!CATEGORY_MAP.has(entry.category)) CATEGORY_MAP.set(entry.category, [])
  CATEGORY_MAP.get(entry.category)!.push(entry)
}

interface BlockMeta { rendererColor: string; isLightSource: boolean }
const BLOCKID_META_MAP = new Map<string, BlockMeta>()
for (const entry of REGISTRY_ENTRIES) {
  if (!entry.isFramed && !BLOCKID_META_MAP.has(entry.blockId)) {
    BLOCKID_META_MAP.set(entry.blockId, {
      rendererColor: entry.rendererColor,
      isLightSource: entry.isLightSource ?? false,
    })
  }
}

// =============================================================================
// Public query helpers
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
// Core: resolve an abstract material name → ResolvedBlock
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

export function resolveBlock(name: string | undefined | null): ResolvedBlock {
  if (!name) return { ...DEFAULT_RESOLVED }
  const trimmed = name.trim()

  if (trimmed.includes(':')) {
    return { blockId: trimmed, blockState: {} }
  }

  const key = normalizeKey(trimmed)
  const entry = ENTRY_MAP.get(key)
  if (entry) return entryToResolved(entry)

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

  console.warn(`[blockRegistry] unknown material '${name}', falling back to minecraft:stone_bricks`)
  return { ...DEFAULT_RESOLVED }
}

// =============================================================================
// Utility helpers
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

export function softFallback(blockId: string): string {
  return SOFT_FALLBACK[blockId] ?? blockId
}

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

export function getCamoBlockId(nbtData: Record<string, unknown> | undefined): string | null {
  if (!nbtData) return null
  const camo = nbtData['CamoState'] as { Name?: unknown } | undefined
  if (camo && typeof camo.Name === 'string') return camo.Name
  return null
}

export const FRAMED_CUBE_BLOCK_ID = FRAMED_BLOCK_ID
export const UTILITY_GAP_BLOCK_ID = 'minecraft:smooth_stone_slab'

// =============================================================================
// Renderer color / meta lookup by blockId
// =============================================================================

export function getRendererColorByBlockId(blockId: string): string | undefined {
  return BLOCKID_META_MAP.get(blockId)?.rendererColor
}

export function getBlockMeta(blockId: string): BlockMeta | undefined {
  return BLOCKID_META_MAP.get(blockId)
}

// =============================================================================
// Runtime custom registry loader (Node.js server-side only)
// =============================================================================

/**
 * Merges a user-provided JSON file (array of RegistryEntry) into the live
 * registry at startup. Silently skips if the file is absent or malformed.
 * No-op in browser environments.
 */
export async function loadCustomRegistry(filePath: string): Promise<void> {
  if (typeof window !== 'undefined') return
  try {
    const { readFileSync } = await import('fs')
    const raw = readFileSync(filePath, 'utf-8')
    const custom = JSON.parse(raw) as RegistryEntry[]
    for (const entry of custom) {
      REGISTRY_ENTRIES.push(entry)
      if (!ENTRY_MAP.has(entry.id)) ENTRY_MAP.set(entry.id, entry)
      if (!CATEGORY_MAP.has(entry.category)) CATEGORY_MAP.set(entry.category, [])
      CATEGORY_MAP.get(entry.category)!.push(entry)
      if (!entry.isFramed && !BLOCKID_META_MAP.has(entry.blockId)) {
        BLOCKID_META_MAP.set(entry.blockId, {
          rendererColor: entry.rendererColor,
          isLightSource: entry.isLightSource ?? false,
        })
      }
    }
  } catch {
    // File absent, unreadable, or malformed — no-op
  }
}
