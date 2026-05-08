import type { Blueprint } from '@shared/types.js'
import { extractJsonObject, normalizeBlueprintResponse, parseBlueprint } from '../../shared/blueprintSchema.js'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'google/gemini-flash-1.5'

const SYSTEM_PROMPT = `You are an expert Minecraft structure architect. Your job is to analyze a reference image (if provided) and generate a precise structural blueprint in JSON format.

CRITICAL RULES:
1. If an image is provided, it is your PRIMARY reference. Extract its geometry FIRST before anything else.
2. Identify the overall silhouette and massing from the image: Is it a tower? Cross-shaped? Has wings? Symmetric? Vertical or horizontal emphasis?
3. Identify the structural layers from bottom to top and describe each.
4. Room positions must reflect the actual spatial layout visible in the image — rooms that appear side by side must have adjacent coordinates, rooms stacked vertically must reflect that in Y position.
5. If the build has a central core, that must be reflected as a central room. Wings or extensions must be rooms positioned outward from that core.
6. Do NOT default to a generic "scatter rooms randomly" layout. Every room position must be justified by what you see.
7. There is NO size limit. Generate structures as large as the design requires. A castle should be castle-sized. A space station should be space-station-sized. Do not artificially constrain dimensions. The bounding_box must reflect the true proportions — if it is tall and narrow, Y should be larger; if it is wide with wings, X and Z should be larger.

SHAPE EXTENSIONS:
The blueprint supports non-rectangular room shapes via an optional "shape" field per room:
- "shape": "rectangle" (default)
- "shape": "cross" — room extends as a plus/cross shape, use "arm_width" and "arm_length" sub-fields
- "shape": "octagon" — approximated octagon, use "radius" sub-field
- "shape": "cylinder" — circular tower, use "radius" sub-field
- "shape": "wedge" — triangular/diagonal shape, use "direction" sub-field ("NE","NW","SE","SW")
- "shape": "column" — single-block-wide vertical shaft, uses only Y size

ROOMS SCHEMA — follow this exactly, no variations:

Each room MUST use these exact field names:
- "id" (NOT "name", NOT "room_id") — a lowercase kebab-case string like "core-bottom"
- "label" — human readable name like "Core Bottom"
- "type" — one of: hall, room, corridor, stairwell, utility
- "shape" — one of: rectangle, cross, octagon, cylinder, wedge, column
- "size" — object with keys "x", "y", "z" (inner dimensions as integers)
- "position" — object with keys "x", "y", "z" (position relative to structure origin)
- "connects_to" — array of STRINGS (just the id values, like ["core-mid", "wing-nw"])
- "connection_type" — single string for this room's primary connection style: "doorway" | "open" | "shaft" | "bridge"
- "features" — array of strings

CORRECT example room:
{
  "id": "core-bottom",
  "label": "Core Bottom",
  "type": "room",
  "shape": "cylinder",
  "size": { "x": 10, "y": 5, "z": 10 },
  "position": { "x": 15, "y": 0, "z": 15 },
  "connects_to": ["core-mid"],
  "connection_type": "shaft",
  "features": ["support_pillars"]
}

WRONG — do not use these field names:
- "name" → use "id"
- "dx/dy/dz" → use "size": { "x", "y", "z" }
- "connects_to": [{ "room": "...", "connection_type": "..." }] → use flat string array

OUTPUT: Return ONLY valid JSON matching the blueprint schema. No preamble, no explanation, no markdown fences.`

export interface DesignBrainOptions {
  prompt: string
  imageBase64?: string | string[]
  apiKey?: string
  model?: string
  temperature?: number
}

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string }
}

export async function callDesignBrain(opts: DesignBrainOptions): Promise<Blueprint> {
  const apiKey = opts.apiKey ?? process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Add it to your .env file or pass apiKey in the request.'
    )
  }
  const model = opts.model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL

  type Part = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }
  const userContent: Part[] = [{ type: 'text', text: opts.prompt }]

  const images = opts.imageBase64
    ? Array.isArray(opts.imageBase64) ? opts.imageBase64 : [opts.imageBase64]
    : []

  images.forEach((img, i) => {
    const url = img.startsWith('data:') ? img : `data:image/png;base64,${img}`
    userContent.push({ type: 'text', text: `Reference image ${i + 1}:` })
    userContent.push({ type: 'image_url', image_url: { url } })
  })

  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    temperature: opts.temperature ?? 0.7,
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/KaedeIchigo/Minecraft-Schematic-Solver',
      'X-Title': 'BG Modular Base Planner',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 500)}`)
  }
  const data = (await res.json()) as OpenRouterResponse
  if (data.error) throw new Error(`OpenRouter error: ${data.error.message ?? 'unknown'}`)

  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenRouter response had no content')

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    parsed = extractJsonObject(content)
  }
  if (parsed === null || parsed === undefined) {
    throw new Error(`Could not parse JSON from model output:\n${content.slice(0, 500)}`)
  }

  try {
    return parseBlueprint(normalizeBlueprintResponse(parsed))
  } catch (e) {
    throw new Error(`Blueprint validation failed: ${String(e)}\nRaw model output: ${content.slice(0, 800)}`)
  }
}
