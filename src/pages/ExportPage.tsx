import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../store/api.ts'
import { useAppStore } from '../store/appStore.ts'
import type { TemplateModule, ValidationReport } from '@shared/types.js'
import { exportToCreateSchematic } from '@shared/createSchematicExport.js'

export default function ExportPage() {
  const { id } = useParams()
  const { templates } = useAppStore()
  const [template, setTemplate] = useState<TemplateModule | null>(null)
  const [validation, setValidation] = useState<ValidationReport | null>(null)
  const [exportData, setExportData] = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState<'bg1_legacy' | 'internal_json'>('bg1_legacy')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [roundTripResult, setRoundTripResult] = useState<{ success: boolean; errors: string[]; warnings: string[] } | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [creatingNbt, setCreatingNbt] = useState(false)

  useEffect(() => {
    if (id) {
      setLoading(true)
      Promise.all([
        api.templates.get(id),
        api.templates.validate(id),
      ]).then(([t, v]) => {
        setTemplate(t)
        setValidation(v)
      }).catch(e => setError(String(e)))
        .finally(() => setLoading(false))
    }
  }, [id])

  async function doExport() {
    if (!template) return
    setExporting(true)
    setError('')
    try {
      const result = await api.templates.export(template.id, { format: exportFormat })
      setExportData(result.data)
    } catch (e) {
      setError(String(e))
    } finally {
      setExporting(false)
    }
  }

  async function doRoundTrip() {
    if (!template) return
    setLoading(true)
    try {
      const result = await api.templates.roundtrip(template.id)
      setRoundTripResult(result)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard() {
    if (!exportData) return
    navigator.clipboard.writeText(exportData).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function downloadCreateNbt() {
    if (!template) return
    setCreatingNbt(true)
    setError('')
    try {
      const { raw } = await exportToCreateSchematic(template.blocks)
      const blob = new Blob([raw as BlobPart], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = template.name.replace(/\s+/g, '_').replace(/[^\w.-]/g, '') || 'structure'
      a.download = `${safeName}.nbt`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(`Create schematic export failed: ${String(e)}`)
    } finally {
      setCreatingNbt(false)
    }
  }

  function downloadFile() {
    if (!exportData || !template) return
    const ext = exportFormat === 'bg1_legacy' ? 'json' : 'json'
    const blob = new Blob([exportData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${template.name.replace(/\s+/g, '_')}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-white">Export Template</h1>

      {error && <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded text-sm">{error}</div>}

      {/* Template picker if no ID */}
      {!id && (
        <div className="p-4 rounded-lg" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
          <div className="text-sm text-gray-400 mb-2">Select a template from the Library to export</div>
          <div className="grid grid-cols-3 gap-2">
            {templates.map(t => (
              <a key={t.id} href={`/export/${t.id}`}
                className="p-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs">
                {t.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="text-gray-400">Loading...</div>}

      {template && (
        <div className="grid grid-cols-2 gap-4">
          {/* Left: validation report */}
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
              <h2 className="text-sm font-semibold text-white mb-3">Template Info</h2>
              <dl className="space-y-1 text-sm">
                <Row label="Name" value={template.name} />
                <Row label="Dimensions" value={`${template.dimensions.x}×${template.dimensions.y}×${template.dimensions.z}`} />
                <Row label="Category" value={template.category} />
                <Row label="Export Status" value={template.exportStatus.replace(/_/g, ' ')} />
                <Row label="Block Types" value={String(template.materialList.length)} />
                <Row label="Total Blocks" value={String(template.blocks.filter(b => b.blockId !== 'minecraft:air').length)} />
                <Row label="Anchors" value={String(template.anchors.length)} />
                <Row label="Ports" value={String(template.connectionPorts.length)} />
              </dl>
            </div>

            {validation && (
              <div className="p-4 rounded-lg" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
                <h2 className="text-sm font-semibold text-white mb-3">Validation Report</h2>
                <div className={`text-sm font-bold mb-2 ${validation.valid ? 'text-green-400' : 'text-red-400'}`}>
                  {validation.valid ? '✓ Valid' : '✗ Invalid'}
                </div>
                <dl className="space-y-1 text-sm">
                  <Row label="Block Count" value={String(validation.blockCount)} />
                  <Row label="Tile Entities" value={String(validation.tileEntityCount)} />
                </dl>

                {validation.errors.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-red-400 mb-1">Errors:</div>
                    {validation.errors.map((e, i) => <div key={i} className="text-xs text-red-300">{e}</div>)}
                  </div>
                )}

                {validation.warnings.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-yellow-400 mb-1">Warnings:</div>
                    {validation.warnings.map((w, i) => <div key={i} className="text-xs text-yellow-300">{w}</div>)}
                  </div>
                )}

                {validation.unsupportedBlocks.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-orange-400 mb-1">Unsupported Blocks:</div>
                    {validation.unsupportedBlocks.map((b, i) => <div key={i} className="text-xs text-orange-300 font-mono">{b}</div>)}
                  </div>
                )}
              </div>
            )}

            {/* Round trip test */}
            <div className="p-4 rounded-lg" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
              <h2 className="text-sm font-semibold text-white mb-2">Round-Trip Test</h2>
              <p className="text-xs text-gray-400 mb-3">
                Exports, then re-imports the template and verifies block counts are consistent.
                This does NOT guarantee in-game compatibility — test in the Template Manager.
              </p>
              <button onClick={doRoundTrip} className="px-3 py-2 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded mb-2">
                Run Round-Trip Test
              </button>
              {roundTripResult && (
                <div className={`p-2 rounded text-xs ${roundTripResult.success ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                  {roundTripResult.success ? '✓ Round-trip passed' : '✗ Round-trip failed'}
                  {roundTripResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                  {roundTripResult.warnings.map((w, i) => <div key={i} className="text-yellow-300">{w}</div>)}
                </div>
              )}
            </div>

            {/* Material list */}
            <div className="p-4 rounded-lg" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
              <h2 className="text-sm font-semibold text-white mb-2">Material List</h2>
              <div className="space-y-1 max-h-48 overflow-auto">
                {template.materialList.map(m => (
                  <div key={m.blockId} className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 font-mono">{m.blockId}</span>
                    <span className="text-gray-500">{m.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: export controls + output */}
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
              <h2 className="text-sm font-semibold text-white mb-3">Export Format</h2>

              <div className="space-y-2 mb-3">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input type="radio" name="format" value="bg1_legacy"
                    checked={exportFormat === 'bg1_legacy'}
                    onChange={() => setExportFormat('bg1_legacy')} />
                  <div>
                    <div className="font-medium">Building Gadgets 1 (Legacy)</div>
                    <div className="text-xs text-gray-500">JSON with base64-gzipped NBT body. Validated format.</div>
                  </div>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input type="radio" name="format" value="internal_json"
                    checked={exportFormat === 'internal_json'}
                    onChange={() => setExportFormat('internal_json')} />
                  <div>
                    <div className="font-medium">Internal JSON</div>
                    <div className="text-xs text-gray-500">Raw internal schema. For backup/transfer only, not loadable by BG.</div>
                  </div>
                </label>
              </div>

              <div className="p-2 bg-yellow-900 border border-yellow-700 rounded text-xs text-yellow-200 mb-3">
                ⚠️ BG2 export is not yet available — the in-game format has not been validated.
                Use BG1 Legacy and test in the Template Manager block.
              </div>

              <button onClick={doExport} disabled={exporting}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded">
                {exporting ? 'Exporting...' : `Export as ${exportFormat === 'bg1_legacy' ? 'Building Gadgets 1 JSON' : 'Internal JSON'}`}
              </button>

              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-xs text-gray-400 mb-2">
                  Create mod / vanilla structure block format. Gzipped NBT, downloads as <code className="text-gray-300">.nbt</code>.
                </div>
                <button onClick={downloadCreateNbt} disabled={creatingNbt}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm rounded">
                  {creatingNbt ? 'Building NBT...' : 'Download Create Schematic (.nbt)'}
                </button>
              </div>
            </div>

            {exportData && (
              <div className="p-4 rounded-lg" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-white">Exported Template</h2>
                  <div className="flex gap-2">
                    <button onClick={copyToClipboard}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded">
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button onClick={downloadFile}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded">
                      Download
                    </button>
                  </div>
                </div>
                <pre className="text-xs text-gray-300 overflow-auto max-h-64 bg-gray-900 p-2 rounded font-mono">
                  {exportData.length > 2000 ? exportData.slice(0, 2000) + '\n...(truncated)' : exportData}
                </pre>

                <div className="mt-3 p-2 bg-blue-900 border border-blue-700 rounded text-xs text-blue-200">
                  <strong>In-game usage:</strong><br />
                  1. Craft a Template Manager block and place it<br />
                  2. Open the Template Manager UI<br />
                  3. Paste the copied template text using the Paste button<br />
                  4. Load it into the Copy/Paste Gadget<br />
                  5. Use the gadget to paste the structure<br />
                  <br />
                  After successful in-game paste, mark this template as validated.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  )
}
