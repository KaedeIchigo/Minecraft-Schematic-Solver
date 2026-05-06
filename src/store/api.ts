import type {
  Project, TemplateModule, CreateProjectRequest,
  GenerateModuleRequest, ExportTemplateRequest, ValidationReport,
  Blueprint, DesignBrainRequest, BuildFromBlueprintRequest,
} from '@shared/types.js'

const BASE = '/api'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error: string }).error ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// Projects
export const api = {
  projects: {
    list: () => req<Project[]>('/projects'),
    get: (id: string) => req<Project>(`/projects/${id}`),
    create: (body: CreateProjectRequest) => req<Project>('/projects', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, patch: Partial<Project>) => req<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
    delete: (id: string) => req<void>(`/projects/${id}`, { method: 'DELETE' }),
  },

  templates: {
    list: (projectId?: string) => req<TemplateModule[]>(`/templates${projectId ? `?projectId=${projectId}` : ''}`),
    get: (id: string) => req<TemplateModule>(`/templates/${id}`),
    create: (body: Omit<TemplateModule, 'id' | 'createdAt' | 'updatedAt'>) =>
      req<TemplateModule>('/templates', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, patch: Partial<TemplateModule>) =>
      req<TemplateModule>(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
    delete: (id: string) => req<void>(`/templates/${id}`, { method: 'DELETE' }),
    generate: (body: GenerateModuleRequest) =>
      req<TemplateModule>('/templates/generate', { method: 'POST', body: JSON.stringify(body) }),
    design: (body: DesignBrainRequest) =>
      req<{ blueprint: Blueprint }>('/templates/design', { method: 'POST', body: JSON.stringify(body) }),
    build: (body: BuildFromBlueprintRequest) =>
      req<TemplateModule>('/templates/build', { method: 'POST', body: JSON.stringify(body) }),
    export: (id: string, body: Partial<ExportTemplateRequest>) =>
      req<{ format: string; data: string }>(`/templates/${id}/export`, { method: 'POST', body: JSON.stringify(body) }),
    import: (raw: unknown, projectId: string, name?: string) =>
      req<{ template: TemplateModule; warnings: string[] }>('/templates/import', {
        method: 'POST', body: JSON.stringify({ raw, projectId, name }),
      }),
    validate: (id: string) => req<ValidationReport>(`/templates/${id}/validate`),
    roundtrip: (id: string) => req<{ success: boolean; errors: string[]; warnings: string[] }>(`/templates/${id}/roundtrip`, { method: 'POST' }),
    materials: (id: string) => req<Array<{ blockId: string; displayName: string; count: number }>>(`/templates/${id}/materials`),
  },

  health: () => req<{ status: string }>('/health'),
}
