import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../store/api.ts'
import { useAppStore } from '../store/appStore.ts'
import type { TemplateModule, BlockEntry } from '@shared/types.js'
import VoxelRenderer from '../components/renderer/VoxelRenderer.tsx'

export default function RendererPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { templates, setSelectedTemplate } = useAppStore()
  const [template, setTemplate] = useState<TemplateModule | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Renderer settings
  const [showGrid, setShowGrid] = useState(true)
  const [showBounds, setShowBounds] = useState(true)
  const [showAnchors, setShowAnchors] = useState(true)
  const [showAir, setShowAir] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [orthographic, setOrthographic] = useState(false)
  const [layerY, setLayerY] = useState<number | null>(null)
  const [selectedBlock, setSelectedBlock] = useState<BlockEntry | null>(null)

  const [showMaterials, setShowMaterials] = useState(false)

  useEffect(() => {
    if (id) {
      setLoading(true)
      api.templates.get(id)
        .then(t => { setTemplate(t); setSelectedTemplate(t.id) })
        .catch(e => setError(String(e)))
        .finally(() => setLoading(false))
    }
  }, [id])

  const blockCount = template ? template.blocks.filter(b => b.blockId !== 'minecraft:air').length : 0

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-64 flex-shrink-0 flex flex-col overflow-auto" style={{ background: '#0d1117', borderRight: '1px solid #21262d' }}>
        <div className="p-3 border-b" style={{ borderColor: '#21262d' }}>
          <div className="text-sm font-semibold text-white mb-1">
            {template ? template.name : id ? 'Loading...' : 'No template selected'}
          </div>
          {template && (
            <div className="text-xs text-gray-400">
              {template.dimensions.x}×{template.dimensions.y}×{template.dimensions.z} · {blockCount} blocks
            </div>
          )}
        </div>

        {/* Template selector */}
        {!id && (
          <div className="p-3">
            <div className="text-xs text-gray-400 mb-2">Select a template</div>
            {templates.map(t => (
              <button key={t.id} onClick={() => navigate(`/renderer/${t.id}`)}
                className="w-full text-left text-xs px-2 py-1.5 mb-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">
                {t.name}
              </button>
            ))}
          </div>
        )}

        {/* View controls */}
        <div className="p-3 border-b space-y-2" style={{ borderColor: '#21262d' }}>
          <div className="text-xs font-semibold text-gray-400 uppercase">View</div>
          <Toggle label="Grid" value={showGrid} onChange={setShowGrid} />
          <Toggle label="Bounding Box" value={showBounds} onChange={setShowBounds} />
          <Toggle label="Anchors & Ports" value={showAnchors} onChange={setShowAnchors} />
          <Toggle label="Show Air" value={showAir} onChange={setShowAir} />
          <Toggle label="Orthographic" value={orthographic} onChange={setOrthographic} />
          <Toggle label="Stats" value={showStats} onChange={setShowStats} />
        </div>

        {/* Layer slice */}
        {template && (
          <div className="p-3 border-b" style={{ borderColor: '#21262d' }}>
            <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Layer (Y)</div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={template.dimensions.y - 1}
                value={layerY ?? 0}
                onChange={e => setLayerY(parseInt(e.target.value))}
                className="flex-1"
                disabled={layerY === null}
              />
              <span className="text-xs text-gray-300 w-6">{layerY ?? '–'}</span>
            </div>
            <div className="flex gap-2 mt-1">
              <button onClick={() => setLayerY(null)}
                className={`flex-1 text-xs py-1 rounded ${layerY === null ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                All
              </button>
              <button onClick={() => setLayerY(0)}
                className={`flex-1 text-xs py-1 rounded ${layerY !== null ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                Slice
              </button>
            </div>
          </div>
        )}

        {/* Selected block info */}
        {selectedBlock && (
          <div className="p-3 border-b" style={{ borderColor: '#21262d' }}>
            <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Selected Block</div>
            <div className="text-xs text-white font-mono">{selectedBlock.blockId}</div>
            <div className="text-xs text-gray-400">({selectedBlock.x}, {selectedBlock.y}, {selectedBlock.z})</div>
            {Object.entries(selectedBlock.blockState).length > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                {Object.entries(selectedBlock.blockState).map(([k, v]) => `${k}=${v}`).join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Material list toggle */}
        {template && (
          <div className="p-3">
            <button onClick={() => setShowMaterials(!showMaterials)}
              className="w-full text-xs py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded">
              {showMaterials ? 'Hide' : 'Show'} Materials ({template.materialList.length} types)
            </button>
            {showMaterials && (
              <div className="mt-2 space-y-1 max-h-64 overflow-auto">
                {template.materialList.map(m => (
                  <div key={m.blockId} className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 truncate">{m.displayName}</span>
                    <span className="text-gray-500 flex-shrink-0 ml-2">{m.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {template && (
          <div className="p-3 mt-auto border-t" style={{ borderColor: '#21262d' }}>
            <button onClick={() => navigate(`/export/${template.id}`)}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded mb-2">
              Export
            </button>
          </div>
        )}
      </div>

      {/* Renderer */}
      <div className="flex-1" style={{ minHeight: 0 }}>
        {loading && (
          <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full text-red-400">{error}</div>
        )}
        {!loading && !error && template && (
          <VoxelRenderer
            blocks={template.blocks}
            anchors={template.anchors}
            ports={template.connectionPorts}
            dimensions={template.dimensions}
            showGrid={showGrid}
            showBounds={showBounds}
            showAnchors={showAnchors}
            showAir={showAir}
            showStats={showStats}
            layerY={layerY}
            orthographic={orthographic}
            onBlockClick={setSelectedBlock}
          />
        )}
        {!loading && !error && !template && !id && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
            <div className="text-lg">Select a template from the left panel</div>
            <button onClick={() => navigate('/library')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
              Go to Library
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-xs text-gray-300 cursor-pointer">
      <span>{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-8 h-4 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-gray-600'}`}
      >
        <span className={`block w-3 h-3 bg-white rounded-full transition-transform mx-0.5 ${value ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </label>
  )
}
