import type { BG1Template } from '@shared/types.js'
import { importTemplate } from './importTemplate.js'
import { exportTemplate } from './exportTemplate.js'

export interface RoundTripResult {
  success: boolean
  blockCountOriginal: number
  blockCountExported: number
  paletteCountOriginal: number
  paletteCountExported: number
  blockCountMatch: boolean
  paletteCountMatch: boolean
  warnings: string[]
  errors: string[]
}

/**
 * Round-trip a BG1 template: import → internal → export → re-import,
 * then verify that block counts and palettes are consistent.
 *
 * This does NOT verify in-game loading — it only verifies serialization fidelity.
 * The exported template must still be tested in the Template Manager.
 */
export async function roundTripTemplate(raw: BG1Template): Promise<RoundTripResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // Step 1: Import
  let imported
  try {
    imported = await importTemplate(raw)
  } catch (e) {
    return {
      success: false,
      blockCountOriginal: 0,
      blockCountExported: 0,
      paletteCountOriginal: 0,
      paletteCountExported: 0,
      blockCountMatch: false,
      paletteCountMatch: false,
      warnings,
      errors: [`Import failed: ${String(e)}`],
    }
  }

  if (imported.warnings.length > 0) warnings.push(...imported.warnings.map(w => `[import] ${w}`))

  const paletteCountOriginal = imported.palette.length
  const blockCountOriginal = imported.blocks.filter(b => b.blockId !== 'minecraft:air').length

  // Step 2: Export back
  let exported: BG1Template
  try {
    exported = await exportTemplate(imported.blocks)
  } catch (e) {
    return {
      success: false,
      blockCountOriginal,
      blockCountExported: 0,
      paletteCountOriginal,
      paletteCountExported: 0,
      blockCountMatch: false,
      paletteCountMatch: false,
      warnings,
      errors: [`Export failed: ${String(e)}`],
    }
  }

  // Step 3: Re-import
  let reimported
  try {
    reimported = await importTemplate(exported)
  } catch (e) {
    return {
      success: false,
      blockCountOriginal,
      blockCountExported: 0,
      paletteCountOriginal,
      paletteCountExported: 0,
      blockCountMatch: false,
      paletteCountMatch: false,
      warnings,
      errors: [`Re-import failed: ${String(e)}`],
    }
  }

  if (reimported.warnings.length > 0) warnings.push(...reimported.warnings.map(w => `[reimport] ${w}`))

  const blockCountExported = reimported.blocks.filter(b => b.blockId !== 'minecraft:air').length
  const paletteCountExported = reimported.palette.length

  const blockCountMatch = blockCountOriginal === blockCountExported
  const paletteCountMatch = paletteCountOriginal === paletteCountExported

  if (!blockCountMatch) {
    errors.push(`Block count mismatch: original=${blockCountOriginal} exported=${blockCountExported}`)
  }
  if (!paletteCountMatch) {
    warnings.push(`Palette count mismatch: original=${paletteCountOriginal} exported=${paletteCountExported} (may be OK if blocks were deduplicated)`)
  }

  return {
    success: errors.length === 0,
    blockCountOriginal,
    blockCountExported,
    paletteCountOriginal,
    paletteCountExported,
    blockCountMatch,
    paletteCountMatch,
    warnings,
    errors,
  }
}
