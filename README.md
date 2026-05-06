# BG Modular Base Planner

A local tool for creating, previewing, and exporting modular Building Gadgets copy-paste templates for Minecraft — specifically designed for **All The Mods 10: To The Sky**.

## Features

- **Template Library** — persistent SQLite-backed library of all modules
- **Module Generator** — procedural generation from structured design briefs
- **3D Renderer** — React Three Fiber Minecraft-like voxel preview with orbit camera
- **Export** — Building Gadgets 1 (legacy) format with round-trip validation
- **Modular base graph** — tracks module footprints, anchors, and connection ports
- **Collision detection** — prevents module overlap in the base graph
- **Style profiles** — match new modules to existing base aesthetics

## Setup

### Requirements

- Node.js 18+ (tested on Node 22)
- npm 9+

### Install

```bash
cd bg-modular-base-planner
npm install
```

### Run (development)

```bash
npm run dev
```

This starts:
- **Backend** on `http://localhost:3001` (Express + SQLite)
- **Frontend** on `http://localhost:5173` (Vite + React)

Open `http://localhost:5173` in your browser.

### Run (production)

```bash
npm run build
npm run server
```

Then open `http://localhost:3001`.

### Tests

```bash
npm test
```

## Usage

### 1. Create a Project

Open the Dashboard → type a project name → press **+**.

### 2. Generate a Module

Go to **Generator** → select a Quick Preset or fill out the Design Brief manually → click **Generate Module**.

The system procedurally creates a voxel structure based on:
- Module type (machine room, hallway, elevator, etc.)
- Dimensions (X × Y × Z)
- Style keywords (tech, clean, dark industrial, etc.)
- Entrance directions and connection ports

### 3. Preview in Renderer

Click **View in Renderer** to open the 3D preview.

Controls:
- Left-drag: Orbit
- Right-drag: Pan
- Scroll: Zoom
- Toggle grid, bounding box, anchors, layer slice (Y)
- Click a block to inspect its ID and block state

### 4. Export

Go to **Export** → select **Building Gadgets 1 (Legacy)** → click **Export**.

Copy the exported text and paste it into the **Template Manager** block in-game using the Paste button.

> **Important**: BG2 format is not yet validated. Use BG1 Legacy format and test in-game first.
> See [docs/BG_COMPATIBILITY.md](docs/BG_COMPATIBILITY.md) for details.

### 5. Validate In-Game

After a successful in-game paste, go back to the Export page and run the **Round-Trip Test** to confirm serialization integrity. Mark the template as validated in the library.

## Import Existing Templates

Go to a project → use the API endpoint `/api/templates/import` with a BG1 JSON template body:

```json
{
  "raw": { "header": {...}, "body": "..." },
  "projectId": "your-project-id",
  "name": "My Imported Template"
}
```

## Project Structure

```
.
├── src/                  # React frontend (Vite)
│   ├── pages/            # Dashboard, Library, Generator, Renderer, Export
│   ├── components/       # VoxelRenderer, UI components
│   └── store/            # Zustand state + API client
├── server/               # Express backend
│   ├── adapters/buildingGadgets/  # BG import/export adapter
│   ├── db/               # SQLite repos (projects, templates)
│   └── routes/           # REST API routes
├── shared/               # Shared types, voxelOps, generator (no Node/browser deps)
├── fixtures/             # Sample briefs, test fixtures
├── tests/                # Vitest tests
└── docs/                 # SCHEMA.md, BG_COMPATIBILITY.md
```

## Building Gadgets Compatibility

| Feature | Status |
|---------|--------|
| BG1 import | ✓ Implemented |
| BG1 export | ✓ Implemented |
| BG1 round-trip test | ✓ Passes (synthetic fixture) |
| BG1 in-game validation | ⚠️ TODO — requires real Template Manager test |
| BG2 import | ⚠️ Placeholder — format not confirmed |
| BG2 export | ⚠️ Placeholder — format not confirmed |
| In-game test (ATM10 TTS) | ⚠️ TODO |

See [docs/BG_COMPATIBILITY.md](docs/BG_COMPATIBILITY.md) for the full validation checklist.

## Sample Modules

The following sample modules are included as design brief fixtures (`fixtures/sampleModules.ts`):

| Module | Dimensions | Category |
|--------|-----------|----------|
| 9×9 Starter Room | 9×6×9 | starter_room |
| 17×17 Machine Room | 17×9×17 | machine_room |
| 5-Wide Hallway | 5×5×17 | hallway |
| Vertical Elevator | 5×20×5 | elevator |
| AE2 Terminal Room | 13×7×13 | ae2_room |
| Skyblock Platform | 17×4×17 | platform |

Generate these from the Generator page or via the API.

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create project |
| GET | `/api/templates?projectId=` | List templates |
| POST | `/api/templates/generate` | Generate from brief |
| POST | `/api/templates/import` | Import BG template |
| GET | `/api/templates/:id/validate` | Validation report |
| POST | `/api/templates/:id/export` | Export BG1/internal |
| POST | `/api/templates/:id/roundtrip` | Round-trip test |
| GET | `/api/templates/:id/materials` | Material list |

## Contributing / Validation

The most valuable contribution right now is **in-game validation**:

1. Launch ATM10 To The Sky
2. Export a structure using the Copy/Paste Gadget + Template Manager
3. Save the clipboard text to `fixtures/real_bg2_template.json`
4. Also test importing an exported template back in-game
5. Report the exact format and update the BG2 adapter

See [docs/BG_COMPATIBILITY.md](docs/BG_COMPATIBILITY.md) for step-by-step instructions.
