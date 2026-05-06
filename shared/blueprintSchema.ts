import { z } from 'zod'
import type { Blueprint } from './types.js'

const Vec3Schema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
})

const RoomSchema = z.object({
  id: z.string().min(1),
  label: z.string().default(''),
  type: z.string().default('room'),
  size: Vec3Schema,
  position: Vec3Schema,
  connects_to: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
})

const PaletteSchema = z.object({
  primary_wall:    z.string().default('stone_brick'),
  secondary_wall:  z.string().default('cobblestone'),
  floor:           z.string().default('smooth_stone'),
  ceiling:         z.string().default('stone_brick'),
  accent:          z.string().default('polished_andesite'),
  frame_material:  z.string().default('oak_log'),
})

export const BlueprintSchema = z.object({
  theme: z.string().default(''),
  style_notes: z.string().default(''),
  material_palette: PaletteSchema,
  bounding_box: Vec3Schema,
  utility_gap: z.boolean().default(false),
  rooms: z.array(RoomSchema).min(1),
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
