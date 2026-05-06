import type { BlockEntry } from './types.js'

// Minimal browser-safe NBT binary writer (big-endian, gzipped at the end).
// Tag layout:
//   compound: sequence of named tags + TAG_End
//   list:     itemType:byte, length:int, payloads (no names)
//   string:   ushort length + UTF-8 bytes

type NbtTag =
  | { type: 'byte';      value: number }
  | { type: 'short';     value: number }
  | { type: 'int';       value: number }
  | { type: 'long';      value: bigint }
  | { type: 'float';     value: number }
  | { type: 'double';    value: number }
  | { type: 'string';    value: string }
  | { type: 'byteArray'; value: number[] }
  | { type: 'intArray';  value: number[] }
  | { type: 'longArray'; value: bigint[] }
  | { type: 'list';      itemType: NbtTag['type'] | 'end'; value: NbtTag[] }
  | { type: 'compound';  value: Record<string, NbtTag> }

const TAG_ID: Record<NbtTag['type'] | 'end', number> = {
  end: 0, byte: 1, short: 2, int: 3, long: 4, float: 5, double: 6,
  byteArray: 7, string: 8, list: 9, compound: 10, intArray: 11, longArray: 12,
}

class NbtWriter {
  private buf = new Uint8Array(4096)
  private pos = 0

  private ensure(n: number) {
    if (this.pos + n <= this.buf.length) return
    let cap = this.buf.length
    while (cap < this.pos + n) cap *= 2
    const nb = new Uint8Array(cap)
    nb.set(this.buf)
    this.buf = nb
  }
  private dv() { return new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength) }

  byte(v: number)   { this.ensure(1); this.buf[this.pos++] = v & 0xff }
  short(v: number)  { this.ensure(2); this.dv().setInt16(this.pos, v, false);  this.pos += 2 }
  ushort(v: number) { this.ensure(2); this.dv().setUint16(this.pos, v, false); this.pos += 2 }
  int(v: number)    { this.ensure(4); this.dv().setInt32(this.pos, v, false);  this.pos += 4 }
  long(v: bigint)   { this.ensure(8); this.dv().setBigInt64(this.pos, v, false); this.pos += 8 }
  float(v: number)  { this.ensure(4); this.dv().setFloat32(this.pos, v, false); this.pos += 4 }
  double(v: number) { this.ensure(8); this.dv().setFloat64(this.pos, v, false); this.pos += 8 }
  string(s: string) {
    const bytes = new TextEncoder().encode(s)
    if (bytes.length > 0xffff) throw new Error('NBT string exceeds 65535 bytes')
    this.ushort(bytes.length)
    this.ensure(bytes.length)
    this.buf.set(bytes, this.pos)
    this.pos += bytes.length
  }
  finish(): Uint8Array { return this.buf.slice(0, this.pos) }
}

function writePayload(w: NbtWriter, tag: NbtTag) {
  switch (tag.type) {
    case 'byte':   w.byte(tag.value); return
    case 'short':  w.short(tag.value); return
    case 'int':    w.int(tag.value); return
    case 'long':   w.long(tag.value); return
    case 'float':  w.float(tag.value); return
    case 'double': w.double(tag.value); return
    case 'string': w.string(tag.value); return
    case 'byteArray': w.int(tag.value.length); for (const b of tag.value) w.byte(b); return
    case 'intArray':  w.int(tag.value.length); for (const i of tag.value) w.int(i); return
    case 'longArray': w.int(tag.value.length); for (const l of tag.value) w.long(l); return
    case 'list': {
      const itemId = tag.value.length === 0 ? TAG_ID.end : TAG_ID[tag.itemType]
      w.byte(itemId)
      w.int(tag.value.length)
      for (const item of tag.value) writePayload(w, item)
      return
    }
    case 'compound': {
      for (const [name, child] of Object.entries(tag.value)) {
        w.byte(TAG_ID[child.type])
        w.string(name)
        writePayload(w, child)
      }
      w.byte(TAG_ID.end)
      return
    }
  }
}

export function writeNbt(root: NbtTag, rootName = ''): Uint8Array {
  const w = new NbtWriter()
  w.byte(TAG_ID[root.type])
  w.string(rootName)
  writePayload(w, root)
  return w.finish()
}

async function gzipBytes(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('gzip')
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(cs)
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

// ─── JS → NBT inference (used for tile-entity nbtData like framed blocks) ────

function jsValueToNbt(value: unknown): NbtTag {
  if (typeof value === 'string')  return { type: 'string', value }
  if (typeof value === 'boolean') return { type: 'byte', value: value ? 1 : 0 }
  if (typeof value === 'bigint')  return { type: 'long', value }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { type: 'int', value } : { type: 'double', value }
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'list', itemType: 'end', value: [] }
    const items = value.map(jsValueToNbt)
    const itemType = items[0].type
    return { type: 'list', itemType, value: items }
  }
  if (value && typeof value === 'object') {
    const entries: Record<string, NbtTag> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === null || v === undefined) continue
      entries[k] = jsValueToNbt(v)
    }
    return { type: 'compound', value: entries }
  }
  return { type: 'string', value: '' }
}

// ─── Build the structure NBT root ────────────────────────────────────────────

interface PaletteEntry { Name: string; Properties: Record<string, string> }

export interface CreateSchematicNbt {
  raw: Uint8Array
  paletteSize: number
  blockCount: number
  size: { x: number; y: number; z: number }
}

export function buildCreateSchematicRoot(blocks: BlockEntry[], dataVersion = 3700): {
  root: NbtTag
  paletteSize: number
  blockCount: number
  size: { x: number; y: number; z: number }
} {
  const airIds = new Set(['minecraft:air', 'minecraft:cave_air'])
  const nonAir = blocks.filter(b => !airIds.has(b.blockId))
  if (nonAir.length === 0) throw new Error('Cannot export empty schematic (no non-air blocks)')

  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (const b of nonAir) {
    if (b.x < minX) minX = b.x
    if (b.y < minY) minY = b.y
    if (b.z < minZ) minZ = b.z
    if (b.x > maxX) maxX = b.x
    if (b.y > maxY) maxY = b.y
    if (b.z > maxZ) maxZ = b.z
  }
  const size = { x: maxX - minX + 1, y: maxY - minY + 1, z: maxZ - minZ + 1 }

  const paletteMap = new Map<string, number>()
  const palette: PaletteEntry[] = []
  const stateKey = (id: string, s: Record<string, string>) =>
    `${id}|${Object.entries(s).sort().map(([k, v]) => `${k}=${v}`).join(',')}`
  const interned = (id: string, s: Record<string, string>) => {
    const k = stateKey(id, s)
    let idx = paletteMap.get(k)
    if (idx === undefined) {
      idx = palette.length
      paletteMap.set(k, idx)
      palette.push({ Name: id, Properties: s ?? {} })
    }
    return idx
  }

  const blockEntries: NbtTag[] = nonAir.map(b => {
    const idx = interned(b.blockId, b.blockState)
    const entry: Record<string, NbtTag> = {
      state: { type: 'int', value: idx },
      pos: { type: 'list', itemType: 'int', value: [
        { type: 'int', value: b.x - minX },
        { type: 'int', value: b.y - minY },
        { type: 'int', value: b.z - minZ },
      ]},
    }
    if (b.nbtData && Object.keys(b.nbtData).length > 0) {
      entry.nbt = jsValueToNbt(b.nbtData)
    }
    return { type: 'compound', value: entry }
  })

  const paletteEntries: NbtTag[] = palette.map(p => {
    const props: Record<string, NbtTag> = {}
    for (const [k, v] of Object.entries(p.Properties ?? {})) {
      props[k] = { type: 'string', value: v }
    }
    return {
      type: 'compound',
      value: {
        Name: { type: 'string', value: p.Name },
        Properties: { type: 'compound', value: props },
      },
    }
  })

  const root: NbtTag = {
    type: 'compound',
    value: {
      DataVersion: { type: 'int', value: dataVersion },
      size: { type: 'list', itemType: 'int', value: [
        { type: 'int', value: size.x },
        { type: 'int', value: size.y },
        { type: 'int', value: size.z },
      ]},
      palette: { type: 'list', itemType: 'compound', value: paletteEntries },
      blocks: { type: 'list', itemType: 'compound', value: blockEntries },
      entities: { type: 'list', itemType: 'end', value: [] },
    },
  }

  return { root, paletteSize: palette.length, blockCount: nonAir.length, size }
}

export async function exportToCreateSchematic(
  blocks: BlockEntry[],
  dataVersion = 3700
): Promise<CreateSchematicNbt> {
  const { root, paletteSize, blockCount, size } = buildCreateSchematicRoot(blocks, dataVersion)
  const uncompressed = writeNbt(root, '')
  const raw = await gzipBytes(uncompressed)
  return { raw, paletteSize, blockCount, size }
}
