# BG Modular Base Planner — Internal Schema

## Overview

The internal schema is version-independent. It does not assume any Building Gadgets format.
The adapter layer (`server/adapters/buildingGadgets/`) translates between this schema and the BG export format.

---

## Core Types

### `BlockEntry`
The atomic unit. Represents a single placed block.

```typescript
interface BlockEntry {
  x: number
  y: number
  z: number
  blockId: string       // Namespaced block ID, e.g. "minecraft:stone_bricks"
  blockState: Record<string, string>  // e.g. { facing: "north", lit: "false" }
  nbtData?: Record<string, unknown>   // Optional tile-entity payload
}
```

**Coordinate system**: Positive X = East, Positive Y = Up, Positive Z = South (Minecraft standard).

### `TemplateModule`
A named, tagged structure with metadata for modular base management.

```typescript
interface TemplateModule {
  id: string
  name: string
  category: ModuleType
  tags: string[]
  dimensions: Vec3      // Total bounding box (inclusive)
  origin: Vec3          // Paste origin relative to world
  anchors: Anchor[]     // Named connection points
  connectionPorts: ConnectionPort[]
  blocks: BlockEntry[]
  materialList: MaterialEntry[]
  styleProfile: Partial<StyleProfile>
  sourceImages: string[]
  notes: string
  designBrief?: DesignBrief
  projectId: string
  createdAt: string
  updatedAt: string
  sourcePrompt?: string
  exportStatus: ExportStatus
  compatibilityNotes: string
  relatedModuleIds: string[]
}
```

### `ExportStatus`

| Value | Meaning |
|-------|---------|
| `not_exported` | Never been exported |
| `pending_validation` | Exported but not tested in-game |
| `validated_bg1` | Confirmed working in BG1 Template Manager |
| `validated_bg2` | Confirmed working in BG2 Template Manager |
| `validation_failed` | Tested and rejected by the game |
| `unvalidated_placeholder` | Exported but format is unconfirmed |

### `Anchor`
A named connection point on a module.

```typescript
interface Anchor {
  id: string
  name: string
  position: Vec3
  facing: Facing          // "north" | "south" | "east" | "west" | "up" | "down"
  purpose: string         // human label: "entrance", "power_input", etc.
}
```

### `ConnectionPort`
A typed interface for connecting utilities between modules.

```typescript
interface ConnectionPort {
  id: string
  type: ConnectionPortType  // "hallway" | "pipe" | "cable" | "power" | ...
  position: Vec3
  facing: Facing
  size: Vec3               // Width × height of the opening
  requiredClearance: number
}
```

### `DesignBrief`
Structured input for the procedural generator.

```typescript
interface DesignBrief {
  intendedModuleType: ModuleType
  dimensions: Vec3
  styleKeywords: string[]
  blockPalette: string[]      // Override block IDs [wall, floor, ceiling, accent, light]
  requiredFunctionalSpaces: string[]
  forbiddenBlocks: string[]
  symmetry: Symmetry
  entranceDirections: Facing[]
  interiorClearance: number   // Min headroom in blocks
  decorativeDensity: number   // 0–1
  lightingStyle: string
  roofStyle: RoofStyle
  floorPattern: FloorPattern
  wallPattern: WallPattern
  connectionPorts: Omit<ConnectionPort, 'id'>[]
  notes: string
}
```

---

## Voxel Operations (shared/voxelOps.ts)

| Function | Description |
|----------|-------------|
| `computeBounds(blocks)` | Returns `{ min, max, dimensions }` |
| `translate(blocks, delta)` | Shifts all blocks by a Vec3 delta |
| `normalizeToOrigin(blocks)` | Shifts min corner to (0,0,0) |
| `rotate90(blocks, times)` | Rotates 90° CW around Y axis (n times) |
| `mirrorX(blocks)` | Mirrors along X axis |
| `mirrorZ(blocks)` | Mirrors along Z axis |
| `fillCuboid(min, max, blockId)` | Fills a cuboid with blocks |
| `hollowCuboid(min, max, wallId)` | Hollow room shell |
| `computeMaterialList(blocks)` | Returns sorted material count list |
| `detectCollision(a, originA, b, originB)` | Returns number of overlapping non-air blocks |
| `deduplicateBlocks(blocks)` | Last writer wins for same position |
| `carveOpening(blocks, pos, facing, w, h)` | Removes wall blocks to create a doorway |
| `buildRoom(spec)` | Generates a room shell with floor, ceiling, walls, lighting |

---

## Project / Base Graph

```typescript
interface Project {
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

interface BaseGraph {
  placements: ModulePlacement[]   // Modules placed in world space
  collisions: CollisionWarning[]  // Detected overlaps
  nextPasteOrder: string[]        // Suggested paste sequence
}

interface ModulePlacement {
  moduleId: string
  worldPosition: Vec3
  rotation: 0 | 90 | 180 | 270
  anchorId?: string
  connectedToModuleId?: string
  connectedViaPortId?: string
}
```

---

## Database (SQLite)

Tables: `projects`, `templates`, `exported_templates`, `uploaded_images`

Complex types (arrays, objects) are stored as JSON strings in TEXT columns.
