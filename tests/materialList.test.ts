import { describe, it, expect } from 'vitest'
import { computeMaterialList } from '../shared/voxelOps.js'
import type { BlockEntry } from '../shared/types.js'

describe('computeMaterialList', () => {
  it('returns empty list for empty input', () => {
    expect(computeMaterialList([])).toHaveLength(0)
  })

  it('excludes air blocks', () => {
    const blocks: BlockEntry[] = [
      { x: 0, y: 0, z: 0, blockId: 'minecraft:air', blockState: {} },
      { x: 1, y: 0, z: 0, blockId: 'minecraft:cave_air', blockState: {} },
    ]
    expect(computeMaterialList(blocks)).toHaveLength(0)
  })

  it('counts multiple block types correctly', () => {
    const blocks: BlockEntry[] = [
      ...Array.from({ length: 5 }, (_, i) => ({ x: i, y: 0, z: 0, blockId: 'minecraft:stone', blockState: {} })),
      ...Array.from({ length: 3 }, (_, i) => ({ x: i, y: 1, z: 0, blockId: 'minecraft:oak_planks', blockState: {} })),
      ...Array.from({ length: 1 }, (_, i) => ({ x: i, y: 2, z: 0, blockId: 'minecraft:sea_lantern', blockState: {} })),
    ]
    const list = computeMaterialList(blocks)
    expect(list).toHaveLength(3)
    expect(list[0].blockId).toBe('minecraft:stone')
    expect(list[0].count).toBe(5)
    expect(list[1].count).toBe(3)
    expect(list[2].count).toBe(1)
  })

  it('formats display names correctly', () => {
    const blocks: BlockEntry[] = [
      { x: 0, y: 0, z: 0, blockId: 'minecraft:stone_bricks', blockState: {} },
    ]
    const list = computeMaterialList(blocks)
    expect(list[0].displayName).toBe('Stone Bricks')
  })

  it('handles modded block IDs', () => {
    const blocks: BlockEntry[] = [
      { x: 0, y: 0, z: 0, blockId: 'ae2:controller', blockState: {} },
    ]
    const list = computeMaterialList(blocks)
    expect(list[0].displayName).toBe('Controller')
  })

  it('generates correct total count for a room', () => {
    // 5×5 room floor (25 blocks) + 3-high walls
    const blocks: BlockEntry[] = []
    for (let x = 0; x < 5; x++) {
      for (let z = 0; z < 5; z++) {
        blocks.push({ x, y: 0, z, blockId: 'minecraft:smooth_stone', blockState: {} })
      }
    }
    const list = computeMaterialList(blocks)
    expect(list[0].count).toBe(25)
  })
})
