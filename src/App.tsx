import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/ui/Layout.tsx'
import Dashboard from './pages/Dashboard.tsx'
import TemplateLibrary from './pages/TemplateLibrary.tsx'
import Generator from './pages/Generator.tsx'
import RendererPage from './pages/RendererPage.tsx'
import ExportPage from './pages/ExportPage.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="library" element={<TemplateLibrary />} />
          <Route path="generator" element={<Generator />} />
          <Route path="renderer/:id?" element={<RendererPage />} />
          <Route path="export/:id?" element={<ExportPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
