import type { Blueprint } from '@shared/types.js'
import { extractJsonObject, parseBlueprint } from '../../shared/blueprintSchema.js'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'google/gemini-flash-1.5'

const SYSTEM_PROMPT = `You are the Design Brain for a Minecraft procedural-base planner.
Given a user prompt (and optionally a reference image), produce a single JSON
object — and ONLY that JSON object — describing a buildable structure.

The JSON MUST exactly match this schema:

{
  "theme": "<short theme name, e.g. lunar industrial base>",
  "style_notes": "<one or two sentences of aesthetic guidance>",
  "material_palette": {
    "primary_wall":   "<abstract material name, e.g. stone_brick, polished_blackstone>",
    "secondary_wall": "<abstract material name>",
    "floor":          "<abstract material name>",
    "ceiling":        "<abstract material name>",
    "accent":         "<abstract material name for decorative trim>",
    "frame_material": "<material used for framed-block camo>"
  },
  "bounding_box": { "x": <int>, "y": <int>, "z": <int> },
  "utility_gap": <true|false>,
  "rooms": [
    {
      "id":          "<unique kebab-case id>",
      "label":       "<short human label>",
      "type":        "<one of: hall, room, corridor, stairwell, utility>",
      "size":        { "x": <int>, "y": <int>, "z": <int> },
      "position":    { "x": <int>, "y": <int>, "z": <int> },
      "connects_to": ["<other room id>", ...],
      "features":    ["<e.g. arched_ceiling, large_windows, support_pillars>"]
    }
  ]
}

RULES:
- Output ONLY the JSON object. No prose, no Markdown fences, no explanations.
- All sizes are inner dimensions in blocks (the outer footprint adds walls).
- Minimum room inner height is 4 blocks. Use larger heights for halls.
- Room "position" is the outer min corner relative to the structure origin.
- Position rooms so they fit within bounding_box and don't overlap (touching walls is fine).
- Use connects_to to indicate doorways between rooms. Connections are bidirectional.
- Set utility_gap=true for industrial/tech themes that benefit from cabling space.
- 4–8 rooms is a typical good count. More if the prompt suggests a large complex.
- Material names are abstract; the engine resolves them. Prefer common Minecraft block names.`

export interface DesignBrainOptions {
  prompt: string
  imageBase64?: string
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
  if (opts.imageBase64) {
    const url = opts.imageBase64.startsWith('data:')
      ? opts.imageBase64
      : `data:image/png;base64,${opts.imageBase64}`
    userContent.push({ type: 'image_url', image_url: { url } })
  }

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
    return parseBlueprint(parsed)
  } catch (e) {
    throw new Error(`Blueprint validation failed: ${String(e)}\nRaw model output: ${content.slice(0, 800)}`)
  }
}
