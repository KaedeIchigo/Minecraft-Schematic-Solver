import { describe, it, expect } from 'vitest'
import {
  layoutBlueprint, blueprintToTemplate, resolveMaterial, UTILITY_GAP_MARKER,
} from '../shared/layoutEngine.js'
import { parseBlueprint } from '../shared/blueprintSchema.js'
import type { Blueprint } from '../shared/types.js'

function singleRoom(overrides: Partial<Blueprint> = {}): Blueprint {
  return parseBlueprint({
    theme: 'test',
    style_notes: '',
    material_palette: {
      primary_wall: 'stone_brick', secondary_wall: 'cobblestone',
      floor: 'smooth_stone', ceiling: 'stone_brick',
      accent: 'polished_andesite', frame_material: 'oak_log',
    },
    bounding_box: { x: 20, y: 20, z: 20 },
    utility_gap: false,
    rooms: [{
      id: 'main', label: 'Main', type: 'hall',
      size: { x: 5, y: 4, z: 5 },
      position: { x: 0, y: 0, z: 0 },
      connects_to: [], features: [],
    }],
    ...overrides,
  })
}

describe('layoutEngine', () => {
  it('resolves abstract material names to namespaced block IDs', () => {
    expect(resolveMaterial('stone_brick')).toBe('minecraft:stone_bricks')
    expect(resolveMaterial('polished_blackstone')).toBe('minecraft:polished_blackstone')
    expect(resolveMaterial('minecraft:something_custom')).toBe('minecraft:something_custom')
    expect(resolveMaterial('Stone Brick')).toBe('minecraft:stone_bricks') // case + space
  })

  it('builds a hollow shell for a single room', () => {
    const bp = singleRoom()
    const { blocks, dimensions } = layoutBlueprint(bp)
    expect(dimensions.x).toBe(7)   // inner 5 + 2 walls
    expect(dimensions.y).toBe(6)   // inner 4 + floor + ceiling
    expect(dimensions.z).toBe(7)

    // Should contain at least one of each: floor, wall, ceiling
    const ids = new Set(blocks.map(b => b.blockId))
    expect(ids.has('minecraft:smooth_stone')).toBe(true)
    expect(ids.has('minecraft:stone_bricks')).toBe(true)

    // Interior should be empty (corner of inside is air, not present)
    const inside = blocks.find(b => b.x === 3 && b.y === 3 && b.z === 3)
    expect(inside).toBeUndefined()
  })

  it('enforces minimum inner height of 4 blocks', () => {
    const bp = singleRoom({ rooms: [{
      id: 'tiny', label: '', type: 'utility',
      size: { x: 4, y: 2, z: 4 },         // y=2 should be bumped to 4
      position: { x: 0, y: 0, z: 0 },
      connects_to: [], features: [],
    }] })
    const { dimensions } = layoutBlueprint(bp)
    expect(dimensions.y).toBe(6)  // 4 inner + floor + ceiling
  })

  it('inserts utility_gap marker layer between vertically stacked rooms', () => {
    const bp = parseBlueprint({
      theme: 'stacked', style_notes: '',
      material_palette: {
        primary_wall: 'stone_brick', secondary_wall: 'cobblestone',
        floor: 'smooth_stone', ceiling: 'stone_brick',
        accent: 'polished_andesite', frame_material: 'oak_log',
      },
      bounding_box: { x: 10, y: 20, z: 10 },
      utility_gap: true,
      rooms: [
        { id: 'lower', label: '', type: 'room', size: { x: 5, y: 4, z: 5 },
          position: { x: 0, y: 0, z: 0 }, connects_to: [], features: [] },
        { id: 'upper', label: '', type: 'room', size: { x: 5, y: 4, z: 5 },
          position: { x: 0, y: 5, z: 0 }, connects_to: [], features: [] },
      ],
    })
    const { blocks } = layoutBlueprint(bp)
    const markers = blocks.filter(b => b.blockId === UTILITY_GAP_MARKER)
    expect(markers.length).toBeGreaterThan(0)
    // Markers should carry the utility tag for renderer detection
    expect(markers[0].blockState.utility).toBe('true')
  })

  it('does NOT insert utility gap when blueprint.utility_gap=false', () => {
    const bp = parseBlueprint({
      theme: '', style_notes: '',
      material_palette: {
        primary_wall: 'stone_brick', secondary_wall: 'cobblestone',
        floor: 'smooth_stone', ceiling: 'stone_brick',
        accent: 'polished_andesite', frame_material: 'oak_log',
      },
      bounding_box: { x: 10, y: 20, z: 10 },
      utility_gap: false,
      rooms: [
        { id: 'a', label: '', type: 'room', size: { x: 5, y: 4, z: 5 },
          position: { x: 0, y: 0, z: 0 }, connects_to: [], features: [] },
        { id: 'b', label: '', type: 'room', size: { x: 5, y: 4, z: 5 },
          position: { x: 0, y: 5, z: 0 }, connects_to: [], features: [] },
      ],
    })
    const { blocks } = layoutBlueprint(bp)
    expect(blocks.find(b => b.blockId === UTILITY_GAP_MARKER)).toBeUndefined()
  })

  it('carves a doorway between rooms listed in connects_to', () => {
    // Two rooms touching on x=6 plane (room A walls 0..6, room B walls 6..12)
    const bp = parseBlueprint({
      theme: '', style_notes: '',
      material_palette: {
        primary_wall: 'stone_brick', secondary_wall: 'cobblestone',
        floor: 'smooth_stone', ceiling: 'stone_brick',
        accent: 'polished_andesite', frame_material: 'oak_log',
      },
      bounding_box: { x: 20, y: 10, z: 10 },
      utility_gap: false,
      rooms: [
        { id: 'a', label: '', type: 'room', size: { x: 5, y: 4, z: 5 },
          position: { x: 0, y: 0, z: 0 }, connects_to: ['b'], features: [] },
        { id: 'b', label: '', type: 'room', size: { x: 5, y: 4, z: 5 },
          position: { x: 6, y: 0, z: 0 }, connects_to: [], features: [] },
      ],
    })
    const blocksWithoutDoor = layoutBlueprint({ ...bp, rooms: bp.rooms.map(r => ({ ...r, connects_to: [] })) }).blocks
    const blocksWithDoor = layoutBlueprint(bp).blocks
    // The doorway carving must remove some wall blocks → fewer total blocks
    expect(blocksWithDoor.length).toBeLessThan(blocksWithoutDoor.length)
  })

  it('blueprintToTemplate produces a valid TemplateModule shape', () => {
    const bp = singleRoom()
    const tpl = blueprintToTemplate(bp, 'project-1', 'a hall', undefined)
    expect(tpl.name).toContain('test')
    expect(tpl.projectId).toBe('project-1')
    expect(tpl.exportStatus).toBe('not_exported')
    expect(tpl.blocks.length).toBeGreaterThan(0)
    expect(tpl.materialList.length).toBeGreaterThan(0)
    expect(tpl.tags).toContain('ai-generated')
  })

  it('parseBlueprint rejects blueprints with no rooms', () => {
    expect(() => parseBlueprint({
      theme: '', style_notes: '',
      material_palette: {
        primary_wall: 'a', secondary_wall: 'b', floor: 'c',
        ceiling: 'd', accent: 'e', frame_material: 'f',
      },
      bounding_box: { x: 1, y: 1, z: 1 },
      utility_gap: false,
      rooms: [],
    })).toThrow()
  })
})
