import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../store/api.ts'
import { useAppStore } from '../store/appStore.ts'
import type { TemplateModule } from '@shared/types.js'

export default function Dashboard() {
  const navigate = useNavigate()
  const { activeProject, setActiveProject, setProjects, setTemplates, projects, templates } = useAppStore()
  const [newProjectName, setNewProjectName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.projects.list()
      .then(ps => {
        setProjects(ps)
        if (ps.length > 0 && !activeProject) setActiveProject(ps[0])
      })
      .catch(e => setError(String(e)))

    api.templates.list()
      .then(ts => setTemplates(ts))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (activeProject) {
      api.templates.list(activeProject.id).then(ts => setTemplates(ts)).catch(() => {})
    }
  }, [activeProject?.id])

  async function createProject() {
    if (!newProjectName.trim()) return
    setCreating(true)
    try {
      const p = await api.projects.create({ name: newProjectName.trim() })
      setProjects([p, ...projects])
      setActiveProject(p)
      setNewProjectName('')
    } catch (e) {
      setError(String(e))
    } finally {
      setCreating(false)
    }
  }

  const recentTemplates = templates.slice(0, 6)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="text-sm text-gray-400">ATM10 To The Sky — BG Modular Base Planner</div>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded text-sm">
          {error} — Make sure the server is running: <code>npm run dev:server</code>
        </div>
      )}

      {/* Active project */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 p-4 rounded-lg" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
          <h2 className="text-lg font-semibold text-white mb-3">Active Project</h2>
          {activeProject ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏗️</span>
                <div>
                  <div className="font-medium text-white">{activeProject.name}</div>
                  <div className="text-xs text-gray-400">
                    MC {activeProject.minecraftVersion} · {activeProject.modpackName} ·{' '}
                    {activeProject.buildingGadgetsVersion.toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <Stat label="Templates" value={templates.length} />
                <Stat label="Placements" value={activeProject.activeBaseGraph.placements.length} />
                <Stat label="Collisions" value={activeProject.activeBaseGraph.collisions.length} />
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => navigate('/generator')} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded">
                  Generate Module
                </button>
                <button onClick={() => navigate('/library')} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded">
                  View Library
                </button>
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-sm">No project selected. Create one below.</div>
          )}
        </div>

        <div className="p-4 rounded-lg" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
          <h2 className="text-lg font-semibold text-white mb-3">Projects</h2>
          <div className="space-y-2 mb-3 max-h-40 overflow-auto">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setActiveProject(p)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  activeProject?.id === p.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {p.name}
              </button>
            ))}
            {projects.length === 0 && <div className="text-gray-500 text-xs">No projects yet</div>}
          </div>
          <div className="flex gap-2">
            <input
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createProject()}
              placeholder="New project name"
              className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm px-2 py-1.5 rounded outline-none focus:border-blue-500"
            />
            <button
              onClick={createProject}
              disabled={creating || !newProjectName.trim()}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Recent templates */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Recent Templates</h2>
        {recentTemplates.length === 0 ? (
          <div className="text-gray-400 text-sm p-4 rounded-lg border border-dashed" style={{ borderColor: '#21262d' }}>
            No templates yet. Use the <strong>Generator</strong> to create your first module.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {recentTemplates.map(t => (
              <TemplateCard key={t.id} template={t} onOpen={() => navigate(`/renderer/${t.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* Quick start guide */}
      <div className="p-4 rounded-lg" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
        <h2 className="text-lg font-semibold text-white mb-3">Quick Start</h2>
        <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
          <li>Create a project above with your modpack name</li>
          <li>Go to <strong>Generator</strong> → fill in a design brief → click Generate</li>
          <li>Open in <strong>Renderer</strong> to preview and edit the voxel structure</li>
          <li>Go to <strong>Export</strong> → export BG1 Legacy format → copy text to Template Manager</li>
          <li>Test in-game. Once validated, mark as <em>validated_bg1</em></li>
        </ol>
        <div className="mt-3 p-2 bg-yellow-900 border border-yellow-700 rounded text-xs text-yellow-200">
          ⚠️ BG2 export format has not yet been validated in-game. Use BG1 Legacy format and test with the Template Manager.
          Once you have a real BG2 template file, import it to validate the adapter.
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-800 rounded p-2 text-center">
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}

function TemplateCard({ template, onOpen }: { template: TemplateModule; onOpen: () => void }) {
  const { dimensions: d } = template
  const statusColors: Record<string, string> = {
    not_exported: 'text-gray-400', validated_bg1: 'text-green-400',
    validated_bg2: 'text-green-400', validation_failed: 'text-red-400',
    pending_validation: 'text-yellow-400', unvalidated_placeholder: 'text-orange-400',
  }
  return (
    <div
      onClick={onOpen}
      className="p-3 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
      style={{ background: '#0d1117', border: '1px solid #21262d' }}
    >
      <div className="font-medium text-white text-sm truncate">{template.name}</div>
      <div className="text-xs text-gray-400">{d.x}×{d.y}×{d.z} · {template.category}</div>
      <div className={`text-xs mt-1 ${statusColors[template.exportStatus] ?? 'text-gray-400'}`}>
        {template.exportStatus.replace(/_/g, ' ')}
      </div>
      <div className="text-xs text-gray-500 mt-1">{template.materialList.length} block types</div>
    </div>
  )
}
