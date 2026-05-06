import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import projectsRouter from './routes/projects.js'
import templatesRouter from './routes/templates.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001

const app = express()

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Static uploads
const DATA_DIR = path.join(__dirname, '..', 'data', 'uploads')
app.use('/uploads', express.static(DATA_DIR))

// API routes
app.use('/api/projects', projectsRouter)
app.use('/api/templates', templatesRouter)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Serve built client in production
const clientDist = path.join(__dirname, '..', 'dist')
app.use(express.static(clientDist))
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`BG Modular Base Planner server running on http://localhost:${PORT}`)
})

export default app
