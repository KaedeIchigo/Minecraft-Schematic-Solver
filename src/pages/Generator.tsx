import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../store/api.ts'
import { useAppStore } from '../store/appStore.ts'
import type { DesignBrief, ModuleType, Facing, RoofStyle, FloorPattern, Symmetry } from '@shared/types.js'

const MODULE_TYPES: ModuleType[] = [
  'starter_room', 'machine_room', 'hallway', 'elevator', 'ae2_room',
  'mekanism_room', 'mystical_ag_room', 'power_room', 'platform', 'bridge', 'tower', 'custom'
]
const FACINGS: Facing[] = ['north', 'south', 'east', 'west']
const ROOF_STYLES: RoofStyle[] = ['flat', 'slanted', 'dome', 'none']
const FLOOR_PATTERNS: FloorPattern[] = ['plain', 'checkerboard', 'diagonal', 'bordered', 'mixed']
const SYMMETRIES: Symmetry[] = ['none', 'x', 'z', 'both', 'radial']
const STYLE_PRESETS: Record<string, string[]> = {
  'Tech base': ['tech', 'industrial', 'dark'],
  'AE2 room': ['tech', 'clean', 'white-lab'],
  'Mekanism factory': ['factory', 'industrial', 'gray'],
  'Mystical AG': ['nature', 'organic', 'farming'],
  'Magic room': ['magic', 'mystical', 'purple'],
  'Neutral hallway': ['neutral', 'compact'],
  'Glass observation': ['glass-heavy', 'bright', 'open'],
  'Dark industrial': ['dark', 'industrial', 'dark-industrial'],
}

const DEFAULT_BRIEF: DesignBrief = {
  intendedModuleType: 'machine_room',
  dimensions: { x: 17, y: 9, z: 17 },
  styleKeywords: ['tech', 'industrial'],
  blockPalette: [],
  requiredFunctionalSpaces: [],
  forbiddenBlocks: [],
  symmetry: 'both',
  entranceDirections: ['north'],
  interiorClearance: 4,
  decorativeDensity: 0.3,
  lightingStyle: 'standard',
  roofStyle: 'flat',
  floorPattern: 'plain',
  wallPattern: 'plain',
  connectionPorts: [],
  notes: '',
}

export default function Generator() {
  const navigate = useNavigate()
  const { activeProject, addTemplate } = useAppStore()
  const [prompt, setPrompt] = useState('')
  const [brief, setBrief] = useState<DesignBrief>({ ...DEFAULT_BRIEF })
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState<string | null>(null)

  function updateBrief<K extends keyof DesignBrief>(key: K, value: DesignBrief[K]) {
    setBrief(b => ({ ...b, [key]: value }))
  }

  function applyStylePreset(preset: string) {
    const keywords = STYLE_PRESETS[preset] ?? []
    updateBrief('styleKeywords', keywords)
  }

  function applyQuickPreset(type: ModuleType) {
    const presets: Partial<Record<ModuleType, Partial<DesignBrief>>> = {
      starter_room: { dimensions: { x: 9, y: 6, z: 9 }, intendedModuleType: 'starter_room', symmetry: 'both', entranceDirections: ['north'] },
      machine_room: { dimensions: { x: 17, y: 9, z: 17 }, intendedModuleType: 'machine_room', symmetry: 'both', entranceDirections: ['north', 'south'] },
      hallway: { dimensions: { x: 5, y: 5, z: 17 }, intendedModuleType: 'hallway', symmetry: 'z', entranceDirections: ['north', 'south'] },
      elevator: { dimensions: { x: 5, y: 20, z: 5 }, intendedModuleType: 'elevator', symmetry: 'both', entranceDirections: ['north'] },
      ae2_room: { dimensions: { x: 13, y: 7, z: 13 }, intendedModuleType: 'ae2_room', symmetry: 'both', styleKeywords: ['tech', 'clean', 'ae2'], entranceDirections: ['north'] },
    }
    const preset = presets[type]
    if (preset) setBrief(b => ({ ...b, ...preset }))
  }

  async function generate() {
    if (!activeProject) { setError('Select or create a project first'); return }
    setGenerating(true)
    setError('')
    try {
      const t = await api.templates.generate({ projectId: activeProject.id, designBrief: brief, prompt })
      addTemplate(t)
      setGenerated(t.id)
    } catch (e) {
      setError(String(e))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Module Generator</h1>
        {!activeProject && (
          <div className="text-yellow-400 text-sm">No active project — go to Dashboard first</div>
        )}
      </div>

      {error && <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded text-sm">{error}</div>}
      {generated && (
        <div className="bg-green-900 border border-green-700 text-green-200 p-3 rounded text-sm flex items-center justify-between">
          Module generated!
          <div className="flex gap-2">
            <button onClick={() => navigate(`/renderer/${generated}`)} className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-sm">View in Renderer</button>
            <button onClick={() => navigate(`/export/${generated}`)} className="px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded text-sm">Export</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Left: Text prompt + quick presets */}
        <div className="space-y-4">
          <div className="p-4 rounded-lg" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
            <h2 className="text-sm font-semibold text-gray-300 mb-2">Text Prompt (optional)</h2>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. 17x17 AE2 room connecting to north hallway, same palette as my Mekanism room, compact layout"
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="p-4 rounded-lg" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
            <h2 className="text-sm font-semibold text-gray-300 mb-2">Quick Presets</h2>
            <div className="flex flex-wrap gap-2">
              {(['starter_room', 'machine_room', 'hallway', 'elevator', 'ae2_room'] as ModuleType[]).map(t => (
                <button key={t} onClick={() => applyQuickPreset(t)}
                  className="text-xs px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded">
                  {t.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
            <h2 className="text-sm font-semibold text-gray-300 mb-2">Style Presets</h2>
            <div className="flex flex-wrap gap-2">
              {Object.keys(STYLE_PRESETS).map(name => (
                <button key={name} onClick={() => applyStylePreset(name)}
                  className="text-xs px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded">
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Design brief */}
        <div className="p-4 rounded-lg space-y-3 overflow-auto" style={{ background: '#0d1117', border: '1px solid #21262d', maxHeight: '70vh' }}>
          <h2 className="text-sm font-semibold text-gray-300">Design Brief</h2>

          <Field label="Module Type">
            <select value={brief.intendedModuleType} onChange={e => updateBrief('intendedModuleType', e.target.value as ModuleType)}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-2 py-1.5 rounded">
              {MODULE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-3 gap-2">
            {(['x', 'y', 'z'] as const).map(axis => (
              <Field key={axis} label={`${axis.toUpperCase()} (${axis === 'y' ? 'height' : axis === 'x' ? 'width' : 'depth'})`}>
                <input type="number" min={3} max={128}
                  value={brief.dimensions[axis]}
                  onChange={e => updateBrief('dimensions', { ...brief.dimensions, [axis]: parseInt(e.target.value) || 1 })}
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-2 py-1.5 rounded" />
              </Field>
            ))}
          </div>

          <Field label="Style Keywords (comma separated)">
            <input
              value={brief.styleKeywords.join(', ')}
              onChange={e => updateBrief('styleKeywords', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-2 py-1.5 rounded" />
          </Field>

          <Field label="Entrance Directions">
            <div className="flex gap-2 flex-wrap">
              {FACINGS.map(f => (
                <label key={f} className="flex items-center gap-1 text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox"
                    checked={brief.entranceDirections.includes(f)}
                    onChange={e => updateBrief('entranceDirections',
                      e.target.checked ? [...brief.entranceDirections, f] : brief.entranceDirections.filter(x => x !== f)
                    )} />
                  {f}
                </label>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Symmetry">
              <select value={brief.symmetry} onChange={e => updateBrief('symmetry', e.target.value as Symmetry)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-2 py-1.5 rounded">
                {SYMMETRIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Interior Clearance (blocks)">
              <input type="number" min={2} max={20} value={brief.interiorClearance}
                onChange={e => updateBrief('interiorClearance', parseInt(e.target.value) || 4)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-2 py-1.5 rounded" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Roof Style">
              <select value={brief.roofStyle} onChange={e => updateBrief('roofStyle', e.target.value as RoofStyle)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-2 py-1.5 rounded">
                {ROOF_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Floor Pattern">
              <select value={brief.floorPattern} onChange={e => updateBrief('floorPattern', e.target.value as FloorPattern)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-2 py-1.5 rounded">
                {FLOOR_PATTERNS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Decorative Density (0–1)">
            <input type="range" min={0} max={1} step={0.1} value={brief.decorativeDensity}
              onChange={e => updateBrief('decorativeDensity', parseFloat(e.target.value))}
              className="w-full" />
            <span className="text-xs text-gray-400">{brief.decorativeDensity}</span>
          </Field>

          <Field label="Lighting Style">
            <select value={brief.lightingStyle} onChange={e => updateBrief('lightingStyle', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-2 py-1.5 rounded">
              <option value="standard">Standard</option>
              <option value="bright">Bright</option>
              <option value="dim">Dim</option>
              <option value="atmospheric">Atmospheric</option>
            </select>
          </Field>

          <Field label="Notes">
            <textarea
              value={brief.notes}
              onChange={e => updateBrief('notes', e.target.value)}
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-2 py-1.5 rounded resize-none" />
          </Field>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={generate}
          disabled={generating || !activeProject}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded text-sm"
        >
          {generating ? 'Generating...' : 'Generate Module'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}
