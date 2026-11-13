import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import type { Layout } from '../config/tabs'
import { hueOf } from '../lib/hue'
import { PROJECT_TYPE_LABELS, type Project } from '../types'

const dateOf = (p: Project) => new Date(p.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })

// Solo enlaces http(s): las URLs vienen de los datos y no se deben abrir con otros esquemas.
const safeUrl = (u?: string) => (u && /^https?:\/\//i.test(u) ? u : null)
const hostOf = (u: string | null) => {
  try {
    return u ? new URL(u).hostname.replace(/^www\./, '') : ''
  } catch {
    return ''
  }
}

function Cover({ p }: { p: Project }) {
  return (
    <span
      className="item-cover"
      style={{ '--cover-h': hueOf(p.title) } as CSSProperties}
      data-initials={p.title.trim().slice(0, 2).toUpperCase()}
    >
      {p.coverUrl && <img src={p.coverUrl} alt="" loading="lazy" />}
    </span>
  )
}

const Meta = ({ p }: { p: Project }) => (
  <small className="item-meta">{PROJECT_TYPE_LABELS[p.type].toUpperCase()} · ♥ {p.likes ?? 0} · {dateOf(p)}</small>
)

const Tags = ({ p }: { p: Project }) =>
  p.tags?.length ? <span className="item-tags">{p.tags.slice(0, 4).map((t) => <i key={t}>#{t}</i>)}</span> : null

// Un elemento de una sección. Cada `layout` es una estructura distinta, como pide cada tab.
export function Item({ project: p, layout }: { project: Project; layout: Layout }) {
  const to = `/p/${p.id}`
  const external = safeUrl(p.links?.[0])

  switch (layout) {
    case 'tall':
      return (
        <article className="item item-tall utility-card">
          <h3 className="item-title">{p.title}</h3>
          <Cover p={p} />
          <p className="item-sum">{p.summary}</p>
          <Tags p={p} />
          <Meta p={p} />
          <Link className="ghost-button item-more" to={to}>Ver más info</Link>
        </article>
      )
    case 'video':
      return (
        <article className="item item-video utility-card">
          <Link className="item-stage" to={to} aria-label={`Ver ${p.title}`}>
            <Cover p={p} />
            <span className="item-play" aria-hidden="true">▶</span>
          </Link>
          <h3 className="item-title">{p.title}</h3>
          <Meta p={p} />
          <Link className="ghost-button item-more" to={to}>Ver video</Link>
        </article>
      )
    case 'banner':
      return (
        <article className="item item-banner utility-card">
          <span className="item-date">
            <b>{new Date(p.createdAt).getDate()}</b>
            <i>{new Date(p.createdAt).toLocaleDateString('es', { month: 'short' }).toUpperCase()}</i>
          </span>
          <div className="item-text">
            <h3 className="item-title">{p.title}</h3>
            <p className="item-sum">{p.summary}</p>
          </div>
          <Link className="ghost-button item-more" to={to}>Leer más</Link>
        </article>
      )
    case 'article':
      return (
        <Link className="item item-article utility-card" to={to}>
          <h3 className="item-title">{p.title}</h3>
          <p className="item-sum">{p.summary}</p>
          <Meta p={p} />
        </Link>
      )
    case 'beta': {
      const tag = p.tags?.find((t) => t !== 'en-beta')
      return (
        <article className="item item-beta utility-card">
          <span className="item-badge">BETA{external ? (tag ? ` · ${tag}` : '') : ' · PRÓXIMAMENTE'}</span>
          <h3 className="item-title">{p.title}</h3>
          <p className="item-sum">{p.summary}</p>
          <Meta p={p} />
          <span className="item-actions">
            {external && <a className="ghost-button item-more" href={external} target="_blank" rel="noreferrer noopener">Probar la beta</a>}
            <Link className="ghost-button item-more" to={to}>Ver más info</Link>
          </span>
        </article>
      )
    }
    case 'demo':
      return (
        <article className="item item-demo utility-card">
          <Cover p={p} />
          <h3 className="item-title">{p.title}</h3>
          <p className="item-sum">{p.summary}</p>
          <span className="item-actions">
            {external && <a className="ghost-button item-more" href={external} target="_blank" rel="noreferrer noopener">Probar demo</a>}
            <Link className="ghost-button item-more" to={to}>Ver más info</Link>
          </span>
        </article>
      )
    case 'timeline':
      return (
        <article className="item item-step">
          <span className="item-node" aria-hidden="true" />
          <Link className="utility-card item-step-card" to={to}>
            <small className="item-meta">{dateOf(p)} · ♥ {p.likes ?? 0}</small>
            <h3 className="item-title">{p.title}</h3>
            <p className="item-sum">{p.summary}</p>
          </Link>
        </article>
      )
    case 'links': {
      const inner = (
        <>
          <span className="item-fav" aria-hidden="true">{p.title.trim().slice(0, 1).toUpperCase()}</span>
          <span className="item-text">
            <strong className="item-title">{p.title}</strong>
            <small className="item-meta">{hostOf(external) || PROJECT_TYPE_LABELS[p.type]}</small>
          </span>
          <span className="item-out" aria-hidden="true">↗</span>
        </>
      )
      return external
        ? <a className="item item-link utility-card" href={external} target="_blank" rel="noreferrer noopener">{inner}</a>
        : <Link className="item item-link utility-card" to={to}>{inner}</Link>
    }
    case 'short':
      return (
        <Link className="item item-short utility-card" to={to}>
          <Cover p={p} />
          <span className="item-over">
            <strong className="item-title">{p.title}</strong>
            <small className="item-meta">♥ {p.likes ?? 0}</small>
          </span>
        </Link>
      )
    default:
      return (
        <Link className="item item-tile utility-card" to={to}>
          <Cover p={p} />
          <strong className="item-title">{p.title}</strong>
          <Meta p={p} />
        </Link>
      )
  }
}
