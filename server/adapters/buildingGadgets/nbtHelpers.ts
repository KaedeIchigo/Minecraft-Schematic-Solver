import nbt from 'prismarine-nbt'
import { promisify } from 'util'
import { gzip } from 'zlib'

const gzipAsync = promisify(gzip)

// nbt.parse accepts gzip-compressed data directly.
export async function decodeBody(base64Body: string): Promise<nbt.NBT> {
  const compressed = Buffer.from(base64Body, 'base64')
  const { parsed } = await nbt.parse(compressed)
  return parsed
}

export async function encodeBody(nbtData: nbt.NBT): Promise<string> {
  const raw = nbt.writeUncompressed(nbtData)
  const compressed = await gzipAsync(raw)
  return compressed.toString('base64')
}

// Parse a block state map (ListTag of CompoundTags)
export interface ParsedBlockState {
  name: string
  properties: Record<string, string>
}

export function parseBlockStateMap(tag: nbt.Tags['list']): ParsedBlockState[] {
  const result: ParsedBlockState[] = []
  if (!tag?.value) return result
  const items = (tag.value as { type: string; value: unknown[] }).value
  if (!Array.isArray(items)) return result
  for (const entry of items as Record<string, nbt.Tags[keyof nbt.Tags]>[]) {
    const nameTag = entry['Name'] as nbt.Tags['string'] | undefined
    const propsTag = entry['Properties'] as nbt.Tags['compound'] | undefined
    const name = nameTag?.value as string ?? 'minecraft:air'
    const properties: Record<string, string> = {}
    if (propsTag?.value) {
      for (const [k, v] of Object.entries(propsTag.value as Record<string, nbt.Tags['string']>)) {
        properties[k] = String(v.value)
      }
    }
    result.push({ name, properties })
  }
  return result
}

export function buildBlockStateMap(states: ParsedBlockState[]): nbt.Tags['list'] {
  const items = states.map(s => {
    const props: Record<string, nbt.Tags['string']> = {}
    for (const [k, v] of Object.entries(s.properties ?? {})) {
      props[k] = { type: 'string', value: v }
    }
    return {
      Name: { type: 'string' as const, value: s.name },
      Properties: { type: 'compound' as const, value: props },
    }
  })
  return { type: 'list', value: { type: 'compound', value: items as never[] } }
}

// Parse statelist entries from NBT
export interface RawStateEntry {
  pos: { x: number; y: number; z: number }
  paletteIndex: number
}

export function parseStateList(tag: nbt.Tags['list']): RawStateEntry[] {
  const result: RawStateEntry[] = []
  if (!tag?.value) return result
  const items = (tag.value as { type: string; value: unknown[] }).value
  if (!Array.isArray(items)) return result

  for (const entry of items as Record<string, nbt.Tags[keyof nbt.Tags]>[]) {
    const shortTag = entry['blockstateshort'] as nbt.Tags['short'] | undefined
    const posTag = entry['blockpos'] as nbt.Tags['long'] | undefined
    if (!shortTag || !posTag) continue

    const paletteIndex = shortTag.value as number
    const packed = longToPackedBigInt(posTag.value as [number, number])
    const { x, y, z } = unpackBlockPos(packed)
    result.push({ pos: { x, y, z }, paletteIndex })
  }
  return result
}

export function buildStateListEntry(x: number, y: number, z: number, paletteIndex: number) {
  const packed = packBlockPos(x, y, z)
  return {
    blockstateshort: { type: 'short' as const, value: paletteIndex },
    blockpos: { type: 'long' as const, value: bigIntToLong(packed) },
  }
}

// ---- Long / position helpers -----------------------------------------------

// prismarine-nbt represents longs as [hi32, lo32] two-element arrays
type NbtLong = [number, number]

function longToPackedBigInt([hi, lo]: NbtLong): bigint {
  return (BigInt(hi) << 32n) | BigInt(lo >>> 0)
}

function bigIntToLong(n: bigint): NbtLong {
  const lo = Number(n & 0xFFFFFFFFn)
  const hi = Number((n >> 32n) & 0xFFFFFFFFn)
  return [hi, lo]
}

// Minecraft BlockPos.asLong() encoding:
//   bits 38–63: X (26 bits, signed)
//   bits 12–37: Z (26 bits, signed)
//   bits  0–11: Y (12 bits, signed)
export function unpackBlockPos(packed: bigint): { x: number; y: number; z: number } {
  const x = Number(BigInt.asIntN(26, packed >> 38n))
  const z = Number(BigInt.asIntN(26, (packed << 26n) >> 38n))
  const y = Number(BigInt.asIntN(12, packed & 0xFFFn))
  return { x, y, z }
}

export function packBlockPos(x: number, y: number, z: number): bigint {
  return ((BigInt(x) & 0x3FFFFFFn) << 38n) |
         ((BigInt(z) & 0x3FFFFFFn) << 12n) |
         (BigInt(y) & 0xFFFn)
}
