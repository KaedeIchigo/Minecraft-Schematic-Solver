import { create } from 'zustand'
import type { Project, TemplateModule } from '@shared/types.js'

interface AppState {
  // Active project
  activeProject: Project | null
  projects: Project[]
  templates: TemplateModule[]

  // Selected template (for renderer/editor/export)
  selectedTemplateId: string | null

  // Loading
  loading: boolean
  error: string | null

  // Actions
  setActiveProject: (p: Project | null) => void
  setProjects: (p: Project[]) => void
  setTemplates: (t: TemplateModule[]) => void
  addTemplate: (t: TemplateModule) => void
  updateTemplate: (t: TemplateModule) => void
  removeTemplate: (id: string) => void
  setSelectedTemplate: (id: string | null) => void
  setLoading: (v: boolean) => void
  setError: (v: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeProject: null,
  projects: [],
  templates: [],
  selectedTemplateId: null,
  loading: false,
  error: null,

  setActiveProject: (p) => set({ activeProject: p }),
  setProjects: (projects) => set({ projects }),
  setTemplates: (templates) => set({ templates }),
  addTemplate: (t) => set(s => ({ templates: [t, ...s.templates] })),
  updateTemplate: (t) => set(s => ({ templates: s.templates.map(x => x.id === t.id ? t : x) })),
  removeTemplate: (id) => set(s => ({ templates: s.templates.filter(x => x.id !== id) })),
  setSelectedTemplate: (id) => set({ selectedTemplateId: id }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))
