import { lazy, Suspense } from 'react'
import { Routes, Route, Link } from 'react-router'
import { Backdrop } from './components/Backdrop'
import { CustomizeDialog } from './components/CustomizeDialog'
import { ProfileEditor } from './components/ProfileEditor'
import { Header } from './components/Header'
import { PageShell } from './components/PageShell'
import { TABS } from './config/tabs'
import { TabPage } from './pages/TabPage'

// Las páginas secundarias se cargan solo cuando se visitan (code-splitting por ruta).
const ProjectPage = lazy(() => import('./pages/ProjectPage').then((m) => ({ default: m.ProjectPage })))
const NewProjectPage = lazy(() => import('./pages/NewProjectPage').then((m) => ({ default: m.NewProjectPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))

function App() {
  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <Backdrop />
      <Header />
      <Suspense fallback={null}>
        <Routes>
          {TABS.map((t) => (
            <Route key={t.slug} path={`/${t.slug}`} element={<TabPage key={t.slug} tab={t} />} />
          ))}
          <Route path="/p/:id" element={<PageShell><ProjectPage /></PageShell>} />
          <Route path="/entrar" element={<LoginPage />} />
          <Route path="/nuevo" element={<PageShell><NewProjectPage /></PageShell>} />
          <Route path="/u/:username" element={<PageShell><ProfilePage /></PageShell>} />
          <Route path="*" element={
            <PageShell>
              <div className="utility-card pub-empty">
                <strong>No encontramos esa página</strong>
                <Link to="/">Volver al inicio</Link>
              </div>
            </PageShell>
          } />
        </Routes>
      </Suspense>
      <CustomizeDialog />
      <ProfileEditor />
    </>
  )
}

export default App
