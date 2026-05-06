import { describe, it, expect, vi } from 'vitest'
import {
  resolveBlock, stairsForBase, getCamoBlockId,
  FRAMED_CUBE_BLOCK_ID, UTILITY_GAP_BLOCK_ID, softFallback,
} from '../shared/blockRegistry.js'

describe('blockRegistry.resolveBlock', () => {
  it('resolves vanilla abstract names', () => {
    expect(resolveBlock('stone_brick').blockId).toBe('minecraft:stone_bricks')
    expect(resolveBlock('polished_blackstone').blockId).toBe('minecraft:polished_blackstone_bricks')
    expect(resolveBlock('deepslate').blockId).toBe('minecraft:deepslate_bricks')
    expect(resolveBlock('copper').blockId).toBe('minecraft:exposed_copper')
    expect(resolveBlock('obsidian').blockId).toBe('minecraft:obsidian')
    expect(resolveBlock('terracotta').blockId).toBe('minecraft:terracotta')
    expect(resolveBlock('nether_brick').blockId).toBe('minecraft:nether_bricks')
    expect(resolveBlock('smooth_stone').blockId).toBe('minecraft:smooth_stone')
  })

  it('preserves blockState for axis-aligned materials (quartz, log, chain)', () => {
    expect(resolveBlock('quartz').blockState.axis).toBe('y')
    expect(resolveBlock('quartz_block').blockState.axis).toBe('y')
    expect(resolveBlock('chain').blockState.axis).toBe('y')
    expect(resolveBlock('lantern').blockState.hanging).toBe('false')
  })

  it('handles dashes, spaces, and case variations', () => {
    expect(resolveBlock('Stone Brick').blockId).toBe('minecraft:stone_bricks')
    expect(resolveBlock('polished-blackstone').blockId).toBe('minecraft:polished_blackstone_bricks')
    expect(resolveBlock('  COPPER  ').blockId).toBe('minecraft:exposed_copper')
  })

  it('passes through pre-namespaced block IDs', () => {
    expect(resolveBlock('mekanism:steel_block').blockId).toBe('mekanism:steel_block')
    expect(resolveBlock('minecraft:tnt').blockId).toBe('minecraft:tnt')
  })

  it('routes framed_<material> to framed_blocks:framed_cube with CamoState', () => {
    const r = resolveBlock('framed_stone_brick')
    expect(r.blockId).toBe(FRAMED_CUBE_BLOCK_ID)
    const camo = r.nbtData?.['CamoState'] as { Name?: string }
    expect(camo?.Name).toBe('minecraft:stone_bricks')
    const camo2 = r.nbtData?.['CamoState2'] as { Name?: string }
    expect(camo2?.Name).toBe('minecraft:air')
  })

  it('all required framed combinations route correctly', () => {
    const cases: Array<[string, string]> = [
      ['framed_stone_brick',          'minecraft:stone_bricks'],
      ['framed_deepslate',            'minecraft:deepslate_bricks'],
      ['framed_quartz',               'minecraft:quartz_block'],
      ['framed_polished_blackstone',  'minecraft:polished_blackstone_bricks'],
      ['framed_copper',               'minecraft:exposed_copper'],
    ]
    for (const [input, expectedCamo] of cases) {
      const r = resolveBlock(input)
      expect(r.blockId).toBe(FRAMED_CUBE_BLOCK_ID)
      expect((r.nbtData?.['CamoState'] as { Name?: string })?.Name).toBe(expectedCamo)
    }
  })

  it('warns and falls back to stone_bricks for unknown materials', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const r = resolveBlock('totally_made_up_thing')
    expect(r.blockId).toBe('minecraft:stone_bricks')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('warns on unknown framed camo and falls back to stone_bricks', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const r = resolveBlock('framed_wat_is_this')
    expect(r.blockId).toBe(FRAMED_CUBE_BLOCK_ID)
    expect((r.nbtData?.['CamoState'] as { Name?: string })?.Name).toBe('minecraft:stone_bricks')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('decorative blocks resolve to their expected IDs', () => {
    expect(resolveBlock('iron_bars').blockId).toBe('minecraft:iron_bars')
    expect(resolveBlock('lantern').blockId).toBe('minecraft:lantern')
    expect(resolveBlock('soul_lantern').blockId).toBe('minecraft:soul_lantern')
    expect(resolveBlock('grate').blockId).toBe('create:grate')
    expect(resolveBlock('copper_grate').blockId).toBe('create:copper_grate')
  })

  it('softFallback maps Create-only blocks to vanilla equivalents', () => {
    expect(softFallback('create:grate')).toBe('minecraft:iron_bars')
    expect(softFallback('create:copper_grate')).toBe('minecraft:iron_bars')
    expect(softFallback('minecraft:stone_bricks')).toBe('minecraft:stone_bricks')
  })

  it('stairsForBase returns the correct stairs variant for common bases', () => {
    expect(stairsForBase('minecraft:stone_bricks')).toBe('minecraft:stone_brick_stairs')
    expect(stairsForBase('minecraft:polished_blackstone_bricks')).toBe('minecraft:polished_blackstone_brick_stairs')
    expect(stairsForBase('minecraft:deepslate_bricks')).toBe('minecraft:deepslate_brick_stairs')
    expect(stairsForBase('minecraft:quartz_block')).toBe('minecraft:quartz_stairs')
    expect(stairsForBase('minecraft:something_unmapped')).toBeNull()
  })

  it('getCamoBlockId extracts CamoState.Name from framed-block NBT', () => {
    const r = resolveBlock('framed_quartz')
    expect(getCamoBlockId(r.nbtData)).toBe('minecraft:quartz_block')
    expect(getCamoBlockId(undefined)).toBeNull()
    expect(getCamoBlockId({})).toBeNull()
  })

  it('utility gap marker is smooth_stone_slab', () => {
    expect(UTILITY_GAP_BLOCK_ID).toBe('minecraft:smooth_stone_slab')
  })
})
