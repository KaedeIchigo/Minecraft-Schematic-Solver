import { describe, it, expect } from 'vitest'
import { exportTemplate } from '../server/adapters/buildingGadgets/exportTemplate.js'
import { importTemplate } from '../server/adapters/buildingGadgets/importTemplate.js'
import { roundTripTemplate } from '../server/adapters/buildingGadgets/roundTripTemplate.js'
import { computeMaterialList } from '../shared/voxelOps.js'
import type { BlockEntry } from '../shared/types.js'

/**
 * Round-trip tests: internal blocks → BG1 export → BG1 import → compare
 *
 * These tests verify serialization fidelity, NOT in-game compatibility.
 * In-game validation requires a real Building Gadgets Template Manager.
 *
 * NOTE: Once a real BG1 template is exported from the Template Manager,
 * add a fixture test here using the real file to validate the importer.
 */

function makeSimpleRoom(): BlockEntry[] {
  const blocks: BlockEntry[] = []
  // 3×3×3 hollow room
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 3; z++) {
        const onEdge = x === 0 || x === 2 || y === 0 || y === 2 || z === 0 || z === 2
        blocks.push({
          x, y, z,
          blockId: onEdge ? 'minecraft:stone_bricks' : 'minecraft:air',
          blockState: {},
        })
      }
    }
  }
  return blocks
}

function makeComplexRoom(): BlockEntry[] {
  const blocks: BlockEntry[] = []
  const palette = [
    'minecraft:stone_bricks',
    'minecraft:smooth_stone',
    'minecraft:polished_deepslate',
    'minecraft:sea_lantern',
    'minecraft:oak_planks',
  ]
  for (let x = 0; x < 5; x++) {
    for (let y = 0; y < 4; y++) {
      for (let z = 0; z < 5; z++) {
        const blockId = palette[(x + y + z) % palette.length]
        blocks.push({ x, y, z, blockId, blockState: {} })
      }
    }
  }
  return blocks
}

function makeBlocksWithState(): BlockEntry[] {
  return [
    { x: 0, y: 0, z: 0, blockId: 'minecraft:furnace', blockState: { facing: 'north', lit: 'false' } },
    { x: 1, y: 0, z: 0, blockId: 'minecraft:piston', blockState: { facing: 'east', extended: 'false' } },
    { x: 2, y: 0, z: 0, blockId: 'minecraft:stone_bricks', blockState: {} },
  ]
}

// ---- Export → Import round-trip ------------------------------------------

describe('BG1 round-trip (export → import)', () => {
  it('simple hollow room preserves block count', async () => {
    const original = makeSimpleRoom()
    const nonAir = original.filter(b => b.blockId !== 'minecraft:air')
    const exported = await exportTemplate(original, 'simple_room')
    const imported = await importTemplate(exported)
    const importedNonAir = imported.blocks.filter(b => b.blockId !== 'minecraft:air')
    expect(importedNonAir.length).toBe(nonAir.length)
  })

  it('complex room preserves block count', async () => {
    const original = makeComplexRoom()
    const exported = await exportTemplate(original, 'complex_room')
    const imported = await importTemplate(exported)
    expect(imported.blocks.length).toBe(original.length)
  })

  it('preserves block state properties', async () => {
    const original = makeBlocksWithState()
    const exported = await exportTemplate(original, 'with_state')
    const imported = await importTemplate(exported)

    const furnace = imported.blocks.find(b => b.blockId === 'minecraft:furnace')
    expect(furnace).toBeDefined()
    expect(furnace?.blockState.facing).toBe('north')
  })

  it('material list is consistent after round-trip', async () => {
    const original = makeSimpleRoom()
    const origMaterials = computeMaterialList(original)
    const exported = await exportTemplate(original)
    const imported = await importTemplate(exported)
    const importedMaterials = computeMaterialList(imported.blocks)

    for (const origEntry of origMaterials) {
      const importedEntry = importedMaterials.find(m => m.blockId === origEntry.blockId)
      expect(importedEntry).toBeDefined()
      expect(importedEntry?.count).toBe(origEntry.count)
    }
  })

  it('normalizes origin to (0,0,0) after import', async () => {
    const original = makeSimpleRoom()
    const exported = await exportTemplate(original)
    const imported = await importTemplate(exported)
    const nonAir = imported.blocks.filter(b => b.blockId !== 'minecraft:air')
    const minX = Math.min(...nonAir.map(b => b.x))
    const minY = Math.min(...nonAir.map(b => b.y))
    const minZ = Math.min(...nonAir.map(b => b.z))
    expect(minX).toBe(0)
    expect(minY).toBe(0)
    expect(minZ).toBe(0)
  })
})

// ---- roundTripTemplate helper function ------------------------------------

describe('roundTripTemplate function', () => {
  it('reports success for a simple room', async () => {
    const original = makeSimpleRoom()
    const exported = await exportTemplate(original)
    const result = await roundTripTemplate(exported)
    expect(result.success).toBe(true)
    expect(result.blockCountMatch).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('reports success for a complex room', async () => {
    const original = makeComplexRoom()
    const exported = await exportTemplate(original)
    const result = await roundTripTemplate(exported)
    expect(result.success).toBe(true)
  })

  it('block counts are equal', async () => {
    const original = makeSimpleRoom()
    const exported = await exportTemplate(original)
    const result = await roundTripTemplate(exported)
    expect(result.blockCountOriginal).toBe(result.blockCountExported)
  })
})

// ---- TODO: Real fixture test (replace synthetic fixture) -----------------
// TODO: Paste a real Building Gadgets Template Manager export here once you have one.
// The format should be:
//   { header: { material_list: { root_entry: [...] } }, body: "<base64>" }
//
// Then add a test like:
//
// import realFixture from '../fixtures/real_bg1_template.json'
// it('imports real BG1 fixture correctly', async () => {
//   const imported = await importTemplate(realFixture)
//   const result = await roundTripTemplate(realFixture)
//   expect(result.success).toBe(true)
//   // ...
// })
