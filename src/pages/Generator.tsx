import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../store/api.ts'
import { useAppStore } from '../store/appStore.ts'
import type { Blueprint } from '@shared/types.js'

const API_KEY_STORAGE = 'openrouter_api_key'
const MODEL_STORAGE   = 'openrouter_model'

export default function Generator() {
  const navigate = useNavigate()
  const { activeProject, addTemplate } = useAppStore()

  const [prompt, setPrompt] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null)
  const [blueprintExpanded, setBlueprintExpanded] = useState(true)
  const [designing, setDesigning] = useState(false)
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) ?? '')
  const [model, setModel] = useState(() => localStorage.getItem(MODEL_STORAGE) ?? '')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function saveSettings() {
    if (apiKey) localStorage.setItem(API_KEY_STORAGE, apiKey)
    else localStorage.removeItem(API_KEY_STORAGE)
    if (model) localStorage.setItem(MODEL_STORAGE, model)
    else localStorage.removeItem(MODEL_STORAGE)
    setShowSettings(false)
  }

  function handleImageFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Dropped file is not an image')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setImageDataUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleImageFile(file)
  }

  async function design() {
    if (!prompt.trim()) { setError('Please describe your structure first'); return }
    setDesigning(true); setError(''); setBlueprint(null); setGenerated(null)
    try {
      const { blueprint } = await api.templates.design({
        prompt,
        imageBase64: imageDataUrl ?? undefined,
        apiKey: apiKey || undefined,
        model: model || undefined,
      })
      setBlueprint(blueprint)
      setBlueprintExpanded(true)
    } catch (e) {
      setError(String((e as Error).message ?? e))
    } finally {
      setDesigning(false)
    }
  }

  async function build() {
    if (!activeProject) { setError('Select or create a project first'); return }
    if (!blueprint) return
    setBuilding(true); setError('')
    try {
      const tpl = await api.templates.build({
        projectId: activeProject.id,
        blueprint,
        prompt,
        sourceImage: imageDataUrl ?? undefined,
      })
      addTemplate(tpl)
      setGenerated(tpl.id)
    } catch (e) {
      setError(String((e as Error).message ?? e))
    } finally {
      setBuilding(false)
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Design Brain</h1>
        <div className="flex items-center gap-3">
          {!activeProject && <div className="text-yellow-400 text-sm">No active project — go to Dashboard first</div>}
          <button onClick={() => setShowSettings(s => !s)}
            className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded">
            ⚙ OpenRouter Settings
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="p-4 rounded-lg space-y-2" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
          <h2 className="text-sm font-semibold text-gray-300">OpenRouter Settings</h2>
          <p className="text-xs text-gray-500">
            Stored in browser localStorage. The server also reads <code>OPENROUTER_API_KEY</code> from <code>.env</code> if no key is provided here.
          </p>
          <div>
            <label className="block text-xs text-gray-400 mb-1">API Key</label>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-2 py-1.5 rounded font-mono" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Model (optional)</label>
            <input value={model} onChange={e => setModel(e.target.value)}
              placeholder="google/gemini-flash-1.5 (default)"
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-2 py-1.5 rounded font-mono" />
          </div>
          <button onClick={saveSettings} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded">
            Save
          </button>
        </div>
      )}

      {error && <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded text-sm whitespace-pre-wrap">{error}</div>}
      {generated && (
        <div className="bg-green-900 border border-green-700 text-green-200 p-3 rounded text-sm flex items-center justify-between">
          Module built!
          <div className="flex gap-2">
            <button onClick={() => navigate(`/renderer/${generated}`)} className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-sm">View in Renderer</button>
            <button onClick={() => navigate(`/export/${generated}`)} className="px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded text-sm">Export</button>
          </div>
        </div>
      )}

      {/* Stage 1: prompt + image drop */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
          <h2 className="text-sm font-semibold text-gray-300 mb-2">Describe your structure</h2>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. A 3-floor lunar industrial base with a central reactor hall, surrounding processing rooms, narrow utility corridors, and large reinforced windows. Polished blackstone and structure void aesthetic."
            rows={8}
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded outline-none focus:border-blue-500 resize-none"
          />
        </div>

        <div className="p-4 rounded-lg" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
          <h2 className="text-sm font-semibold text-gray-300 mb-2">Reference image (optional)</h2>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center h-48 rounded-lg cursor-pointer transition-colors ${
              dragOver ? 'bg-blue-900 border-blue-500' : 'bg-gray-800 border-gray-700'
            }`}
            style={{ border: '2px dashed' }}
          >
            {imageDataUrl ? (
              <img src={imageDataUrl} alt="reference" className="max-h-full max-w-full object-contain rounded" />
            ) : (
              <div className="text-center text-gray-400 text-sm">
                <div className="text-2xl mb-2">📷</div>
                Drop an image here, or click to upload<br />
                <span className="text-xs text-gray-500">Sent to the vision model alongside your prompt</span>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }} />
          {imageDataUrl && (
            <button onClick={() => setImageDataUrl(null)}
              className="mt-2 text-xs text-gray-400 hover:text-red-400">
              Remove image
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={design}
          disabled={designing || !prompt.trim()}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded text-sm"
        >
          {designing ? 'Thinking…' : '✨ Generate Blueprint'}
        </button>
      </div>

      {/* Stage 2: blueprint review + build */}
      {blueprint && (
        <div className="p-4 rounded-lg space-y-3" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Blueprint — {blueprint.theme || '(untitled)'}</h2>
            <button onClick={() => setBlueprintExpanded(e => !e)}
              className="text-xs text-gray-400 hover:text-white">
              {blueprintExpanded ? '▼ Collapse' : '▶ Expand'}
            </button>
          </div>

          {blueprintExpanded && (
            <>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-gray-400 mb-1">Style notes</div>
                  <div className="text-gray-200">{blueprint.style_notes}</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">Bounding box</div>
                  <div className="text-gray-200 font-mono">
                    {blueprint.bounding_box.x} × {blueprint.bounding_box.y} × {blueprint.bounding_box.z}
                    {blueprint.utility_gap && <span className="ml-3 text-cyan-400">utility_gap=true</span>}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-1">Material palette</div>
                <div className="grid grid-cols-3 gap-1 text-xs font-mono text-gray-200">
                  {Object.entries(blueprint.material_palette).map(([k, v]) => (
                    <div key={k}><span className="text-gray-500">{k}:</span> {v}</div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-1">Rooms ({blueprint.rooms.length})</div>
                <div className="space-y-1">
                  {blueprint.rooms.map(r => (
                    <div key={r.id} className="text-xs bg-gray-800 rounded px-2 py-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="text-cyan-300 font-mono">{r.id}</span>
                      <span className="text-gray-300">{r.label}</span>
                      <span className="text-gray-500">[{r.type}]</span>
                      <span className="text-gray-400 font-mono">size {r.size.x}×{r.size.y}×{r.size.z}</span>
                      <span className="text-gray-400 font-mono">@ ({r.position.x},{r.position.y},{r.position.z})</span>
                      {r.connects_to.length > 0 && <span className="text-yellow-300">→ {r.connects_to.join(', ')}</span>}
                      {r.features.length > 0 && <span className="text-purple-300">{r.features.join(' · ')}</span>}
                    </div>
                  ))}
                </div>
              </div>

              <details className="text-xs">
                <summary className="text-gray-500 cursor-pointer hover:text-gray-300">Raw JSON</summary>
                <pre className="text-gray-300 bg-gray-900 p-2 rounded font-mono mt-2 overflow-auto max-h-64">
                  {JSON.stringify(blueprint, null, 2)}
                </pre>
              </details>
            </>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={build}
              disabled={building || !activeProject}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded text-sm"
            >
              {building ? 'Building…' : '🏗 Build Module'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
