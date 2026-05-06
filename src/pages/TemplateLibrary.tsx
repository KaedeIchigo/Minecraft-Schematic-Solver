import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../store/api.ts'
import { useAppStore } from '../store/appStore.ts'
import type { TemplateModule } from '@shared/types.js'

const CATEGORIES = ['all', 'starter_room', 'machine_room', 'hallway', 'elevator', 'ae2_room', 'mekanism_room', 'mystical_ag_room', 'power_room', 'platform', 'bridge', 'tower', 'custom']

export default function TemplateLibrary() {
  const navigate = useNavigate()
  const { templates, setTemplates, activeProject, removeTemplate } = useAppStore()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const projectId = activeProject?.id
    api.templates.list(projectId)
      .then(ts => { setTemplates(ts); setLoading(false) })
      .catch(() => setLoading(false))
  }, [activeProject?.id])

  const filtered = templates.filter(t => {
    if (category !== 'all' && t.category !== category) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
        !t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return
    await api.templates.delete(id)
    removeTemplate(id)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">Template Library</h1>
        <button onClick={() => navigate('/generator')} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded">
          + Generate New
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or tag..."
          className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded outline-none focus:border-blue-500"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded outline-none"
        >
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c === 'all' ? 'All categories' : c.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-400 text-sm text-center py-12">
          {templates.length === 0 ? 'No templates yet. Use the Generator to create modules.' : 'No templates match your filter.'}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map(t => (
            <LibraryCard
              key={t.id}
              template={t}
              onView={() => navigate(`/renderer/${t.id}`)}
              onExport={() => navigate(`/export/${t.id}`)}
              onDelete={() => handleDelete(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LibraryCard({ template: t, onView, onExport, onDelete }: {
  template: TemplateModule
  onView: () => void
  onExport: () => void
  onDelete: () => void
}) {
  const { dimensions: d } = t
  const statusColors: Record<string, string> = {
    not_exported: 'bg-gray-600', validated_bg1: 'bg-green-700',
    validated_bg2: 'bg-green-700', validation_failed: 'bg-red-700',
    pending_validation: 'bg-yellow-700', unvalidated_placeholder: 'bg-orange-700',
  }

  return (
    <div className="p-4 rounded-lg" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-medium text-white text-sm">{t.name}</div>
          <div className="text-xs text-gray-400">{d.x}×{d.y}×{d.z} blocks</div>
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded text-white ${statusColors[t.exportStatus] ?? 'bg-gray-600'}`}>
          {t.exportStatus === 'validated_bg1' ? 'BG1 ✓' : t.exportStatus.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {t.tags.slice(0, 4).map(tag => (
          <span key={tag} className="text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">{tag}</span>
        ))}
      </div>

      <div className="text-xs text-gray-500 mb-3">
        {t.blocks.filter(b => b.blockId !== 'minecraft:air').length} blocks ·{' '}
        {t.materialList.length} types ·{' '}
        {t.anchors.length} anchors
      </div>

      <div className="flex gap-2">
        <button onClick={onView} className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded">
          View
        </button>
        <button onClick={onExport} className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded">
          Export
        </button>
        <button onClick={onDelete} className="py-1.5 px-2 bg-red-800 hover:bg-red-700 text-white text-xs rounded">
          🗑
        </button>
      </div>
    </div>
  )
}
