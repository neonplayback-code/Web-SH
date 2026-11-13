import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router'
import { isBackendConfigured, supabase } from '../lib/supabase'
import { PROJECT_SELECT, toProject, type ProjectRow } from '../lib/projects'
import { hueOf } from '../lib/hue'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import { ProjectCard } from '../components/ProjectCard'
import { Notice } from '../components/Notice'
import type { Project } from '../types'

export function ProfilePage() {
  const { username = '' } = useParams()
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState('')
  useDocumentMeta(username ? `@${username}` : null, username ? `Publicaciones de @${username}.` : null)

  useEffect(() => {
    if (!isBackendConfigured) return
    supabase
      .from('projects')
      .select(PROJECT_SELECT)
      .eq('author_username', username)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) return setError(err.message)
        setProjects(((data ?? []) as ProjectRow[]).map(toProject))
      })
  }, [username])

  const likes = useMemo(() => (projects ?? []).reduce((sum, p) => sum + (p.likes ?? 0), 0), [projects])
  const since = useMemo(() => {
    if (!projects?.length) return ''
    const oldest = Math.min(...projects.map((p) => p.createdAt))
    return new Date(oldest).toLocaleDateString('es', { month: 'long', year: 'numeric' })
  }, [projects])

  return (
    <div className="profile-page">
      <nav className="crumbs" aria-label="Ruta">
        <Link className="crumb-back" to="/"><span>←</span><span>Inicio</span></Link>
        <span className="crumb-trail"><Link to="/">Inicio</Link><i>/</i><b>Perfil</b></span>
      </nav>

      <header className="profile-card utility-card" style={{ '--cover-h': hueOf(username) } as CSSProperties}>
        <span className="profile-avatar" aria-hidden="true">{username.slice(0, 1).toUpperCase()}</span>
        <div className="profile-id">
          <span className="section-kicker">PERFIL DE CREADOR</span>
          <h1>@{username}</h1>
          <p className="profile-stats">
            <span><b>{projects?.length ?? 0}</b> publicaciones</span>
            <span><b>{likes}</b> ♥ recibidos</span>
            {since && <span>desde {since}</span>}
          </p>
        </div>
      </header>

      {!isBackendConfigured && <Notice>Configura Supabase para ver perfiles reales.</Notice>}
      {error && <Notice>No se pudo cargar el perfil: {error}</Notice>}
      {projects === null && isBackendConfigured && !error && <Notice>Cargando…</Notice>}
      {projects && projects.length === 0 && (
        <div className="utility-card pub-empty"><strong>Todavía no hay publicaciones</strong></div>
      )}
      {projects && projects.length > 0 && (
        <div className="pub-grid">
          {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </div>
  )
}
