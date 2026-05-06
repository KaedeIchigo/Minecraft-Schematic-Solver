import { describe, it, expect } from 'vitest'
import {
  computeBounds, translate, normalizeToOrigin, rotate90, mirrorX, mirrorZ,
  fillCuboid, hollowCuboid, computeMaterialList, detectCollision,
  deduplicateBlocks, carveOpening, buildRoom,
} from '../shared/voxelOps.js'
import type { BlockEntry } from '../shared/types.js'

function stone(x: number, y: number, z: number): BlockEntry {
  return { x, y, z, blockId: 'minecraft:stone', blockState: {} }
}

function plank(x: number, y: number, z: number): BlockEntry {
  return { x, y, z, blockId: 'minecraft:oak_planks', blockState: {} }
}

function air(x: number, y: number, z: number): BlockEntry {
  return { x, y, z, blockId: 'minecraft:air', blockState: {} }
}

// ---- Bounds ---------------------------------------------------------------

describe('computeBounds', () => {
  it('returns 1×1×1 for a single block', () => {
    const b = computeBounds([stone(5, 3, 7)])
    expect(b.min).toEqual({ x: 5, y: 3, z: 7 })
    expect(b.max).toEqual({ x: 5, y: 3, z: 7 })
    expect(b.dimensions).toEqual({ x: 1, y: 1, z: 1 })
  })

  it('computes correct bounds for multiple blocks', () => {
    const blocks = [stone(0, 0, 0), stone(4, 2, 6)]
    const b = computeBounds(blocks)
    expect(b.dimensions).toEqual({ x: 5, y: 3, z: 7 })
  })

  it('returns (0,0,0)→(1,1,1) for empty input', () => {
    const b = computeBounds([])
    expect(b.min).toEqual({ x: 0, y: 0, z: 0 })
  })
})

// ---- Translate ------------------------------------------------------------

describe('translate', () => {
  it('shifts all blocks by delta', () => {
    const blocks = [stone(0, 0, 0), stone(1, 0, 0)]
    const result = translate(blocks, { x: 5, y: 2, z: -1 })
    expect(result[0]).toMatchObject({ x: 5, y: 2, z: -1 })
    expect(result[1]).toMatchObject({ x: 6, y: 2, z: -1 })
  })
})

// ---- Normalize ------------------------------------------------------------

describe('normalizeToOrigin', () => {
  it('shifts structure so min corner is at (0,0,0)', () => {
    const blocks = [stone(3, 5, 7), stone(4, 5, 7)]
    const result = normalizeToOrigin(blocks)
    const bounds = computeBounds(result)
    expect(bounds.min).toEqual({ x: 0, y: 0, z: 0 })
    expect(bounds.dimensions).toEqual({ x: 2, y: 1, z: 1 })
  })

  it('handles empty array', () => {
    expect(normalizeToOrigin([])).toEqual([])
  })
})

// ---- Rotate ---------------------------------------------------------------

describe('rotate90', () => {
  it('rotates a 2D structure 90° CW (looking down)', () => {
    // 2×1 structure at (0,0,0) and (1,0,0) → after rotation should be at (0,0,0) and (0,0,1)
    const blocks = [stone(0, 0, 0), stone(1, 0, 0)]
    const rotated = normalizeToOrigin(rotate90(blocks, 1))
    const xs = rotated.map(b => b.x)
    const zs = rotated.map(b => b.z)
    // After rotation the two blocks should differ only in z
    expect(new Set(xs).size).toBe(1)
    expect(new Set(zs).size).toBe(2)
  })

  it('4× rotation returns to original (normalized)', () => {
    const blocks = [stone(0, 0, 0), stone(2, 0, 0), stone(0, 0, 3)]
    const rotated4 = normalizeToOrigin(rotate90(blocks, 4))
    const original = normalizeToOrigin(blocks)
    const toKey = (arr: BlockEntry[]) =>
      arr.map(b => `${b.x},${b.y},${b.z}`).sort().join('|')
    expect(toKey(rotated4)).toBe(toKey(original))
  })

  it('rotates facing direction in block state', () => {
    const block: BlockEntry = { x: 0, y: 0, z: 0, blockId: 'minecraft:furnace', blockState: { facing: 'north' } }
    const rotated = rotate90([block], 1)
    expect(rotated[0].blockState.facing).toBe('east')
  })
})

// ---- Mirror ---------------------------------------------------------------

describe('mirrorX / mirrorZ', () => {
  it('mirrorX flips east↔west in block states', () => {
    const block: BlockEntry = { x: 0, y: 0, z: 0, blockId: 'minecraft:chest', blockState: { facing: 'east' } }
    const mirrored = mirrorX([block])
    expect(mirrored[0].blockState.facing).toBe('west')
  })

  it('mirrorZ flips north↔south in block states', () => {
    const block: BlockEntry = { x: 0, y: 0, z: 0, blockId: 'minecraft:chest', blockState: { facing: 'north' } }
    const mirrored = mirrorZ([block])
    expect(mirrored[0].blockState.facing).toBe('south')
  })

  it('mirrorX is its own inverse (normalized)', () => {
    const blocks = [stone(0, 0, 0), stone(1, 0, 0), stone(3, 0, 0)]
    const toKey = (arr: BlockEntry[]) => arr.map(b => `${b.x},${b.y},${b.z}`).sort().join('|')
    const mirrored2 = normalizeToOrigin(mirrorX(normalizeToOrigin(mirrorX(blocks))))
    expect(toKey(mirrored2)).toBe(toKey(normalizeToOrigin(blocks)))
  })
})

// ---- Fill / hollow --------------------------------------------------------

describe('fillCuboid', () => {
  it('fills a 2×2×2 cube with 8 blocks', () => {
    const blocks = fillCuboid({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }, 'minecraft:stone')
    expect(blocks.length).toBe(8)
    expect(blocks.every(b => b.blockId === 'minecraft:stone')).toBe(true)
  })
})

describe('hollowCuboid', () => {
  it('creates a 3×3×3 hollow cube with correct block count', () => {
    const blocks = hollowCuboid({ x: 0, y: 0, z: 0 }, { x: 2, y: 2, z: 2 }, 'minecraft:stone')
    // 3×3×3=27 total, 1×1×1=1 interior air
    expect(blocks.length).toBe(27)
    const air = blocks.filter(b => b.blockId === 'minecraft:air')
    const stone = blocks.filter(b => b.blockId === 'minecraft:stone')
    expect(air.length).toBe(1)
    expect(stone.length).toBe(26)
  })
})

// ---- Material list --------------------------------------------------------

describe('computeMaterialList', () => {
  it('counts blocks correctly and ignores air', () => {
    const blocks = [stone(0, 0, 0), stone(1, 0, 0), plank(2, 0, 0), air(3, 0, 0)]
    const list = computeMaterialList(blocks)
    expect(list.length).toBe(2)
    const stoneEntry = list.find(m => m.blockId === 'minecraft:stone')
    expect(stoneEntry?.count).toBe(2)
    const plankEntry = list.find(m => m.blockId === 'minecraft:oak_planks')
    expect(plankEntry?.count).toBe(1)
  })

  it('sorts by count descending', () => {
    const blocks = [...Array(3).keys()].map(i => plank(i, 0, 0))
      .concat([stone(10, 0, 0)])
    const list = computeMaterialList(blocks)
    expect(list[0].blockId).toBe('minecraft:oak_planks')
    expect(list[0].count).toBe(3)
  })
})

// ---- Collision detection --------------------------------------------------

describe('detectCollision', () => {
  it('detects overlapping blocks', () => {
    const blocksA = [stone(0, 0, 0), stone(1, 0, 0)]
    const blocksB = [stone(0, 0, 0), stone(2, 0, 0)]
    const count = detectCollision(blocksA, { x: 0, y: 0, z: 0 }, blocksB, { x: 0, y: 0, z: 0 })
    expect(count).toBe(1)
  })

  it('returns 0 for non-overlapping structures', () => {
    const blocksA = [stone(0, 0, 0)]
    const blocksB = [stone(0, 0, 0)]
    const count = detectCollision(blocksA, { x: 0, y: 0, z: 0 }, blocksB, { x: 10, y: 0, z: 0 })
    expect(count).toBe(0)
  })

  it('ignores air blocks', () => {
    const blocksA = [air(0, 0, 0)]
    const blocksB = [air(0, 0, 0)]
    const count = detectCollision(blocksA, { x: 0, y: 0, z: 0 }, blocksB, { x: 0, y: 0, z: 0 })
    expect(count).toBe(0)
  })
})

// ---- Deduplication --------------------------------------------------------

describe('deduplicateBlocks', () => {
  it('last block wins for same position', () => {
    const blocks = [stone(0, 0, 0), plank(0, 0, 0)]
    const result = deduplicateBlocks(blocks)
    expect(result.length).toBe(1)
    expect(result[0].blockId).toBe('minecraft:oak_planks')
  })
})

// ---- buildRoom ------------------------------------------------------------

describe('buildRoom', () => {
  it('creates a room with correct dimensions', () => {
    const blocks = buildRoom({
      width: 5, height: 4, depth: 5,
      wallBlock: 'minecraft:stone_bricks',
      floorBlock: 'minecraft:smooth_stone',
    })
    expect(blocks.length).toBeGreaterThan(0)
    // No duplicate positions
    const positions = new Set(blocks.map(b => `${b.x},${b.y},${b.z}`))
    expect(positions.size).toBe(blocks.length)
    // Floor should exist at y=0
    const floor = blocks.filter(b => b.y === 0)
    expect(floor.length).toBe(25)  // 5×5 floor
    // Interior should be air at y=1 (min at least)
    const interior = blocks.filter(b => b.x > 0 && b.x < 4 && b.y === 1 && b.z > 0 && b.z < 4)
    expect(interior.every(b => b.blockId === 'minecraft:air')).toBe(true)
  })
})

// ---- carveOpening ---------------------------------------------------------

describe('carveOpening', () => {
  it('removes blocks at the specified position', () => {
    const blocks = buildRoom({ width: 9, height: 5, depth: 9, wallBlock: 'minecraft:stone_bricks', floorBlock: 'minecraft:smooth_stone' })
    const before = blocks.length
    const carved = carveOpening(blocks, { x: 3, y: 1, z: 0 }, 'north', 3, 3)
    expect(carved.length).toBeLessThan(before)
  })
})
