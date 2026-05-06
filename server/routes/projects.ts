import { Router } from 'express'
import { listProjects, getProject, createProject, updateProject, deleteProject } from '../db/projectRepo.js'
import type { CreateProjectRequest } from '@shared/types.js'

const router = Router()

router.get('/', (_req, res) => {
  res.json(listProjects())
})

router.get('/:id', (req, res) => {
  const p = getProject(req.params.id)
  if (!p) return res.status(404).json({ error: 'Project not found' })
  res.json(p)
})

router.post('/', (req, res) => {
  const body = req.body as CreateProjectRequest
  if (!body.name) return res.status(400).json({ error: 'name is required' })
  res.status(201).json(createProject(body))
})

router.put('/:id', (req, res) => {
  const updated = updateProject(req.params.id, req.body)
  if (!updated) return res.status(404).json({ error: 'Project not found' })
  res.json(updated)
})

router.delete('/:id', (req, res) => {
  const ok = deleteProject(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Project not found' })
  res.status(204).end()
})

export default router
