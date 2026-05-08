export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const APP_VERSION = '0.4.0'

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.4.0',
    date: '2025-05-08',
    changes: [
      'Added internal version system and changelog viewer',
      'Added Luminax full block registry (all 16 colors × bright/dim variants)',
      'Added block registries: Supplementaries, Macaw\'s, Chipped, Decorative Blocks, AE2, Mekanism extended, IE extended, Thermal extended, Powah, Botania, Occultism, Create extended, Storage Drawers',
      'Added Block Template Editor with category sidebar, glow indicators, and preset buttons',
      'Added presets: Futuristic/Sci-Fi, Dark Industrial, Arcane/Mystical',
      'Luminax blocks flagged as isLightSource with emissive renderer treatment',
      'Custom registry hot-reload from external JSON file (loadCustomRegistry)',
    ],
  },
  {
    version: '0.3.0',
    date: '2025-05-08',
    changes: [
      'Added interior decoration pass (per room-type rules, console structures, wall paneling, ceiling lights)',
      'Added ATM10 block registry with Create, IE, Mekanism, Thermal, framed decorative, lighting categories',
      'Added Block Template Editor UI panel with per-slot dropdowns and Reset to AI picks button',
      'Renderer updated to use per-block registry colors',
      'Framed blocks now display camo color in renderer',
    ],
  },
  {
    version: '0.2.0',
    date: '2025-05-08',
    changes: [
      'Rewrote Design Brain system prompt to be image-first with geometry extraction',
      'Added multi-image upload support (up to 4 reference images)',
      'Added room shape types: cylinder, cross, octagon, wedge, column',
      'Added connectivity pass: doorways, corridors, shafts, bridges between rooms',
      'Added utility_gap floor layer with smooth stone slab visual',
      'Layout Engine enforces minimum 4-block room height',
    ],
  },
  {
    version: '0.1.0',
    date: '2025-05-08',
    changes: [
      'Initial build: TypeScript structure generator',
      'Create mod NBT schematic export (gzipped binary NBT)',
      'Framed blocks NBT support with CamoState tile entity data',
      'Download button for .nbt export',
      'OpenRouter API integration with configurable model',
      'Design Brain: text prompt + image reference → structured JSON blueprint',
      'Blueprint panel with room list, palette preview, raw JSON viewer',
      '3D renderer preview',
      'Block palette resolver with abstract material name mapping',
    ],
  },
]
