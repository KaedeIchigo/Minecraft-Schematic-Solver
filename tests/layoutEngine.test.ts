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

  it('support_pillars feature places framed_cube at all 4 inner corners', () => {
    const bp = singleRoom({ rooms: [{
      id: 'main', label: '', type: 'hall',
      size: { x: 5, y: 4, z: 5 },
      position: { x: 0, y: 0, z: 0 },
      connects_to: [],
      features: ['support_pillars'],
    }] })
    const { blocks } = layoutBlueprint(bp)
    const framed = blocks.filter(b => b.blockId === 'framed_blocks:framed_cube')
    expect(framed.length).toBeGreaterThanOrEqual(4 * 4)   // 4 corners × 4 inner-height blocks
    // Every framed block carries CamoState NBT
    for (const b of framed) {
      const camo = b.nbtData?.['CamoState'] as { Name?: string } | undefined
      expect(camo?.Name).toBeTruthy()
    }
  })

  it('arched_ceiling feature places stairs at half=top along ceiling edges', () => {
    const bp = singleRoom({ rooms: [{
      id: 'main', label: '', type: 'hall',
      size: { x: 7, y: 5, z: 7 },
      position: { x: 0, y: 0, z: 0 },
      connects_to: [],
      features: ['arched_ceiling'],
    }] })
    const { blocks } = layoutBlueprint(bp)
    const stairs = blocks.filter(b => b.blockId.endsWith('_stairs'))
    expect(stairs.length).toBeGreaterThan(0)
    expect(stairs.every(s => s.blockState.half === 'top')).toBe(true)
    // Multiple facings around the perimeter
    const facings = new Set(stairs.map(s => s.blockState.facing))
    expect(facings.size).toBeGreaterThanOrEqual(2)
  })

  it('large_windows feature places glass at every 3rd column at y+1 and y+2', () => {
    const bp = singleRoom({ rooms: [{
      id: 'main', label: '', type: 'hall',
      size: { x: 10, y: 5, z: 5 },
      position: { x: 0, y: 0, z: 0 },
      connects_to: [],
      features: ['large_windows'],
    }] })
    const { blocks } = layoutBlueprint(bp)
    const glass = blocks.filter(b => b.blockId === 'minecraft:glass')
    expect(glass.length).toBeGreaterThan(0)
    // Each glass block should be at y=1 or y=2 (relative to normalized origin)
    expect(glass.every(g => g.y === 1 || g.y === 2)).toBe(true)
  })

  it('utility_gap marker is now smooth_stone_slab (visible half-slab)', () => {
    const bp = parseBlueprint({
      theme: '', style_notes: '',
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
    const slabs = blocks.filter(b => b.blockId === 'minecraft:smooth_stone_slab')
    expect(slabs.length).toBeGreaterThan(0)
    expect(slabs[0].blockState.type).toBe('bottom')
    expect(slabs[0].blockState.utility).toBe('true')
  })

  // ── Shape renderers ────────────────────────────────────────────────────────

  it('cylinder shape: blocks form a circular footprint, corners are absent, interior is hollow', () => {
    const bp = parseBlueprint({
      theme: 'test', style_notes: '',
      material_palette: {
        primary_wall: 'stone_brick', secondary_wall: 'cobblestone',
        floor: 'smooth_stone', ceiling: 'stone_brick',
        accent: 'polished_andesite', frame_material: 'oak_log',
      },
      bounding_box: { x: 20, y: 20, z: 20 },
      utility_gap: false,
      rooms: [{ id: 'tower', label: '', type: 'hall', shape: 'cylinder', radius: 4,
        size: { x: 8, y: 4, z: 8 }, position: { x: 0, y: 0, z: 0 },
        connects_to: [], features: [] }],
    })
    const { blocks } = layoutBlueprint(bp)
    // Far corner (0,y,0) is at dist² = 4²+4² = 32 > r²=16, must be absent at wall Y
    expect(blocks.find(b => b.x === 0 && b.y === 2 && b.z === 0)).toBeUndefined()
    // Center of circle at wall Y must be absent (hollow interior)
    expect(blocks.find(b => b.x === 4 && b.y === 2 && b.z === 4)).toBeUndefined()
    // Floor at center must exist
    expect(blocks.find(b => b.x === 4 && b.y === 0 && b.z === 4)).toBeDefined()
    // Wall ring must have blocks (e.g. due-east at x=8, z=4, dist²=16=r²)
    expect(blocks.find(b => b.x === 8 && b.y === 2 && b.z === 4)).toBeDefined()
  })

  it('column shape is fully solid (no hollow interior)', () => {
    const bp = parseBlueprint({
      theme: 'test', style_notes: '',
      material_palette: {
        primary_wall: 'stone_brick', secondary_wall: 'cobblestone',
        floor: 'smooth_stone', ceiling: 'stone_brick',
        accent: 'polished_andesite', frame_material: 'oak_log',
      },
      bounding_box: { x: 20, y: 20, z: 20 },
      utility_gap: false,
      rooms: [{ id: 'col', label: '', type: 'utility', shape: 'column',
        size: { x: 3, y: 6, z: 3 }, position: { x: 0, y: 0, z: 0 },
        connects_to: [], features: [] }],
    })
    const { blocks, dimensions } = layoutBlueprint(bp)
    // Every position in the bounding box must have a block
    const blockSet = new Set(blocks.map(b => `${b.x},${b.y},${b.z}`))
    let missing = false
    for (let x = 0; x < dimensions.x; x++)
      for (let y = 0; y < dimensions.y; y++)
        for (let z = 0; z < dimensions.z; z++)
          if (!blockSet.has(`${x},${y},${z}`)) { missing = true; break }
    expect(missing).toBe(false)
  })

  it('cross shape extends arms beyond center rectangle', () => {
    const bp = parseBlueprint({
      theme: 'test', style_notes: '',
      material_palette: {
        primary_wall: 'stone_brick', secondary_wall: 'cobblestone',
        floor: 'smooth_stone', ceiling: 'stone_brick',
        accent: 'polished_andesite', frame_material: 'oak_log',
      },
      bounding_box: { x: 40, y: 20, z: 40 },
      utility_gap: false,
      rooms: [{ id: 'cross', label: '', type: 'hall', shape: 'cross',
        arm_length: 4, arm_width: 3,
        size: { x: 7, y: 4, z: 7 }, position: { x: 5, y: 0, z: 5 },
        connects_to: [], features: [] }],
    })
    const { dimensions } = layoutBlueprint(bp)
    // Rect alone would be 9×6×9. Cross adds arms, making it wider in X and Z.
    const rectDim = 7 + 2  // innerX + 2 walls = 9
    expect(dimensions.x).toBeGreaterThan(rectDim)
    expect(dimensions.z).toBeGreaterThan(rectDim)
  })

  it('octagon shape cuts corners of the bounding rectangle', () => {
    const bp = parseBlueprint({
      theme: 'test', style_notes: '',
      material_palette: {
        primary_wall: 'stone_brick', secondary_wall: 'cobblestone',
        floor: 'smooth_stone', ceiling: 'stone_brick',
        accent: 'polished_andesite', frame_material: 'oak_log',
      },
      bounding_box: { x: 20, y: 20, z: 20 },
      utility_gap: false,
      rooms: [{ id: 'oct', label: '', type: 'hall', shape: 'octagon', radius: 3,
        size: { x: 9, y: 4, z: 9 }, position: { x: 0, y: 0, z: 0 },
        connects_to: [], features: [] }],
    })
    const { blocks, dimensions } = layoutBlueprint(bp)
    // Bounding box dimensions should equal rectangle (no extra blocks outside)
    const rectBlockCount = (9 + 2) * (4 + 2) * (9 + 2)  // upper bound
    // Octagon has fewer blocks than full rectangle due to cut corners
    const rectBp = parseBlueprint({
      theme: 'test', style_notes: '',
      material_palette: {
        primary_wall: 'stone_brick', secondary_wall: 'cobblestone',
        floor: 'smooth_stone', ceiling: 'stone_brick',
        accent: 'polished_andesite', frame_material: 'oak_log',
      },
      bounding_box: { x: 20, y: 20, z: 20 }, utility_gap: false,
      rooms: [{ id: 'rect', label: '', type: 'hall',
        size: { x: 9, y: 4, z: 9 }, position: { x: 0, y: 0, z: 0 },
        connects_to: [], features: [] }],
    })
    const { blocks: rectBlocks } = layoutBlueprint(rectBp)
    expect(blocks.length).toBeLessThan(rectBlocks.length)
  })

  it('wedge shape is triangular: far corner is absent, near corner is present', () => {
    const bp = parseBlueprint({
      theme: 'test', style_notes: '',
      material_palette: {
        primary_wall: 'stone_brick', secondary_wall: 'cobblestone',
        floor: 'smooth_stone', ceiling: 'stone_brick',
        accent: 'polished_andesite', frame_material: 'oak_log',
      },
      bounding_box: { x: 20, y: 20, z: 20 },
      utility_gap: false,
      rooms: [{ id: 'wedge', label: '', type: 'hall', shape: 'wedge', direction: 'NE',
        size: { x: 8, y: 4, z: 8 }, position: { x: 0, y: 0, z: 0 },
        connects_to: [], features: [] }],
    })
    const { blocks } = layoutBlueprint(bp)
    // NE apex: at north (z=0), full width; at south (z=outerMax.z=9), only east edge.
    // Normalised to origin: the far SW corner at south (x=0, z=9) should be absent.
    const farSW = blocks.find(b => b.x === 0 && b.z === 9 && b.y === 0)
    expect(farSW).toBeUndefined()
    // Floor at x=9 (east), z=0 (north) should exist (full width at north)
    const nearNE = blocks.find(b => b.x === 9 && b.z === 0 && b.y === 0)
    expect(nearNE).toBeDefined()
  })

  // ── Connectivity extensions ─────────────────────────────────────────────────

  it('shaft connection_type carves a 3×3 vertical hole through shared ceiling/floor', () => {
    const bp = parseBlueprint({
      theme: 'shaft', style_notes: '',
      material_palette: {
        primary_wall: 'stone_brick', secondary_wall: 'cobblestone',
        floor: 'smooth_stone', ceiling: 'stone_brick',
        accent: 'polished_andesite', frame_material: 'oak_log',
      },
      bounding_box: { x: 10, y: 20, z: 10 }, utility_gap: false,
      rooms: [
        { id: 'lower', label: '', type: 'room', size: { x: 5, y: 4, z: 5 },
          position: { x: 0, y: 0, z: 0 },
          connects_to: [{ id: 'upper', connection_type: 'shaft' }] as unknown as string[],
          features: [] },
        { id: 'upper', label: '', type: 'room', size: { x: 5, y: 4, z: 5 },
          position: { x: 0, y: 5, z: 0 }, connects_to: [], features: [] },
      ],
    })
    const noShaft = layoutBlueprint({
      ...bp,
      rooms: bp.rooms.map(r => ({ ...r, connects_to: [], connect_types: {} })),
    })
    const withShaft = layoutBlueprint(bp)
    // Shaft must remove ceiling/floor blocks → fewer total blocks
    expect(withShaft.blocks.length).toBeLessThan(noShaft.blocks.length)
  })

  it('bridge connection_type places floor blocks above ceiling height between separated rooms', () => {
    const bp = parseBlueprint({
      theme: 'bridge', style_notes: '',
      material_palette: {
        primary_wall: 'stone_brick', secondary_wall: 'cobblestone',
        floor: 'smooth_stone', ceiling: 'stone_brick',
        accent: 'polished_andesite', frame_material: 'oak_log',
      },
      bounding_box: { x: 30, y: 20, z: 10 }, utility_gap: false,
      rooms: [
        { id: 'a', label: '', type: 'room', size: { x: 5, y: 4, z: 5 },
          position: { x: 0, y: 0, z: 0 },
          connects_to: [{ id: 'b', connection_type: 'bridge' }] as unknown as string[],
          features: [] },
        { id: 'b', label: '', type: 'room', size: { x: 5, y: 4, z: 5 },
          position: { x: 10, y: 0, z: 0 }, connects_to: [], features: [] },
      ],
    })
    const { blocks } = layoutBlueprint(bp)
    // outerMax.y of each room = 0 + 4 + 1 = 5. Bridge floor is now ceiling height - 2.
    const bridgeFloor = blocks.filter(b => b.y === 3 && b.x > 6 && b.x < 10)
    expect(bridgeFloor.length).toBeGreaterThan(0)
    const railings = blocks.filter(b => b.blockId === 'minecraft:iron_bars' && b.y === 4)
    expect(railings.length).toBeGreaterThan(0)
  })

  it('non-adjacent rooms with doorway connection get a corridor', () => {
    const bp = parseBlueprint({
      theme: 'corridor', style_notes: '',
      material_palette: {
        primary_wall: 'stone_brick', secondary_wall: 'cobblestone',
        floor: 'smooth_stone', ceiling: 'stone_brick',
        accent: 'polished_andesite', frame_material: 'oak_log',
      },
      bounding_box: { x: 30, y: 20, z: 10 }, utility_gap: false,
      rooms: [
        { id: 'a', label: '', type: 'room', size: { x: 5, y: 4, z: 5 },
          position: { x: 0, y: 0, z: 0 }, connects_to: ['b'], features: [] },
        { id: 'b', label: '', type: 'room', size: { x: 5, y: 4, z: 5 },
          position: { x: 10, y: 0, z: 0 }, connects_to: [], features: [] },
      ],
    })
    const noConnection = layoutBlueprint({
      ...bp, rooms: bp.rooms.map(r => ({ ...r, connects_to: [], connect_types: {} })),
    })
    const { blocks } = layoutBlueprint(bp)
    // Corridor adds blocks in the gap between rooms
    expect(blocks.length).toBeGreaterThan(noConnection.blocks.length)
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

  // ── Schema robustness (real-world model output formats) ───────────────────

  it('parseBlueprint tolerates missing material_palette, flat position/size, and target-keyed connects_to', () => {
    // This reproduces the exact JSON format Gemini Flash produced in the wild
    const bp = parseBlueprint({
      bounding_box: { x: 50, y: 40, z: 50 },
      rooms: [
        { id: 'base', x: 12, y: 0, z: 12, x_size: 26, y_size: 5, z_size: 26,
          shape: 'octagon', radius: 13 },
        { id: 'core', x: 22, y: 5, z: 22, x_size: 6, y_size: 5, z_size: 6,
          connects_to: [
            { target: 'base', connection_type: 'open' },
            { target: 'upper', connection_type: 'shaft' },
          ] },
        { id: 'upper', x: 22, y: 11, z: 22, x_size: 6, y_size: 5, z_size: 6,
          connects_to: [{ target: 'core', connection_type: 'shaft' }] },
      ],
    })
    // material_palette filled with defaults
    expect(bp.material_palette.primary_wall).toBe('stone_brick')
    // flat position → nested
    expect(bp.rooms[0].position).toEqual({ x: 12, y: 0, z: 12 })
    expect(bp.rooms[0].size).toEqual({ x: 26, y: 5, z: 26 })
    // target → id, connect_types extracted
    expect(bp.rooms[1].connects_to).toContain('base')
    expect(bp.rooms[1].connect_types?.['base']).toBe('open')
    expect(bp.rooms[1].connect_types?.['upper']).toBe('shaft')
    // schema field round-trips
    expect(bp.rooms[0].shape).toBe('octagon')
    expect(bp.rooms[0].radius).toBe(13)
  })
})
