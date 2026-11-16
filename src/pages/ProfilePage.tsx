import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router'
import { isBackendConfigured, supabase } from '../lib/supabase'
import { PROJECT_LIST_SELECT, toProject, type ProjectRow } from '../lib/projects'
import { hueOf } from '../lib/hue'
import { useCurrentUser } from '../lib/useCurrentUser'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import { ProjectCard } from '../components/ProjectCard'
import { Notice } from '../components/Notice'
import type { Project } from '../types'

interface Loaded {
  username: string
  found: boolean
  profileId: string | null
  since: number | null
  published: Project[]
  drafts: Project[]
  error: string
}

export function ProfilePage() {
  const { username = '' } = useParams()
  const { user } = useCurrentUser()
  const [data, setData] = useState<Loaded | null>(null)
  useDocumentMeta(username ? `@${username}` : null, username ? `Publicaciones de @${username}.` : null)

  useEffect(() => {
    if (!isBackendConfigured) return
    let alive = true
    const fail = (message: string): Loaded => ({ username, found: false, profileId: null, since: null, published: [], drafts: [], error: message })

    ;(async () => {
      const profile = await supabase.from('profiles').select('id, created_at').eq('username', username).maybeSingle()
      if (profile.error) return alive && setData(fail(profile.error.message))
      if (!profile.data) return alive && setData({ ...fail(''), found: false })

      // Los nombres son únicos, pero se filtra por id: es lo que de verdad identifica a la persona.
      const rows = await supabase
        .from('projects')
        .select(PROJECT_LIST_SELECT)
        .eq('author_id', profile.data.id)
        .order('created_at', { ascending: false })
      if (rows.error) return alive && setData(fail(rows.error.message))

      // Los borradores solo los devuelve el servidor a su autor.
      const all = ((rows.data ?? []) as ProjectRow[]).map(toProject)
      if (alive) {
        setData({
          username,
          found: true,
          profileId: profile.data.id,
          since: Number(profile.data.created_at),
          published: all.filter((p) => p.status === 'published'),
          drafts: all.filter((p) => p.status === 'draft'),
          error: '',
        })
      }
    })()

    return () => {
      alive = false
    }
  }, [username, user?.id])

  // Mientras llega la respuesta de otro perfil no se enseñan datos del anterior.
  const current = data?.username === username ? data : null
  const published = useMemo(() => current?.published ?? [], [current])
  const drafts = current && user?.id === current.profileId ? current.drafts : []
  const likes = useMemo(() => published.reduce((sum, p) => sum + (p.likes ?? 0), 0), [published])
  const since = current?.since
    ? new Date(current.since).toLocaleDateString('es', { month: 'long', year: 'numeric' })
    : ''

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
            <span><b>{published.length}</b> publicaciones</span>
            <span><b>{likes}</b> ♥ recibidos</span>
            {since && <span>desde {since}</span>}
          </p>
        </div>
      </header>

      {!isBackendConfigured && <Notice>Configura Supabase para ver perfiles reales.</Notice>}
      {current?.error && <Notice>No se pudo cargar el perfil: {current.error}</Notice>}
      {!current && isBackendConfigured && <Notice>Cargando…</Notice>}
      {current && !current.error && !current.found && (
        <div className="utility-card pub-empty"><strong>Este perfil no existe</strong><Link to="/">Volver al inicio</Link></div>
      )}
      {current?.found && published.length === 0 && drafts.length === 0 && (
        <div className="utility-card pub-empty"><strong>Todavía no hay publicaciones</strong></div>
      )}
      {published.length > 0 && (
        <div className="pub-grid">
          {published.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
      {drafts.length > 0 && (
        <section className="profile-drafts" aria-labelledby="drafts-heading">
          <div className="utility-heading">
            <div>
              <span className="section-kicker">SOLO TÚ LOS VES</span>
              <h2 id="drafts-heading">Borradores</h2>
            </div>
          </div>
          <div className="pub-grid">
            {drafts.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}
