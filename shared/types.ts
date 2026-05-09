// =============================================================================
// Internal Voxel Schema — version-independent model, adapter-agnostic
// =============================================================================

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface BlockState {
  [property: string]: string
}

export interface BlockEntry {
  x: number
  y: number
  z: number
  blockId: string       // e.g. "minecraft:stone_bricks"
  blockState: BlockState
  nbtData?: Record<string, unknown>  // tile-entity payload (if any)
}

// ---- Anchor / Connection --------------------------------------------------

export type ConnectionPortType =
  | 'hallway' | 'stair' | 'elevator' | 'cable' | 'pipe'
  | 'power' | 'item' | 'fluid' | 'facade' | 'decorative'

export type Facing = 'north' | 'south' | 'east' | 'west' | 'up' | 'down'

export interface Anchor {
  id: string
  name: string
  position: Vec3
  facing: Facing
  purpose: string
}

export interface ConnectionPort {
  id: string
  type: ConnectionPortType
  position: Vec3
  facing: Facing
  size: Vec3           // width × height of opening
  requiredClearance: number
}

// ---- Style ---------------------------------------------------------------

export interface StyleProfile {
  name: string
  keywords: string[]                    // e.g. ["futuristic", "tech", "dark"]
  primaryBlocks: string[]               // blockIds that define the style
  accentBlocks: string[]
  floorBlocks: string[]
  ceilingBlocks: string[]
}

// ---- Block Palette entry (user-editable) ----------------------------------

export interface PaletteBlock {
  blockId: string
  displayName: string
  approximateColor: string              // #rrggbb hex
  category: string
  mod: string
  tags: string[]
  allowedInExport: boolean
  notes: string
  blockStatePresets: BlockState[]
}

// ---- Design Brief (for generation) ---------------------------------------

export type RoofStyle = 'flat' | 'slanted' | 'dome' | 'none'
export type FloorPattern = 'plain' | 'checkerboard' | 'diagonal' | 'bordered' | 'mixed'
export type WallPattern = 'plain' | 'paneled' | 'framed' | 'stripped' | 'pillar'
export type Symmetry = 'none' | 'x' | 'z' | 'both' | 'radial'
export type ModuleType =
  | 'starter_room' | 'machine_room' | 'hallway' | 'elevator'
  | 'ae2_room' | 'mekanism_room' | 'mystical_ag_room' | 'power_room'
  | 'platform' | 'bridge' | 'tower' | 'custom'

export interface DesignBrief {
  intendedModuleType: ModuleType
  dimensions: Vec3
  styleKeywords: string[]
  blockPalette: string[]              // blockIds
  requiredFunctionalSpaces: string[]
  forbiddenBlocks: string[]
  symmetry: Symmetry
  entranceDirections: Facing[]
  interiorClearance: number           // minimum headroom in blocks
  decorativeDensity: number           // 0-1
  lightingStyle: string
  roofStyle: RoofStyle
  floorPattern: FloorPattern
  wallPattern: WallPattern
  connectionPorts: Omit<ConnectionPort, 'id'>[]
  notes: string
}

// ---- Template Module -----------------------------------------------------

export interface MaterialEntry {
  blockId: string
  displayName: string
  count: number
}

export interface RoomBounds {
  id: string
  label: string
  type: string
  min: Vec3
  max: Vec3
}

export interface TemplateModule {
  id: string
  name: string
  category: string
  tags: string[]
  dimensions: Vec3
  origin: Vec3
  anchors: Anchor[]
  connectionPorts: ConnectionPort[]
  roomBounds?: RoomBounds[]
  blocks: BlockEntry[]
  materialList: MaterialEntry[]
  styleProfile: Partial<StyleProfile>
  sourceImages: string[]              // file paths or data-URIs
  notes: string
  designBrief?: DesignBrief
  // Meta
  projectId: string
  createdAt: string
  updatedAt: string
  sourcePrompt?: string
  exportStatus: ExportStatus
  compatibilityNotes: string
  relatedModuleIds: string[]
}

export type ExportStatus =
  | 'not_exported'
  | 'pending_validation'
  | 'validated_bg1'
  | 'validated_bg2'
  | 'validation_failed'
  | 'unvalidated_placeholder'

// ---- Project / Base Graph ------------------------------------------------

export interface ModulePlacement {
  moduleId: string
  worldPosition: Vec3
  rotation: 0 | 90 | 180 | 270       // degrees around Y axis
  anchorId?: string
  connectedToModuleId?: string
  connectedViaPortId?: string
}

export interface CollisionWarning {
  moduleIdA: string
  moduleIdB: string
  overlappingBlocks: number
  severity: 'error' | 'warning'
}

export interface BaseGraph {
  placements: ModulePlacement[]
  collisions: CollisionWarning[]
  nextPasteOrder: string[]            // ordered module IDs
}

export type BuildingGadgetsVersion = 'bg1_legacy' | 'bg2' | 'unknown'

export interface Project {
  id: string
  name: string
  minecraftVersion: string
  modpackName: string
  buildingGadgetsVersion: BuildingGadgetsVersion
  blockPalette: PaletteBlock[]
  activeBaseGraph: BaseGraph
  templateIds: string[]
  createdAt: string
  updatedAt: string
}

// ---- API request / response shapes ---------------------------------------

export interface CreateProjectRequest {
  name: string
  minecraftVersion?: string
  modpackName?: string
  buildingGadgetsVersion?: BuildingGadgetsVersion
}

export interface GenerateModuleRequest {
  projectId: string
  designBrief: DesignBrief
  prompt?: string
}

export interface ExportTemplateRequest {
  moduleId: string
  format: 'bg1_legacy' | 'bg2' | 'internal_json'
}

// ---- Design Brain Blueprint (AI-driven generation layer) -----------------

export type BlueprintRoomType =
  | 'hall' | 'room' | 'corridor' | 'stairwell' | 'utility'

export interface BlueprintRoom {
  id: string
  label: string
  type: BlueprintRoomType | string
  size: Vec3                         // inner dimensions (interior only)
  position: Vec3                     // relative to structure origin (min corner of room footprint)
  connects_to: string[]
  connect_types?: Record<string, string>  // connection_type per connected room ID
  features: string[]
  // Shape extension fields
  shape?: 'rectangle' | 'cross' | 'octagon' | 'cylinder' | 'wedge' | 'column'
  arm_width?: number
  arm_length?: number
  radius?: number
  direction?: string                 // NE/NW/SE/SW for wedge
}

export interface BlueprintMaterialPalette {
  primary_wall: string
  secondary_wall: string
  floor: string
  ceiling: string
  accent: string
  frame_material: string
}

export interface Blueprint {
  theme: string
  style_notes: string
  material_palette: BlueprintMaterialPalette
  bounding_box: Vec3
  utility_gap: boolean
  rooms: BlueprintRoom[]
}

export interface DesignBrainRequest {
  prompt: string
  imageBase64?: string | string[]  // one or more reference images (data URLs or raw base64)
  apiKey?: string                  // optional override; falls back to OPENROUTER_API_KEY env
  model?: string                   // optional model override
}

export interface BuildFromBlueprintRequest {
  projectId: string
  blueprint: Blueprint
  prompt?: string
  sourceImage?: string             // data URL retained for provenance
}

export interface ValidationReport {
  valid: boolean
  format: BuildingGadgetsVersion | 'internal'
  blockCount: number
  tileEntityCount: number
  unknownBlocks: string[]
  unsupportedBlocks: string[]
  warnings: string[]
  errors: string[]
  materialList: MaterialEntry[]
}

// ---- Building Gadgets format types (adapter-internal) --------------------

// BG1 legacy JSON template (based on validated community examples)
export interface BG1TemplateMaterialEntry {
  count: number
  item: {
    id: string
    components?: Record<string, unknown>
  }
}

export interface BG1TemplateHeader {
  material_list: {
    root_entry: BG1TemplateMaterialEntry[]
  }
}

export interface BG1Template {
  header: BG1TemplateHeader
  body: string   // base64-encoded gzipped NBT
}

// NBT palette entry (parsed from BG1 body)
export interface NBTPaletteEntry {
  Name: string
  Properties: Record<string, string>
}

// BG2 template (server-side NBT format — requires in-game validation)
// TODO: Validate exact format by inspecting a real BG2 exported template.
// Current structure is inferred from BG2 source code analysis.
export interface BG2TemplateBlock {
  pos: [number, number, number]
  state: number          // palette index
}

export interface BG2Template {
  version: number
  name: string
  author?: string
  palette: NBTPaletteEntry[]
  blocks: BG2TemplateBlock[]
  tileEntities?: Array<{ pos: [number, number, number]; nbt: Record<string, unknown> }>
}
