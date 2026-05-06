# Building Gadgets Template Compatibility

## Status Summary

| Format | Support | In-Game Validated |
|--------|---------|-------------------|
| Building Gadgets 1 (legacy, 1.14–1.16.x) | Full import + export | **NOT YET** — synthetic test only |
| Building Gadgets 2 (NeoForge, 1.20+) | Import stub only | **NOT YET** — format unconfirmed |

---

## Building Gadgets 1 (Legacy) — `bg1_legacy`

### File Format

BG1 templates are JSON files with two top-level fields:

```json
{
  "header": {
    "material_list": {
      "root_entry": [
        { "count": 42, "item": { "id": "minecraft:stone_bricks" } }
      ]
    }
  },
  "body": "<base64-encoded-gzip-compressed-NBT>"
}
```

### Body NBT Structure

The `body` field is:
1. Base64-decoded → raw bytes
2. GZIP-decompressed → raw NBT bytes
3. Parsed as a Minecraft NBT Compound

The NBT compound contains:

| Key | Type | Description |
|-----|------|-------------|
| `blockstatemap` | `ListTag<CompoundTag>` | Palette: unique block states |
| `statelist` | `ListTag<CompoundTag>` | Block placements (pos + palette index) |
| `startpos` | `IntArrayTag` | `[x, y, z]` of min corner |
| `endpos` | `IntArrayTag` | `[x, y, z]` of max corner |

Each `blockstatemap` entry:
```nbt
{
  Name: "minecraft:stone_bricks",
  Properties: { variant: "stone_bricks" }
}
```

Each `statelist` entry:
```nbt
{
  blockstateshort: 0s,         // short — index into blockstatemap
  blockpos: 1234567890L        // long — packed using BlockPos.asLong()
}
```

### Position Encoding

Minecraft's `BlockPos.asLong()` encoding:
- Bits 38–63: X coordinate (26 bits, signed)
- Bits 12–37: Z coordinate (26 bits, signed)
- Bits 0–11: Y coordinate (12 bits, signed)

### Adapter Location

```
server/adapters/buildingGadgets/
├── importTemplate.ts      # Decodes base64 → gunzip → parse NBT → BlockEntry[]
├── exportTemplate.ts      # BlockEntry[] → NBT → gzip → base64 → BG1Template
├── nbtHelpers.ts          # Pack/unpack BlockPos, encode/decode palette
```

### Known Limitations

- Block states with complex property values may not round-trip correctly for mods that use non-standard property types.
- Tile entity data (chest contents, furnace fuel, etc.) is NOT supported — blocks with `nbtData` will be exported as structural blocks only.
- The maximum safe palette size is 32767 (short limit). Structures with more unique block states will fail to export.

### Validation TODO

**⚠️ Action required:** To confirm the exporter produces files that the Template Manager accepts:

1. Run the game with Building Gadgets installed.
2. Export any structure using the Copy/Paste Gadget → Template Manager → Copy.
3. Save the resulting JSON text to `fixtures/real_bg1_template.json`.
4. Add a round-trip test in `tests/roundTrip.test.ts` using that fixture.
5. Also: export a structure using this tool → paste into Template Manager → confirm it loads.

---

## Building Gadgets 2 — `bg2`

### Status: NOT VALIDATED

BG2 stores data server-side in world data (NBT format) referenced by UUID.
The Template Manager block may export templates in a different format than BG1.

### Current Knowledge (from source code analysis)

Internal storage uses:
- `copyPasteLookup`: `HashMap<UUID, ArrayList<StatePos>>`
- Each `StatePos`: block state + block position (using compressed short palette index + packed long)
- `teMap`: tile entity data per UUID

Export/import from the Template Manager block's clipboard functionality is not yet confirmed.

### What needs to happen before BG2 export is available

1. Obtain ATM10 To The Sky modpack.
2. Launch the game and place a Template Manager block.
3. Use the Copy/Paste Gadget to select a structure.
4. Bring the gadget to the Template Manager and click "Copy" (or equivalent).
5. The clipboard content is the BG2 template format.
6. Paste it into `fixtures/real_bg2_template.json` (or `.txt` if it's plain text).
7. Inspect the format and update `server/adapters/buildingGadgets/importTemplate.ts` accordingly.
8. Update `server/adapters/buildingGadgets/exportTemplate.ts` to produce the confirmed format.
9. Add round-trip tests.
10. Remove the `_warning` field from `exportTemplateBG2`.

### Adapter Location

```
server/adapters/buildingGadgets/exportTemplate.ts — exportTemplateBG2() (placeholder)
server/adapters/buildingGadgets/importTemplate.ts — importBG2() (placeholder)
```

---

## ATM10 To The Sky — Mod Version Notes

| Property | Value |
|----------|-------|
| Minecraft Version | 1.21.1 |
| Mod Loader | NeoForge |
| Building Gadgets Mod | Building Gadgets 2 (BG2) |
| BG2 Approx Version | 1.3.x–1.4.x (as of 2025-2026) |

Since ATM10 TTS uses BG2, the BG2 adapter is the production target.
The BG1 adapter is included for legacy compatibility and round-trip testing infrastructure.

---

## Round-Trip Test Infrastructure

The round-trip test (`roundTripTemplate`) does the following:
1. Export internal blocks → BG1Template
2. Import BG1Template → internal blocks
3. Export again → BG1Template
4. Import again → internal blocks
5. Compare block counts between steps 1 and 4

A successful round-trip means the serialization is internally consistent.
It does NOT guarantee the template works in-game.

**The only way to confirm in-game compatibility is to load the template in the Template Manager.**
