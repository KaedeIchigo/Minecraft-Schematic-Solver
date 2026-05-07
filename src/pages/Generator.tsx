import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../store/api.ts'
import { useAppStore } from '../store/appStore.ts'
import type { Blueprint, BlueprintMaterialPalette } from '@shared/types.js'
import { resolveBlock, getEntriesByCategory, findEntryById } from '@shared/blockRegistry.js'

const API_KEY_STORAGE = 'openrouter_api_key'
const MODEL_STORAGE   = 'openrouter_model'
const MAX_IMAGES = 4

const PALETTE_SLOTS: Array<{ key: keyof BlueprintMaterialPalette; label: string }> = [
  { key: 'primary_wall',   label: 'Primary Wall' },
  { key: 'secondary_wall', label: 'Secondary Wall' },
  { key: 'floor',          label: 'Floor' },
  { key: 'ceiling',        label: 'Ceiling' },
  { key: 'accent',         label: 'Accent' },
  { key: 'frame_material', label: 'Frame Material' },
]

const PRESETS: Array<{ label: string; palette: Partial<BlueprintMaterialPalette> }> = [
  {
    label: 'Futuristic / Sci-Fi',
    palette: {
      primary_wall:   'luminax_black_bright',
      secondary_wall: 'ae2_sky_stone_brick',
      floor:          'mek_ultimate_casing',
      ceiling:        'luminax_black_dim',
      accent:         'luminax_cyan_bright',
      frame_material: 'create_industrial_iron',
    },
  },
  {
    label: 'Dark Industrial',
    palette: {
      primary_wall:   'chipped_smooth_basalt_bricks',
      secondary_wall: 'ie_sheetmetal_steel',
      floor:          'deepslate_tile',
      ceiling:        'luminax_black_dim',
      accent:         'luminax_orange_dim',
      frame_material: 'create_andesite_casing',
    },
  },
  {
    label: 'Arcane / Mystical',
    palette: {
      primary_wall:   'occultism_otherstone_brick',
      secondary_wall: 'botania_shimmerrock',
      floor:          'botania_livingrock_brick',
      ceiling:        'luminax_purple_dim',
      accent:         'botania_mana_glass',
      frame_material: 'ae2_fluix_block',
    },
  },
]

function BlockTemplatesPanel({
  palette, overrides, search, onSearchChange, onChange, onReset,
}: {
  palette: BlueprintMaterialPalette
  overrides: Partial<BlueprintMaterialPalette>
  search: string
  onSearchChange: (s: string) => void
  onChange: (overrides: Partial<BlueprintMaterialPalette>) => void
  onReset: () => void
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const categoryMap = useMemo(() => getEntriesByCategory(), [])
  const categories  = useMemo(() => Array.from(categoryMap.keys()), [categoryMap])

  const filteredEntries = useMemo(() => {
    const base = selectedCategory
      ? (categoryMap.get(selectedCategory) ?? [])
      : Array.from(categoryMap.values()).flat()
    if (!search.trim()) return base
    const q = search.toLowerCase()
    return base.filter(e =>
      e.displayName.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.blockId.toLowerCase().includes(q)
    )
  }, [categoryMap, selectedCategory, search])

  function setSlot(key: keyof BlueprintMaterialPalette, value: string) {
    onChange({ ...overrides, [key]: value })
  }

  function applyPreset(preset: Partial<BlueprintMaterialPalette>) {
    onChange({ ...overrides, ...preset })
  }

  return (
    <div className="space-y-3">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => applyPreset(p.palette)}
            className="text-xs px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-indigo-100 rounded border border-indigo-600 whitespace-nowrap"
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={onReset}
          className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded whitespace-nowrap ml-auto"
        >
          Reset to AI picks
        </button>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Search blocks…"
        className="w-full bg-gray-800 border border-gray-700 text-white text-xs px-2 py-1.5 rounded font-mono outline-none focus:border-blue-500"
      />

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`text-xs px-2 py-0.5 rounded border ${selectedCategory === null ? 'bg-blue-700 border-blue-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white'}`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
            className={`text-xs px-2 py-0.5 rounded border ${selectedCategory === cat ? 'bg-blue-700 border-blue-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white'}`}
          >
            {cat.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Slot rows */}
      <div className="space-y-2">
        {PALETTE_SLOTS.map(({ key, label }) => {
          const current      = overrides[key] ?? palette[key]
          const currentEntry = findEntryById(current)
          const isOverridden = !!overrides[key]
          const isLight      = currentEntry?.isLightSource ?? false
          return (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 w-36 shrink-0">{label}</span>
              {currentEntry ? (
                <span
                  className="w-4 h-4 rounded shrink-0 border border-gray-600"
                  style={{ background: currentEntry.rendererColor }}
                  title={currentEntry.blockId}
                />
              ) : (
                <span className="w-4 h-4 shrink-0" />
              )}
              {isLight && <span className="text-yellow-300 shrink-0" title="Light source">✦</span>}
              <select
                value={current}
                onChange={e => setSlot(key, e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 text-gray-200 text-xs px-2 py-1 rounded font-mono outline-none focus:border-blue-500"
              >
                {search.trim() || selectedCategory ? (
                  <optgroup label={selectedCategory ? selectedCategory.replace(/_/g, ' ') : 'Search results'}>
                    {filteredEntries.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.displayName}{e.isLightSource ? ' ✦' : ''} ({e.id})
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  Array.from(categoryMap.entries()).map(([cat, entries]) => (
                    <optgroup key={cat} label={cat.replace(/_/g, ' ')}>
                      {entries.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.displayName}{e.isLightSource ? ' ✦' : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))
                )}
              </select>
              {isOverridden && (
                <button
                  onClick={() => {
                    const next = { ...overrides }
                    delete next[key]
                    onChange(next)
                  }}
                  className="text-yellow-400 hover:text-yellow-200 text-xs px-1"
                  title="Revert to AI pick"
                >↩</button>
              )}
            </div>
          )
        })}
      </div>

      <div className="text-xs text-gray-500 pt-1">
        Overriding {Object.keys(overrides).length} of {PALETTE_SLOTS.length} slots.
        Changes apply when you click Build.
      </div>
    </div>
  )
}

export default function Generator() {
  const navigate = useNavigate()
  const { activeProject, addTemplate } = useAppStore()

  const [prompt, setPrompt] = useState('')
  const [imageList, setImageList] = useState<string[]>([])
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null)
  const [blueprintExpanded, setBlueprintExpanded] = useState(true)
  const [blueprintTab, setBlueprintTab] = useState<'blueprint' | 'palette'>('blueprint')
  const [paletteOverrides, setPaletteOverrides] = useState<Partial<BlueprintMaterialPalette>>({})
  const [materialSearch, setMaterialSearch] = useState('')
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
    if (imageList.length >= MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} reference images allowed`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImageList(prev => prev.length < MAX_IMAGES ? [...prev, String(reader.result)] : prev)
    }
    reader.readAsDataURL(file)
  }

  function removeImage(index: number) {
    setImageList(prev => prev.filter((_, i) => i !== index))
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files ?? [])
    for (const file of files) {
      handleImageFile(file)
    }
  }

  async function design() {
    if (!prompt.trim()) { setError('Please describe your structure first'); return }
    setDesigning(true); setError(''); setBlueprint(null); setGenerated(null)
    try {
      const { blueprint } = await api.templates.design({
        prompt,
        imageBase64: imageList.length > 0 ? imageList : undefined,
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

  function effectivePalette(): BlueprintMaterialPalette | undefined {
    if (!blueprint) return undefined
    return { ...blueprint.material_palette, ...paletteOverrides }
  }

  async function build() {
    if (!activeProject) { setError('Select or create a project first'); return }
    if (!blueprint) return
    setBuilding(true); setError('')
    try {
      const tpl = await api.templates.build({
        projectId: activeProject.id,
        blueprint: { ...blueprint, material_palette: effectivePalette()! },
        prompt,
        sourceImage: imageList[0] ?? undefined,
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

        <div className="p-4 rounded-lg space-y-2" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
          <h2 className="text-sm font-semibold text-gray-300">
            Reference images
            <span className="ml-2 text-gray-500 font-normal text-xs">({imageList.length}/{MAX_IMAGES})</span>
          </h2>

          {/* Thumbnail grid */}
          {imageList.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {imageList.map((src, i) => (
                <div key={i} className="relative group rounded overflow-hidden" style={{ aspectRatio: '1' }}>
                  <img src={src} alt={`Reference ${i + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none"
                    title="Remove"
                  >
                    ×
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-white bg-black bg-opacity-50 py-0.5">
                    Ref {i + 1}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Drop zone — only shown when under the limit */}
          {imageList.length < MAX_IMAGES && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-lg cursor-pointer transition-colors ${
                imageList.length === 0 ? 'h-40' : 'h-20'
              } ${dragOver ? 'bg-blue-900 border-blue-500' : 'bg-gray-800 border-gray-700'}`}
              style={{ border: '2px dashed' }}
            >
              <div className="text-center text-gray-400 text-sm">
                <div className="text-xl mb-1">📷</div>
                <span className="text-xs">Drop images here, or click to upload</span>
                {imageList.length === 0 && (
                  <div className="text-xs text-gray-500 mt-1">Up to {MAX_IMAGES} images · sent as labeled vision blocks</div>
                )}
              </div>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => {
              Array.from(e.target.files ?? []).forEach(f => handleImageFile(f))
              e.target.value = ''
            }} />
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
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-white">Blueprint — {blueprint.theme || '(untitled)'}</h2>
              <div className="flex rounded overflow-hidden border border-gray-700 text-xs">
                <button
                  onClick={() => setBlueprintTab('blueprint')}
                  className={`px-3 py-1 ${blueprintTab === 'blueprint' ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >Blueprint</button>
                <button
                  onClick={() => setBlueprintTab('palette')}
                  className={`px-3 py-1 ${blueprintTab === 'palette' ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >Block Templates</button>
              </div>
            </div>
            <button onClick={() => setBlueprintExpanded(e => !e)}
              className="text-xs text-gray-400 hover:text-white">
              {blueprintExpanded ? '▼ Collapse' : '▶ Expand'}
            </button>
          </div>

          {blueprintExpanded && blueprintTab === 'blueprint' && (
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
                  {Object.entries(effectivePalette()!).map(([k, v]) => (
                    <div key={k}><span className="text-gray-500">{k}:</span> {v}{paletteOverrides[k as keyof BlueprintMaterialPalette] ? <span className="text-yellow-400 ml-1">*</span> : null}</div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-1">Palette preview (resolved)</div>
                <div className="space-y-1">
                  {Object.entries(effectivePalette()!).map(([key, abstract]) => {
                    const resolved = resolveBlock(abstract)
                    const camo = resolved.nbtData?.['CamoState'] as { Name?: string } | undefined
                    const entry = findEntryById(abstract)
                    return (
                      <div key={key} className="flex items-center justify-between text-xs bg-gray-800 px-2 py-1 rounded font-mono">
                        <span className="text-gray-400 w-32 shrink-0">{key}</span>
                        {entry && <span className="w-3 h-3 rounded-sm shrink-0 mr-1" style={{ background: entry.rendererColor }} />}
                        <span className="text-gray-300 w-32 shrink-0">{abstract}</span>
                        <span className="text-gray-500 mx-1">→</span>
                        <span className="text-emerald-300 truncate flex-1">
                          {resolved.blockId}
                          {camo?.Name && (
                            <span className="text-purple-300 ml-1">camo:{camo.Name}</span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-between text-xs bg-gray-800 px-2 py-1 rounded font-mono">
                    <span className="text-gray-400 w-32 shrink-0">framed_pillar</span>
                    <span className="text-gray-300 w-32 shrink-0">framed_{effectivePalette()!.frame_material}</span>
                    <span className="text-gray-500 mx-1">→</span>
                    <span className="text-emerald-300 truncate flex-1">
                      {(() => {
                        const r = resolveBlock(`framed_${effectivePalette()!.frame_material}`)
                        const c = r.nbtData?.['CamoState'] as { Name?: string } | undefined
                        return <>{r.blockId}{c?.Name && <span className="text-purple-300 ml-1">camo:{c.Name}</span>}</>
                      })()}
                    </span>
                  </div>
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

          {blueprintExpanded && blueprintTab === 'palette' && (
            <BlockTemplatesPanel
              palette={effectivePalette()!}
              overrides={paletteOverrides}
              search={materialSearch}
              onSearchChange={setMaterialSearch}
              onChange={setPaletteOverrides}
              onReset={() => setPaletteOverrides({})}
            />
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
