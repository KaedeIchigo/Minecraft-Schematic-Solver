import { describe, it, expect } from 'vitest'
import { detectVersion } from '../server/adapters/buildingGadgets/detectVersion.js'
import { validateTemplate } from '../server/adapters/buildingGadgets/validateTemplate.js'
import { getMaterialList } from '../server/adapters/buildingGadgets/getMaterialList.js'
import { getBounds } from '../server/adapters/buildingGadgets/getBounds.js'
import { normalizeCoordinates } from '../server/adapters/buildingGadgets/normalizeCoordinates.js'
import { exportTemplate, exportTemplateBG2 } from '../server/adapters/buildingGadgets/exportTemplate.js'
import type { BlockEntry, BG1Template } from '../shared/types.js'

function makeBlocks(count: number): BlockEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    x: i, y: 0, z: 0,
    blockId: i % 2 === 0 ? 'minecraft:stone_bricks' : 'minecraft:smooth_stone',
    blockState: {},
  }))
}

// ---- detectVersion --------------------------------------------------------

describe('detectVersion', () => {
  it('detects BG1 legacy format', () => {
    const raw = { header: { material_list: { root_entry: [] } }, body: 'abc123' }
    expect(detectVersion(raw)).toBe('bg1_legacy')
  })

  it('detects BG2 format', () => {
    const raw = { version: 1, palette: [], blocks: [] }
    expect(detectVersion(raw)).toBe('bg2')
  })

  it('returns unknown for unrecognized format', () => {
    expect(detectVersion({ foo: 'bar' })).toBe('unknown')
    expect(detectVersion(null)).toBe('unknown')
    expect(detectVersion('string')).toBe('unknown')
  })
})

// ---- validateTemplate (blocks) -------------------------------------------

describe('validateTemplate (blocks)', () => {
  it('valid blocks return valid report', () => {
    const blocks = makeBlocks(4)
    const report = validateTemplate(blocks, 'internal')
    expect(report.valid).toBe(true)
    expect(report.blockCount).toBe(4)
    expect(report.errors).toHaveLength(0)
  })

  it('empty blocks return error', () => {
    const report = validateTemplate([], 'internal')
    expect(report.valid).toBe(false)
    expect(report.errors.length).toBeGreaterThan(0)
  })

  it('tile entity blocks trigger warning for BG export', () => {
    const blocks: BlockEntry[] = [{ x: 0, y: 0, z: 0, blockId: 'minecraft:chest', blockState: {} }]
    const report = validateTemplate(blocks, 'bg1_legacy')
    expect(report.tileEntityCount).toBeGreaterThan(0)
    expect(report.warnings.some(w => w.includes('tile entity'))).toBe(true)
  })
})

// ---- getMaterialList (from blocks) ----------------------------------------

describe('getMaterialList', () => {
  it('counts blocks and sorts by count', () => {
    const blocks = makeBlocks(6)  // 3 stone_bricks, 3 smooth_stone
    const list = getMaterialList(blocks)
    expect(list.length).toBe(2)
    expect(list[0].count).toBeGreaterThanOrEqual(list[1].count)
  })

  it('reads from BG1 header without decoding body', () => {
    const raw: BG1Template = {
      header: {
        material_list: {
          root_entry: [
            { count: 10, item: { id: 'minecraft:stone_bricks' } },
            { count: 5, item: { id: 'minecraft:smooth_stone' } },
          ],
        },
      },
      body: 'ignored',
    }
    const list = getMaterialList(raw)
    expect(list.length).toBe(2)
    expect(list[0].blockId).toBe('minecraft:stone_bricks')
    expect(list[0].count).toBe(10)
  })
})

// ---- getBounds -----------------------------------------------------------

describe('getBounds', () => {
  it('returns correct bounds', () => {
    const blocks = makeBlocks(5)
    const bounds = getBounds(blocks)
    expect(bounds.min).toEqual({ x: 0, y: 0, z: 0 })
    expect(bounds.max).toEqual({ x: 4, y: 0, z: 0 })
    expect(bounds.dimensions).toEqual({ x: 5, y: 1, z: 1 })
  })
})

// ---- normalizeCoordinates ------------------------------------------------

describe('normalizeCoordinates', () => {
  it('shifts min corner to origin', () => {
    const blocks: BlockEntry[] = [
      { x: 5, y: 3, z: 7, blockId: 'minecraft:stone', blockState: {} },
      { x: 7, y: 3, z: 9, blockId: 'minecraft:stone', blockState: {} },
    ]
    const normalized = normalizeCoordinates(blocks)
    const bounds = getBounds(normalized)
    expect(bounds.min).toEqual({ x: 0, y: 0, z: 0 })
  })
})

// ---- exportTemplate (BG1) ------------------------------------------------

describe('exportTemplate (BG1)', () => {
  it('exports blocks to BG1 format with correct structure', async () => {
    const blocks = makeBlocks(4)
    const result = await exportTemplate(blocks, 'test')
    expect(result).toHaveProperty('header')
    expect(result).toHaveProperty('body')
    expect(typeof result.body).toBe('string')
    expect(result.body.length).toBeGreaterThan(0)
    expect(result.header.material_list.root_entry.length).toBeGreaterThan(0)
  })

  it('material list in header matches block contents', async () => {
    const blocks: BlockEntry[] = [
      { x: 0, y: 0, z: 0, blockId: 'minecraft:stone_bricks', blockState: {} },
      { x: 1, y: 0, z: 0, blockId: 'minecraft:stone_bricks', blockState: {} },
      { x: 2, y: 0, z: 0, blockId: 'minecraft:smooth_stone', blockState: {} },
    ]
    const result = await exportTemplate(blocks)
    const stoneEntry = result.header.material_list.root_entry.find(e => e.item.id === 'minecraft:stone_bricks')
    expect(stoneEntry?.count).toBe(2)
  })

  it('throws for empty block list', async () => {
    await expect(exportTemplate([])).rejects.toThrow()
  })

  it('excludes air blocks from export', async () => {
    const blocks: BlockEntry[] = [
      { x: 0, y: 0, z: 0, blockId: 'minecraft:air', blockState: {} },
      { x: 1, y: 0, z: 0, blockId: 'minecraft:stone', blockState: {} },
    ]
    const result = await exportTemplate(blocks)
    expect(result.header.material_list.root_entry.every(e => e.item.id !== 'minecraft:air')).toBe(true)
  })
})

// ---- exportTemplateBG2 (placeholder) -------------------------------------

describe('exportTemplateBG2 (placeholder)', () => {
  it('returns structure with warning and palette', () => {
    const blocks = makeBlocks(4)
    const result = exportTemplateBG2(blocks)
    expect(result).toHaveProperty('_warning')
    expect(result).toHaveProperty('palette')
    expect(result).toHaveProperty('blocks')
    expect(result._warning).toContain('NOT validated')
  })
})
