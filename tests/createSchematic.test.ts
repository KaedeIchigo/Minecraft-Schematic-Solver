import { describe, it, expect } from 'vitest'
import { gunzipSync } from 'zlib'
import nbt from 'prismarine-nbt'
import {
  buildCreateSchematicRoot,
  exportToCreateSchematic,
  writeNbt,
} from '../shared/createSchematicExport.js'
import type { BlockEntry } from '../shared/types.js'

// Polyfill CompressionStream isn't required: Node 18+ provides it globally.

function sampleBlocks(): BlockEntry[] {
  return [
    { x: 0, y: 0, z: 0, blockId: 'minecraft:stone_bricks', blockState: {} },
    { x: 1, y: 0, z: 0, blockId: 'minecraft:stone_bricks', blockState: {} },
    { x: 0, y: 1, z: 0, blockId: 'minecraft:oak_log',      blockState: { axis: 'y' } },
    { x: 2, y: 0, z: 1, blockId: 'minecraft:air',          blockState: {} }, // filtered
  ]
}

describe('createSchematicExport', () => {
  it('builds a valid NBT root with palette, blocks, size, DataVersion', () => {
    const { root, paletteSize, blockCount, size } = buildCreateSchematicRoot(sampleBlocks())
    expect(paletteSize).toBe(2)            // stone_bricks (no props) + oak_log (axis=y)
    expect(blockCount).toBe(3)             // air filtered
    expect(size).toEqual({ x: 2, y: 2, z: 1 })
    expect(root.type).toBe('compound')
  })

  it('round-trips through prismarine-nbt parser', async () => {
    const { raw } = await exportToCreateSchematic(sampleBlocks())
    const nbtBytes = gunzipSync(Buffer.from(raw))
    const { parsed } = await nbt.parse(nbtBytes, 'big')
    const v = parsed.value as Record<string, nbt.Tags[keyof nbt.Tags]>

    expect((v.DataVersion as nbt.Tags['int']).value).toBe(3700)

    const sizeList = (v.size as nbt.Tags['list']).value as { type: string; value: number[] }
    expect(sizeList.type).toBe('int')
    expect(Array.from(sizeList.value)).toEqual([2, 2, 1])

    const palette = (v.palette as nbt.Tags['list']).value as { type: string; value: Array<Record<string, nbt.Tags[keyof nbt.Tags]>> }
    expect(palette.value.length).toBe(2)
    const paletteNames = palette.value.map(p => (p.Name as nbt.Tags['string']).value).sort()
    expect(paletteNames).toEqual(['minecraft:oak_log', 'minecraft:stone_bricks'])

    const oakEntry = palette.value.find(p => (p.Name as nbt.Tags['string']).value === 'minecraft:oak_log')!
    const oakProps = (oakEntry.Properties as nbt.Tags['compound']).value as Record<string, nbt.Tags['string']>
    expect(oakProps.axis.value).toBe('y')

    const blockList = (v.blocks as nbt.Tags['list']).value as { type: string; value: Array<Record<string, nbt.Tags[keyof nbt.Tags]>> }
    expect(blockList.value.length).toBe(3)

    // Each block entry must have state:int and pos:list[int]
    for (const entry of blockList.value) {
      expect((entry.state as nbt.Tags['int']).type).toBe('int')
      const pos = (entry.pos as nbt.Tags['list']).value as { type: string; value: number[] }
      expect(pos.type).toBe('int')
      expect(pos.value.length).toBe(3)
    }
  })

  it('handles framed-block tile-entity NBT (CamoState)', async () => {
    const blocks: BlockEntry[] = [
      {
        x: 0, y: 0, z: 0,
        blockId: 'framed_blocks:framed_cube',
        blockState: {},
        nbtData: {
          CamoState:  { Name: 'minecraft:stone_bricks', Properties: {} },
          CamoState2: { Name: 'minecraft:air',          Properties: {} },
        },
      },
    ]
    const { raw } = await exportToCreateSchematic(blocks)
    const { parsed } = await nbt.parse(Buffer.from(gunzipSync(Buffer.from(raw))), 'big')
    const root = parsed.value as Record<string, nbt.Tags[keyof nbt.Tags]>
    const blockList = (root.blocks as nbt.Tags['list']).value as { type: string; value: Array<Record<string, nbt.Tags[keyof nbt.Tags]>> }
    const entry = blockList.value[0]
    expect(entry.nbt).toBeDefined()
    const nbtCompound = (entry.nbt as nbt.Tags['compound']).value as Record<string, nbt.Tags[keyof nbt.Tags]>
    const camo = (nbtCompound.CamoState as nbt.Tags['compound']).value as Record<string, nbt.Tags[keyof nbt.Tags]>
    expect((camo.Name as nbt.Tags['string']).value).toBe('minecraft:stone_bricks')
  })

  it('throws on empty (all-air) input', async () => {
    await expect(
      exportToCreateSchematic([{ x: 0, y: 0, z: 0, blockId: 'minecraft:air', blockState: {} }])
    ).rejects.toThrow(/empty/i)
  })

  it('produces gzipped output (magic bytes 1f 8b)', async () => {
    const { raw } = await exportToCreateSchematic(sampleBlocks())
    expect(raw[0]).toBe(0x1f)
    expect(raw[1]).toBe(0x8b)
  })

  it('writeNbt writes a well-formed compound', () => {
    const bytes = writeNbt({ type: 'compound', value: { hello: { type: 'string', value: 'world' } } }, 'root')
    // First byte = TAG_Compound (10)
    expect(bytes[0]).toBe(10)
    // Then ushort name length = 4 ('root')
    expect((bytes[1] << 8) | bytes[2]).toBe(4)
  })
})
