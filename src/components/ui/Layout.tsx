import { Outlet, NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../../store/api.ts'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/library', label: 'Library', icon: '📚' },
  { to: '/generator', label: 'Generator', icon: '⚡' },
  { to: '/renderer', label: 'Renderer', icon: '🎨' },
  { to: '/export', label: 'Export', icon: '📤' },
]

export default function Layout() {
  const [serverOk, setServerOk] = useState<boolean | null>(null)

  useEffect(() => {
    api.health().then(() => setServerOk(true)).catch(() => setServerOk(false))
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

        <div className="p-3 text-xs text-gray-600 border-t" style={{ borderColor: '#21262d' }}>
          ATM10 To The Sky<br />
          BG2 / Minecraft 1.21.1
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ background: '#161b22' }}>
        <Outlet />
      </main>
    </div>
  )
}
