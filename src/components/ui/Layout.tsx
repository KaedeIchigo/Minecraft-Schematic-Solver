import { Outlet, NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../../store/api.ts'
import { APP_VERSION, CHANGELOG } from '../../version.ts'
import { REGISTRY_ENTRIES } from '@shared/blockRegistry.js'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/library',   label: 'Library',   icon: '📚' },
  { to: '/generator', label: 'Generator', icon: '⚡' },
  { to: '/renderer',  label: 'Renderer',  icon: '🎨' },
  { to: '/export',    label: 'Export',    icon: '📤' },
]

function ChangelogModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-start p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-96 max-h-[70vh] flex flex-col rounded-lg overflow-hidden"
        style={{ background: '#0d1117', border: '1px solid #30363d' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#21262d' }}>
          <span className="text-sm font-semibold text-white">Changelog</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        {/* Entries */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-5">
          {CHANGELOG.map((entry, idx) => (
            <div key={entry.version}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-bold text-white">v{entry.version}</span>
                {idx === 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-700 text-blue-100 font-semibold">NEW</span>
                )}
                <span className="text-xs text-gray-500 ml-auto">{entry.date}</span>
              </div>
              <ul className="space-y-1">
                {entry.changes.map((c, i) => (
                  <li key={i} className="text-xs text-gray-300 flex gap-2">
                    <span className="text-gray-600 shrink-0 mt-px">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Layout() {
  const [serverOk, setServerOk]         = useState<boolean | null>(null)
  const [showChangelog, setShowChangelog] = useState(false)

  useEffect(() => {
    api.health().then(() => setServerOk(true)).catch(() => setServerOk(false))
    console.log(`[MCStructureGen] v${APP_VERSION} loaded — ${REGISTRY_ENTRIES.length} blocks in registry`)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: '#0d1117', borderRight: '1px solid #21262d' }}>
        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: '#21262d' }}>
          <div className="text-sm font-bold text-blue-400 leading-tight">BG Modular</div>
          <div className="text-xs text-gray-500">Base Planner</div>
          <div className="mt-1 flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${serverOk === true ? 'bg-green-400' : serverOk === false ? 'bg-red-400' : 'bg-yellow-400'}`} />
            <span className="text-xs text-gray-500">{serverOk === true ? 'Server OK' : serverOk === false ? 'Server offline' : 'Connecting...'}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer: version badge + static info */}
        <div className="p-3 border-t space-y-1" style={{ borderColor: '#21262d' }}>
          <div className="text-xs text-gray-600">ATM10 To The Sky<br />BG2 / Minecraft 1.21.1</div>
          <button
            onClick={() => setShowChangelog(true)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            title="View changelog"
          >
            v{APP_VERSION}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ background: '#161b22' }}>
        <Outlet />
      </main>

      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </div>
  )
}
