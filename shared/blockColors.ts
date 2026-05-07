// Approximate block colors for the renderer — fallback palette for unknown blocks
// Based on standard Minecraft block textures. Modded blocks get a category-based fallback.
import { getBlockMeta } from './blockRegistry.js'

export interface BlockColorEntry {
  color: string      // #rrggbb
  emissive?: boolean
}

const KNOWN_COLORS: Record<string, BlockColorEntry> = {
  // Air
  'minecraft:air': { color: '#00000000' },
  'minecraft:cave_air': { color: '#00000000' },

  // Stone family
  'minecraft:stone': { color: '#7F7F7F' },
  'minecraft:cobblestone': { color: '#6B6B6B' },
  'minecraft:stone_bricks': { color: '#787878' },
  'minecraft:cracked_stone_bricks': { color: '#706B6B' },
  'minecraft:mossy_stone_bricks': { color: '#6B7862' },
  'minecraft:chiseled_stone_bricks': { color: '#808080' },
  'minecraft:smooth_stone': { color: '#8A8A8A' },
  'minecraft:deepslate': { color: '#545454' },
  'minecraft:deepslate_bricks': { color: '#5A5A5A' },
  'minecraft:polished_deepslate': { color: '#575757' },
  'minecraft:tuff': { color: '#7A7A72' },
  'minecraft:calcite': { color: '#D0CECC' },
  'minecraft:dripstone_block': { color: '#8B7355' },
  'minecraft:granite': { color: '#9D6B53' },
  'minecraft:diorite': { color: '#BFBFBF' },
  'minecraft:andesite': { color: '#8A8A8A' },
  'minecraft:polished_granite': { color: '#9D6B53' },
  'minecraft:polished_diorite': { color: '#BFBFBF' },
  'minecraft:polished_andesite': { color: '#8A8A8A' },
  'minecraft:basalt': { color: '#4A4A4A' },
  'minecraft:smooth_basalt': { color: '#484848' },
  'minecraft:blackstone': { color: '#2B272E' },
  'minecraft:polished_blackstone': { color: '#2F2B33' },
  'minecraft:polished_blackstone_bricks': { color: '#2E2A32' },
  'minecraft:netherrack': { color: '#7C3232' },
  'minecraft:nether_bricks': { color: '#3A1E1E' },
  'minecraft:obsidian': { color: '#1A0D24' },
  'minecraft:crying_obsidian': { color: '#2C0D52', emissive: true },
  'minecraft:end_stone': { color: '#D4CC9A' },
  'minecraft:end_stone_bricks': { color: '#D4CC9A' },

  // Wood
  'minecraft:oak_planks': { color: '#9E814A' },
  'minecraft:spruce_planks': { color: '#6B4A2A' },
  'minecraft:birch_planks': { color: '#D4C88C' },
  'minecraft:jungle_planks': { color: '#9B6B4A' },
  'minecraft:acacia_planks': { color: '#B46337' },
  'minecraft:dark_oak_planks': { color: '#3B2B1A' },
  'minecraft:mangrove_planks': { color: '#7D3532' },
  'minecraft:cherry_planks': { color: '#E4A0A0' },
  'minecraft:bamboo_planks': { color: '#C6B45A' },
  'minecraft:crimson_planks': { color: '#6B1B2E' },
  'minecraft:warped_planks': { color: '#2B6B6B' },

  // Dirt / grass
  'minecraft:dirt': { color: '#7A5533' },
  'minecraft:grass_block': { color: '#5D8A35' },
  'minecraft:coarse_dirt': { color: '#6B4A2A' },
  'minecraft:podzol': { color: '#5A3D21' },
  'minecraft:mycelium': { color: '#7A6272' },
  'minecraft:sand': { color: '#D6C87A' },
  'minecraft:red_sand': { color: '#C67044' },
  'minecraft:gravel': { color: '#8A7A6A' },
  'minecraft:clay': { color: '#9B9BAD' },
  'minecraft:mud': { color: '#3D3326' },

  // Ores and metals
  'minecraft:coal_ore': { color: '#3A3A3A' },
  'minecraft:iron_ore': { color: '#8A6A5A' },
  'minecraft:copper_ore': { color: '#8A5A3A' },
  'minecraft:gold_ore': { color: '#D4A22A' },
  'minecraft:redstone_ore': { color: '#8A2A1A', emissive: true },
  'minecraft:lapis_ore': { color: '#2A4A8A' },
  'minecraft:diamond_ore': { color: '#2ABCD4' },
  'minecraft:emerald_ore': { color: '#2AD44A' },
  'minecraft:iron_block': { color: '#D8D8D8' },
  'minecraft:copper_block': { color: '#C07040' },
  'minecraft:gold_block': { color: '#F0C030' },
  'minecraft:diamond_block': { color: '#60E8F0' },
  'minecraft:emerald_block': { color: '#2ED454' },
  'minecraft:netherite_block': { color: '#3A3038' },
  'minecraft:amethyst_block': { color: '#8C62C8' },
  'minecraft:raw_iron_block': { color: '#B87040' },

  // Glass
  'minecraft:glass': { color: '#C0E8F090', emissive: false },
  'minecraft:tinted_glass': { color: '#3A3448' },
  'minecraft:glass_pane': { color: '#C0E8F090' },

  // Colored concrete / wool
  'minecraft:white_concrete': { color: '#CFCFCF' },
  'minecraft:light_gray_concrete': { color: '#9B9B9B' },
  'minecraft:gray_concrete': { color: '#5A5A5A' },
  'minecraft:black_concrete': { color: '#1A1A1A' },
  'minecraft:brown_concrete': { color: '#5A3A1A' },
  'minecraft:red_concrete': { color: '#8A1A1A' },
  'minecraft:orange_concrete': { color: '#E07030' },
  'minecraft:yellow_concrete': { color: '#D4C020' },
  'minecraft:lime_concrete': { color: '#5AAA20' },
  'minecraft:green_concrete': { color: '#3A6020' },
  'minecraft:cyan_concrete': { color: '#207A8A' },
  'minecraft:light_blue_concrete': { color: '#5090C0' },
  'minecraft:blue_concrete': { color: '#2A3498' },
  'minecraft:purple_concrete': { color: '#6A2A8A' },
  'minecraft:magenta_concrete': { color: '#B840B8' },
  'minecraft:pink_concrete': { color: '#D870A0' },

  // Light sources
  'minecraft:glowstone': { color: '#B8A058', emissive: true },
  'minecraft:sea_lantern': { color: '#A0C8CC', emissive: true },
  'minecraft:shroomlight': { color: '#E8A030', emissive: true },
  'minecraft:lantern': { color: '#E0A030', emissive: true },
  'minecraft:torch': { color: '#E0A830', emissive: true },
  'minecraft:soul_lantern': { color: '#40A0C0', emissive: true },
  'minecraft:redstone_lamp': { color: '#D06030', emissive: true },
  'minecraft:beacon': { color: '#80E8E8', emissive: true },
  'minecraft:end_rod': { color: '#F0F0E0', emissive: true },
  'minecraft:froglight': { color: '#E8E850', emissive: true },

  // Terracotta
  'minecraft:terracotta': { color: '#985A3A' },
  'minecraft:white_terracotta': { color: '#D0B8AA' },
  'minecraft:orange_terracotta': { color: '#9A4420' },
  'minecraft:yellow_terracotta': { color: '#C09028' },
  'minecraft:red_terracotta': { color: '#8A2018' },
  'minecraft:brown_terracotta': { color: '#5A3018' },

  // Quartz
  'minecraft:quartz_block': { color: '#EAE6DE' },
  'minecraft:smooth_quartz': { color: '#EAE6DE' },
  'minecraft:quartz_bricks': { color: '#E5E0D8' },
  'minecraft:chiseled_quartz_block': { color: '#E0DCD4' },
  'minecraft:quartz_pillar': { color: '#E5E0DA' },

  // Prismarine
  'minecraft:prismarine': { color: '#60A898' },
  'minecraft:prismarine_bricks': { color: '#68B4A0' },
  'minecraft:dark_prismarine': { color: '#2A6050' },

  // Misc utility
  'minecraft:crafting_table': { color: '#8A6040' },
  'minecraft:furnace': { color: '#7A7060' },
  'minecraft:chest': { color: '#9A7030' },
  'minecraft:barrel': { color: '#6A5030' },
  'minecraft:hopper': { color: '#5A5A5A' },
  'minecraft:dropper': { color: '#6A6A6A' },
  'minecraft:dispenser': { color: '#6A6A6A' },
  'minecraft:piston': { color: '#8A7060' },
  'minecraft:sticky_piston': { color: '#5A8A40' },
  'minecraft:observer': { color: '#5A5A5A' },
  'minecraft:comparator': { color: '#7A7070' },
  'minecraft:repeater': { color: '#8A8080' },
  'minecraft:lever': { color: '#6A5A4A' },
  'minecraft:target': { color: '#D0504A' },
  'minecraft:tnt': { color: '#C03020' },

  // Slabs / utility markers
  'minecraft:smooth_stone_slab': { color: '#9E9E9E' },
  'minecraft:structure_void': { color: '#FF00FF' },

  // Framed blocks (default appearance — overridden per-entry by camo color)
  'framed_blocks:framed_cube': { color: '#A09070' },

  // Copper variants used by the registry
  'minecraft:exposed_copper': { color: '#B05030' },
  'minecraft:oxidized_copper': { color: '#3DA888' },

  // Create
  'create:grate': { color: '#7A7A7A' },
  'create:copper_grate': { color: '#B07050' },
  'create:industrial_iron_block': { color: '#5A6A6A' },
  'create:andesite_machine_casing': { color: '#5A5A52' },
  'create:brass_machine_casing': { color: '#7A6A3A' },
  'create:copper_machine_casing': { color: '#7A4A2A' },
  'create:framed_glass': { color: '#D0E8F0' },
  'create:blaze_lantern': { color: '#E06020', emissive: true },
  'create:fluid_pipe': { color: '#5A5A6A' },
  'create:shaft': { color: '#6A5A4A' },
  'create:chute': { color: '#4A5A5A' },
  'create:depot': { color: '#5A5050' },

  // Immersive Engineering
  'immersiveengineering:storage_steel': { color: '#5A6878' },
  'immersiveengineering:storage_aluminum': { color: '#8A9AAA' },
  'immersiveengineering:storage_lead': { color: '#4A4A5A' },
  'immersiveengineering:treated_wood_horizontal': { color: '#5A4A2A' },
  'immersiveengineering:concrete': { color: '#7A7A72' },
  'immersiveengineering:sheetmetal_steel': { color: '#6A7888' },
  'immersiveengineering:sheetmetal_aluminum': { color: '#8AABB8' },

  // Mekanism
  'mekanism:steel_casing': { color: '#5A6878' },
  'mekanism:basic_control_circuit': { color: '#3A5A3A' },
  'mekanism:hdpe_reinforced_glass': { color: '#A0C8D0' },
  'mekanism:teleporter_frame': { color: '#2A3A5A' },
  'mekanism:steel_block': { color: '#6A7888' },

  // Thermal
  'thermal:machine_frame': { color: '#7A6A3A' },
  'thermal:rockwool': { color: '#8A7A6A' },
  'thermal:duct': { color: '#6A5A4A' },

  // Mod-generic fallbacks by prefix
}

// Category fallbacks for unknown blocks
const CATEGORY_COLORS: Array<{ prefix: string; color: string }> = [
  { prefix: 'immersiveengineering:', color: '#6a7888' },
  { prefix: 'ae2:', color: '#1A4060' },
  { prefix: 'appliedenergistics2:', color: '#1A4060' },
  { prefix: 'mekanism:', color: '#0A6060' },
  { prefix: 'thermal:', color: '#C06020' },
  { prefix: 'create:', color: '#D0B080' },
  { prefix: 'industrialforegoing:', color: '#405070' },
  { prefix: 'mysticalagriculture:', color: '#206020' },
  { prefix: 'mysticalcustomization:', color: '#206020' },
  { prefix: 'powah:', color: '#A02020' },
  { prefix: 'flux:', color: '#2060A0' },
  { prefix: 'rftools:', color: '#404080' },
  { prefix: 'refined:', color: '#406080' },
  { prefix: 'iron_chests:', color: '#808080' },
  { prefix: 'endertank:', color: '#8020C0' },
  { prefix: 'ender:', color: '#6010A0' },
  { prefix: 'botania:', color: '#C040C0' },
  { prefix: 'theurgy:', color: '#A0C080' },
  { prefix: 'bloodmagic:', color: '#A01010' },
  { prefix: 'pneumaticcraft:', color: '#6090A0' },
  { prefix: 'computercraft:', color: '#202020' },
  { prefix: 'cc:', color: '#202020' },
  { prefix: 'functionalstorage:', color: '#705030' },
  { prefix: 'sophisticatedstorage:', color: '#806040' },
  { prefix: 'storagedrawers:', color: '#806040' },
  { prefix: 'framed_blocks:', color: '#A09070' },
]

export function getBlockColor(blockId: string): BlockColorEntry {
  if (!blockId || blockId === 'minecraft:air' || blockId === 'minecraft:cave_air') {
    return { color: '#00000000' }
  }

  const known = KNOWN_COLORS[blockId]
  if (known) return known

  // Registry fallback — also propagates isLightSource as emissive
  const meta = getBlockMeta(blockId)
  if (meta) return { color: meta.rendererColor, emissive: meta.isLightSource || undefined }

  // Mod category fallback
  for (const cat of CATEGORY_COLORS) {
    if (blockId.startsWith(cat.prefix)) return { color: cat.color }
  }

  // Hash the block ID to get a consistent color
  return { color: hashColor(blockId) }
}

/**
 * Renderer-friendly color lookup for an entire BlockEntry. For framed blocks
 * (framed_blocks:framed_cube), the color is taken from the embedded
 * CamoState's block ID so the cube renders like its underlying camo material.
 */
export function getBlockColorForEntry(entry: {
  blockId: string
  nbtData?: Record<string, unknown>
}): BlockColorEntry {
  if (entry.blockId === 'framed_blocks:framed_cube' && entry.nbtData) {
    const camo = entry.nbtData['CamoState'] as { Name?: unknown } | undefined
    const camoName = camo && typeof camo.Name === 'string' ? camo.Name : null
    if (camoName && camoName !== 'minecraft:air') return getBlockColor(camoName)
  }
  return getBlockColor(entry.blockId)
}

function hashColor(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  const r = ((h >> 16) & 0xFF) | 0x40
  const g = ((h >> 8) & 0xFF) | 0x40
  const b = (h & 0xFF) | 0x40
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`
}

function clamp(v: number): number {
  return Math.max(0x40, Math.min(0xFF, v))
}
