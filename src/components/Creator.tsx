import { useMemo, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { hueOf } from '../lib/hue'
import { safeHref, useSiteProfile } from '../lib/siteProfile'
import { openPanel } from '../lib/ui'
import { useCurrentUser } from '../lib/useCurrentUser'
import { PROJECT_TYPES, PROJECT_TYPE_LABELS, type Project } from '../types'
import { Icon } from './Icon'
import { HangarConsole } from './HangarScene'

// "hace 5 min", "hace 3 h", "hace 2 d"…
function timeAgo(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (s < 60) return 'hace un momento'
  const m = Math.round(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d < 31 ? `hace ${d} d` : new Date(ms).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Bloque del creador (perfil público editable) junto al "pulso" de la web: estadísticas en vivo y el botón Personalizar.
export function Creator({ projects }: { projects: Project[] }) {
  const profile = useSiteProfile()
  const { user, isOwner } = useCurrentUser()

  const stats = useMemo(() => {
    const likes = projects.reduce((sum, p) => sum + (p.likes ?? 0), 0)
    const updates = projects.filter((p) => p.type === 'avance').length
    const byType = PROJECT_TYPES.map((t) => ({ type: t, n: projects.filter((p) => p.type === t).length }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 5)
    const last = projects.reduce<Project | null>((a, p) => (!a || p.createdAt > a.createdAt ? p : a), null)
    // Lo más querido: las 3 con más ♥ (a igualdad, la más reciente).
    const featured = [...projects].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0) || b.createdAt - a.createdAt).slice(0, 3)
    return { likes, updates, byType, last, featured, max: Math.max(1, ...byType.map((x) => x.n)) }
  }, [projects])

  const links = profile.links.map((l) => ({ ...l, href: safeHref(l.url) })).filter((l) => l.href)

  return (
    <section className="hero home-hero-wrap" aria-labelledby="greeting">
      <div className="hero-copy home-hero">
        <HangarConsole />
        <div className="creator-head">
          <span className="creator-logo">
            <img src={profile.logoUrl} alt={`Logo de ${profile.displayName}`} width="112" height="112" />
          </span>
          <div className="creator-id">
            <div className="hero-topline">
              <span className="hero-id">{profile.role}</span>
              <span className="hero-session"><i aria-hidden="true" /> {user ? 'SESIÓN ACTIVA' : 'INVITADO'}</span>
            </div>
            <p className="creator-name">{profile.displayName}</p>
            <p className="hero-greeting">{profile.eyebrow}</p>
            <div className="creator-chips">
              {profile.statusText && <span className="creator-chip is-status"><i aria-hidden="true" />{profile.statusText}</span>}
              {profile.location && <span className="creator-chip"><Icon name="pin" />{profile.location}</span>}
            </div>
          </div>
        </div>

        {stats.featured.length > 0 && (
          <div className="creator-featured">
            <span className="pulse-sub">Lo más querido ♥</span>
            <div className="featured-row">
              {stats.featured.map((p, i) => (
                <Link key={p.id} className="featured-item" to={`/p/${p.id}`}>
                  <span
                    className="item-cover featured-cover"
                    style={{ '--cover-h': hueOf(p.title) } as CSSProperties}
                    data-initials={p.title.trim().slice(0, 2).toUpperCase()}
                  >
                    {p.coverUrl && <img src={p.coverUrl} alt="" loading="lazy" />}
                    <span className="featured-rank" aria-hidden="true">#{i + 1}</span>
                    <span className="featured-type">{PROJECT_TYPE_LABELS[p.type]}</span>
                  </span>
                  <span className="featured-info">
                    <b>{p.title}</b>
                    <small>♥ {p.likes ?? 0}</small>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <h1 id="greeting">
          <span className="hero-title-lead">{profile.titleLead}</span>
          <span className="hero-title-main">{profile.titleMain}<span className="hero-title-dot">.</span></span>
        </h1>
        <p className="hero-subtitle">{profile.tagline}<br /><span>{profile.note}</span></p>
        {profile.bio && <p className="creator-bio">{profile.bio}</p>}

        {(links.length > 0 || isOwner) && (
          <div className="creator-links">
            {links.map((l) => (
              <a key={l.href} className="launcher-pill" href={l.href!} target="_blank" rel="noopener noreferrer">
                {l.label}<Icon name="external" />
              </a>
            ))}
            {isOwner && (
              <button type="button" className="ghost-button creator-edit" onClick={() => openPanel('profile')}>
                <Icon name="edit" /><span>Editar mi perfil</span>
              </button>
            )}
          </div>
        )}
      </div>

      <aside className="clock-panel home-stats pulse" aria-label="Resumen de la web en vivo">
        <div className="pulse-head">
          <span className="pulse-title"><Icon name="sparkle" />Pulso de la web</span>
          <span className="pulse-live"><i aria-hidden="true" />En vivo</span>
        </div>

        <div className="pulse-stats">
          <div className="pulse-stat"><b>{projects.length}</b><span>Publicaciones</span></div>
          <div className="pulse-stat is-likes"><b>{stats.likes}</b><span>Me gusta</span></div>
          <div className="pulse-stat"><b>{stats.updates}</b><span>Avances</span></div>
        </div>

        <div className="pulse-bars">
          <span className="pulse-sub">Qué hay publicado</span>
          {stats.byType.length === 0 ? (
            <p className="pulse-empty">Aún no hay publicaciones.</p>
          ) : (
            stats.byType.map((x) => (
              <div key={x.type} className="pulse-bar">
                <span>{PROJECT_TYPE_LABELS[x.type]}</span>
                <i><u style={{ width: `${(x.n / stats.max) * 100}%` }} /></i>
                <b>{x.n}</b>
              </div>
            ))
          )}
        </div>

        {stats.last && (
          <Link className="pulse-last" to={`/p/${stats.last.id}`}>
            <span className="pulse-sub">Lo último</span>
            <strong>{stats.last.title}</strong>
            <small>{PROJECT_TYPE_LABELS[stats.last.type]} · {timeAgo(stats.last.createdAt)}</small>
          </Link>
        )}

        <button type="button" className="add-button pulse-customize" onClick={() => openPanel('customize')}>
          <Icon name="sliders" /><span>Personalizar la web</span>
        </button>
      </aside>
    </section>
  )
}
