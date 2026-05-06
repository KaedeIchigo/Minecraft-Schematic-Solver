import { describe, it, expect } from 'vitest'
import { generateModuleFromBrief } from '../shared/moduleGenerator.js'
import { computeBounds, computeMaterialList } from '../shared/voxelOps.js'
import { SAMPLE_BRIEFS } from '../fixtures/sampleModules.js'

describe('generateModuleFromBrief', () => {
  it('generates a starter room with correct dimensions', () => {
    const brief = SAMPLE_BRIEFS.starterRoom
    const module = generateModuleFromBrief(brief, 'test-project-id')
    expect(module.dimensions).toEqual(brief.dimensions)
  })

  it('generated blocks fit within declared dimensions', () => {
    const brief = SAMPLE_BRIEFS.machineRoom
    const module = generateModuleFromBrief(brief, 'test-project-id')
    const nonAir = module.blocks.filter(b => b.blockId !== 'minecraft:air')
    const bounds = computeBounds(nonAir)
    expect(bounds.max.x).toBeLessThanOrEqual(brief.dimensions.x - 1)
    expect(bounds.max.y).toBeLessThanOrEqual(brief.dimensions.y - 1)
    expect(bounds.max.z).toBeLessThanOrEqual(brief.dimensions.z - 1)
  })

  it('generates a material list', () => {
    const brief = SAMPLE_BRIEFS.starterRoom
    const module = generateModuleFromBrief(brief, 'test-project-id')
    expect(module.materialList.length).toBeGreaterThan(0)
  })

  it('generates anchors for entrance directions', () => {
    const brief = SAMPLE_BRIEFS.starterRoom
    const module = generateModuleFromBrief(brief, 'test-project-id')
    expect(module.anchors.length).toBe(brief.entranceDirections.length)
  })

  it('generates connection ports', () => {
    const brief = SAMPLE_BRIEFS.machineRoom
    const module = generateModuleFromBrief(brief, 'test-project-id')
    expect(module.connectionPorts.length).toBe(brief.connectionPorts.length)
  })

  it('all 6 sample briefs generate without error', () => {
    for (const [name, brief] of Object.entries(SAMPLE_BRIEFS)) {
      expect(() => generateModuleFromBrief(brief, 'test-id'), `Brief: ${name}`).not.toThrow()
    }
  })

  it('hallway has correct category', () => {
    const brief = SAMPLE_BRIEFS.hallway5wide
    const module = generateModuleFromBrief(brief, 'test-id')
    expect(module.category).toBe('hallway')
  })

  it('module has required fields', () => {
    const brief = SAMPLE_BRIEFS.ae2Room
    const module = generateModuleFromBrief(brief, 'test-id')
    expect(module).toHaveProperty('blocks')
    expect(module).toHaveProperty('materialList')
    expect(module).toHaveProperty('dimensions')
    expect(module).toHaveProperty('anchors')
    expect(module).toHaveProperty('connectionPorts')
    expect(module).toHaveProperty('styleProfile')
    expect(module).toHaveProperty('exportStatus')
    expect(module.exportStatus).toBe('not_exported')
  })

  it('elevator shaft has correct height', () => {
    const brief = SAMPLE_BRIEFS.elevatorShaft
    const module = generateModuleFromBrief(brief, 'test-id')
    const nonAir = module.blocks.filter(b => b.blockId !== 'minecraft:air')
    const bounds = computeBounds(nonAir)
    expect(bounds.max.y).toBeGreaterThan(15)  // 20-high shaft
  })
})
