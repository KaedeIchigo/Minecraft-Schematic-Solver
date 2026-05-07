import { z } from 'zod'
import type { Blueprint } from './types.js'

const Vec3Schema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
})

// Accepts a connects_to entry in any of the formats models have been observed to use:
//   "room-id"
//   { id: "room-id", connection_type: "doorway" }
//   { target: "room-id", connection_type: "shaft" }   ← Gemini variant
// Returns null for garbage entries (filtered out below).
function normaliseConnectsToEntry(entry: unknown): { id: string; connection_type?: string } | string | null {
  if (typeof entry === 'string') return entry.trim() || null
  if (typeof entry !== 'object' || entry === null) return null
  const obj = entry as Record<string, unknown>
  const id = String(obj.id ?? obj.target ?? '').trim()
  if (!id) return null
  const connection_type = typeof obj.connection_type === 'string' ? obj.connection_type : undefined
  return { id, connection_type }
}

// Normalise a raw room object: models sometimes use flat x/y/z for position and
// x_size/y_size/z_size (or width/height/depth) for size instead of nested objects.
function normaliseRoom(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw
  const r = raw as Record<string, unknown>

  const position: Record<string, unknown> =
    (typeof r.position === 'object' && r.position !== null)
      ? (r.position as Record<string, unknown>)
      : {
          x: r.x   ?? r.pos_x ?? 0,
          y: r.y   ?? r.pos_y ?? 0,
          z: r.z   ?? r.pos_z ?? 0,
        }

  const size: Record<string, unknown> =
    (typeof r.size === 'object' && r.size !== null)
      ? (r.size as Record<string, unknown>)
      : {
          x: r.x_size ?? r.width  ?? r.size_x ?? r.sx ?? 1,
          y: r.y_size ?? r.height ?? r.size_y ?? r.sy ?? 4,
          z: r.z_size ?? r.depth  ?? r.size_z ?? r.sz ?? 1,
        }

  return { ...r, position, size }
}

const RoomSchemaInner = z.object({
  id: z.string().min(1),
  label: z.string().default(''),
  type: z.string().default('room'),
  size: Vec3Schema,
  position: Vec3Schema,
  connects_to: z.array(z.unknown()).default([]),
  features: z.array(z.string()).default([]),
  shape: z.string().optional(),
  arm_width: z.number().optional(),
  arm_length: z.number().optional(),
  radius: z.number().optional(),
  direction: z.string().optional(),
}).transform(room => {
  const connect_types: Record<string, string> = {}
  const connects_to: string[] = []
  for (const raw of room.connects_to) {
    const entry = normaliseConnectsToEntry(raw)
    if (entry === null) continue
    if (typeof entry === 'string') { connects_to.push(entry); continue }
    if (entry.connection_type) connect_types[entry.id] = entry.connection_type
    connects_to.push(entry.id)
  }
  return { ...room, connects_to, connect_types }
})

const RoomSchema = z.preprocess(normaliseRoom, RoomSchemaInner)

const PaletteSchema = z.object({
  primary_wall:   z.string().default('stone_brick'),
  secondary_wall: z.string().default('cobblestone'),
  floor:          z.string().default('smooth_stone'),
  ceiling:        z.string().default('stone_brick'),
  accent:         z.string().default('polished_andesite'),
  frame_material: z.string().default('oak_log'),
})

export const BlueprintSchema = z.object({
  theme:            z.string().default(''),
  style_notes:      z.string().default(''),
  // Fully optional — models frequently omit it; all fields have safe defaults.
  material_palette: PaletteSchema.default({}),
  // Defensive default so a missing bounding_box doesn't hard-fail.
  bounding_box:     Vec3Schema.default({ x: 30, y: 20, z: 30 }),
  utility_gap:      z.boolean().default(false),
  rooms:            z.array(RoomSchema).min(1),
})

export function parseBlueprint(raw: unknown): Blueprint {
  return BlueprintSchema.parse(raw) as Blueprint
}

/**
 * Salvage a Blueprint from a raw model response that might be wrapped in
 * Markdown fences or contain leading prose. Returns null if no JSON object
 * could be located.
 */
export function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/i)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  const slice = candidate.slice(start, end + 1)
  try {
    return JSON.parse(slice)
  } catch {
    return null
  }
}
