import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { useParams, Link } from 'react-router'
import { isBackendConfigured, supabase } from '../lib/supabase'
import { PROJECT_SELECT, toProject, toUpdate, type ProjectRow } from '../lib/projects'
import { findBetaCatalogProject } from '../lib/betaCatalog'
import { demoUpdates, findDemoProject } from '../lib/demoProjects'
import { useCurrentUser } from '../lib/useCurrentUser'
import { hasLiked, toggleLike } from '../lib/likes'
import { hueOf } from '../lib/hue'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import { TABS } from '../config/tabs'
import { LikeButton } from '../components/LikeButton'
import { Notice } from '../components/Notice'
import { Icon } from '../components/Icon'
import {
  DETAIL_PRESETS,
  estimateReadingMinutes,
  extractFormatMeta,
  hostLabel,
  parseVideoEmbed,
} from '../lib/projectFormat'
import { PROJECT_TYPE_LABELS, type Project, type ProjectUpdate } from '../types'

const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url)

export function ProjectPage() {
  const { id = '' } = useParams()
  const { user } = useCurrentUser()
  const [project, setProject] = useState<Project | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [updates, setUpdates] = useState<ProjectUpdate[]>([])
  const [updateText, setUpdateText] = useState('')
  const [error, setError] = useState('')
  const [liked, setLiked] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)
  const [likeError, setLikeError] = useState('')
  const [copied, setCopied] = useState(false)
  const [playingEmbed, setPlayingEmbed] = useState(false)
  useDocumentMeta(project?.title ?? null, project?.summary ?? null)

  const isDemo = Boolean(findDemoProject(id) ?? findBetaCatalogProject(id))

  useEffect(() => {
    setPlayingEmbed(false)
    const demoItem = findDemoProject(id) ?? findBetaCatalogProject(id)
    if (demoItem) {
      setProject(demoItem)
      setUpdates(demoUpdates(id))
      setLiked(false)
      setState('ready')
      return
    }
    if (!isBackendConfigured) {
      setState('missing')
      return
    }
    supabase
      .from('projects')
      .select(PROJECT_SELECT)
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) return setState('error')
        if (!data) return setState('missing')
        setProject(toProject(data as ProjectRow))
        setState('ready')
      })
  }, [id])

  useEffect(() => {
    if (isDemo || !isBackendConfigured || !project) return
    supabase
      .from('project_updates')
      .select('id, text, created_at')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setUpdates((data ?? []).map(toUpdate)))
  }, [id, isDemo, project])

  useEffect(() => {
    if (isDemo || !isBackendConfigured || !user) {
      setLiked(false)
      return
    }
    hasLiked(id, user.id).then(setLiked).catch(() => setLiked(false))
  }, [id, isDemo, user])

  if (state === 'loading') return <Notice>Cargando…</Notice>
  if (state === 'error') return <Notice>No se pudo cargar la publicación.</Notice>
  if (state === 'missing' || !project) {
    return <Notice>Esta publicación no existe o no está publicada. <Link to="/">Volver</Link></Notice>
  }

  const isOwner = user?.id === project.authorUid
  const typeLabel = PROJECT_TYPE_LABELS[project.type]
  const preset = DETAIL_PRESETS[project.type]
  // Vuelve a la sección del mismo tipo (Proyectos, Videos...) o al inicio si no hay.
  const section = TABS.find((t) => t.type === project.type)
  const backTo = section ? `/${section.slug}` : '/'
  const gallery = project.mediaUrls ?? []
  const links = project.links ?? []
  const primaryUrl = links[0]
  const extraLinks = links.slice(1)
  const videoFile = gallery.find((url) => isVideo(url))
  const embedUrl = primaryUrl ? parseVideoEmbed(primaryUrl) : null
  const extraGallery = project.type === 'video' || project.type === 'short'
    ? gallery.filter((url) => url !== videoFile)
    : gallery
  const { metaLabel, metaValue, progressPct, cleanBody } = extractFormatMeta(project.body)
  const readingMins = estimateReadingMinutes(cleanBody || project.summary)
  const date = new Date(project.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
  const coverHue = { '--cover-h': hueOf(project.title) } as CSSProperties
  const initials = project.title.trim().slice(0, 2).toUpperCase() || preset.icon

  const submitUpdate = async (e: FormEvent) => {
    e.preventDefault()
    const text = updateText.trim()
    if (!text || !isOwner) return
    setError('')
    const { error: err } = await supabase.from('project_updates').insert({
      project_id: id,
      text: text.slice(0, 2000),
      created_at: Date.now()
    })
    if (err) return setError(err.message)
    setUpdateText('')
    const { data } = await supabase
      .from('project_updates')
      .select('id, text, created_at')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
    setUpdates((data ?? []).map(toUpdate))
  }

  const onLike = async () => {
    if (isDemo) {
      const nextLiked = !liked
      setLiked(nextLiked)
      setProject((p) => (p ? { ...p, likes: Math.max(0, (p.likes ?? 0) + (nextLiked ? 1 : -1)) } : p))
      return
    }
    if (!user) return
    setLikeBusy(true)
    setLikeError('')
    try {
      const result = await toggleLike(id)
      setLiked(result.liked)
      setProject((p) => (p ? { ...p, likes: result.likes } : p))
    } catch (err) {
      setLikeError(err instanceof Error ? err.message : String(err))
    } finally {
      setLikeBusy(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const bylineEl = (
    <p className="pub-byline">
      Por <Link to={`/u/${project.authorUsername}`}>@{project.authorUsername}</Link>
      <i aria-hidden="true">·</i>
      <time dateTime={new Date(project.createdAt).toISOString()}>{date}</time>
    </p>
  )

  const tagsEl = project.tags?.length > 0 && (
    <p className="item-tags">{project.tags.map((t) => <i key={t}>#{t}</i>)}</p>
  )

  const renderLinks = (primaryProminent: boolean) => links.length > 0 && (
    <div className="pub-links">
      {primaryProminent && primaryUrl ? (
        <>
          <a className="btn-astra launcher-pill pub-cta-primary" href={primaryUrl} target="_blank" rel="noopener noreferrer">
            <span aria-hidden="true">{preset.icon}</span>
            <span>{preset.ctaLabel}</span>
            <Icon name="external" />
          </a>
          {extraLinks.map((link) => (
            <a key={link} className="launcher-pill" href={link} target="_blank" rel="noopener noreferrer">
              {link.replace(/^https?:\/\/(www\.)?/, '')}<Icon name="external" />
            </a>
          ))}
        </>
      ) : (
        links.map((link) => (
          <a key={link} className="launcher-pill" href={link} target="_blank" rel="noopener noreferrer">
            {link.replace(/^https?:\/\/(www\.)?/, '')}<Icon name="external" />
          </a>
        ))
      )}
    </div>
  )

  const actionsEl = (
    <>
      <div className="pub-actions">
        <LikeButton
          liked={liked}
          count={project.likes ?? 0}
          busy={likeBusy}
          onClick={onLike}
          to={isDemo || user ? undefined : `/entrar?next=/p/${id}`}
        />
        <button type="button" className="ghost-button copy-link" onClick={copyLink}>
          <Icon name="link" /><span>{copied ? 'Enlace copiado' : 'Copiar enlace'}</span>
        </button>
      </div>
      {!isDemo && !user && <p className="pub-hint"><Link to={`/entrar?next=/p/${id}`}>Inicia sesión</Link> para dar ♥.</p>}
      {likeError && <p className="form-error">{likeError}</p>}
    </>
  )

  const emblemArt = (
    <div className="pub-emblem-art" style={coverHue}>
      <span className="pub-emblem-glyph" aria-hidden="true">{preset.icon}</span>
      <strong className="pub-emblem-mono">{initials}</strong>
      {metaValue && <span className="pub-emblem-tag">{metaValue}</span>}
    </div>
  )

  const renderHero = () => {
    switch (preset.layout) {
      case 'bulletin':
        return (
          <article className="project-hero utility-card pub-hero-bulletin is-type-anuncio">
            <div className="pub-stage-head">
              <span className="pub-badge pub-badge-accent"><i aria-hidden="true">{preset.icon}</i> {preset.kicker}</span>
              {metaValue && <span className="pub-meta-pill pub-meta-highlight">{metaValue}</span>}
            </div>
            <h1 className="pub-title">{project.title}</h1>
            {project.summary && <p className="pub-bulletin-lead">{project.summary}</p>}
            {project.coverUrl && (
              <figure className="pub-bulletin-banner">
                <img src={project.coverUrl} alt="" />
              </figure>
            )}
            <div className="pub-stage-footer">
              <div className="pub-stage-meta">
                {bylineEl}
                {tagsEl}
              </div>
              <div className="pub-stage-controls">
                {renderLinks(true)}
                {actionsEl}
              </div>
            </div>
          </article>
        )

      case 'article':
        return (
          <article className="project-hero utility-card pub-hero-article is-type-post">
            <div className="pub-article-top">
              <div className="pub-stage-head">
                <span className="pub-badge"><i aria-hidden="true">{preset.icon}</i> {preset.kicker}</span>
                <span className="pub-meta-pill">{readingMins} min de lectura</span>
              </div>
              <h1 className="pub-title">{project.title}</h1>
              {project.summary && <p className="pub-lead pub-article-deck">{project.summary}</p>}
              <div className="pub-stage-footer">
                <div className="pub-stage-meta">
                  {bylineEl}
                  {tagsEl}
                </div>
                <div className="pub-stage-controls">
                  {renderLinks(false)}
                  {actionsEl}
                </div>
              </div>
            </div>
            {project.coverUrl && (
              <figure className="pub-article-cover">
                <img src={project.coverUrl} alt="" />
              </figure>
            )}
          </article>
        )

      case 'video':
        return (
          <article className="project-hero utility-card pub-hero-video is-type-video">
            <div className="pub-theater" style={coverHue}>
              {videoFile ? (
                <video src={videoFile} controls poster={project.coverUrl ?? undefined} className="pub-theater-media" />
              ) : embedUrl && playingEmbed ? (
                <iframe
                  src={`${embedUrl}?autoplay=1`}
                  title={project.title}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="pub-theater-media"
                />
              ) : (
                <div className="pub-theater-poster">
                  {project.coverUrl ? <img src={project.coverUrl} alt="" /> : <div className="pub-theater-backdrop" />}
                  <div className="pub-theater-overlay">
                    <div className="pub-stage-head">
                      <span className="pub-badge"><i aria-hidden="true">{preset.icon}</i> {preset.kicker}</span>
                      {metaValue && <span className="pub-meta-pill pub-meta-highlight">{metaValue}</span>}
                    </div>
                    {embedUrl ? (
                      <button type="button" className="btn-astra pub-play-cta" onClick={() => setPlayingEmbed(true)}>
                        <span aria-hidden="true">▶</span><span>Reproducir video</span>
                      </button>
                    ) : primaryUrl ? (
                      <a className="btn-astra pub-play-cta" href={primaryUrl} target="_blank" rel="noopener noreferrer">
                        <span aria-hidden="true">▶</span><span>Ver video</span><Icon name="external" />
                      </a>
                    ) : (
                      <span className="pub-play-badge" aria-hidden="true">▶</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="pub-theater-info">
              <div className="pub-theater-main">
                <h1 className="pub-title">{project.title}</h1>
                {project.summary && <p className="pub-lead">{project.summary}</p>}
                {bylineEl}
                {tagsEl}
              </div>
              <div className="pub-stage-controls">
                {renderLinks(false)}
                {actionsEl}
              </div>
            </div>
          </article>
        )

      case 'short':
        return (
          <article className="project-hero utility-card pub-hero-short is-type-short">
            <div className="pub-reel-frame" style={coverHue}>
              {videoFile ? (
                <video src={videoFile} controls loop playsInline poster={project.coverUrl ?? undefined} className="pub-reel-media" />
              ) : embedUrl && playingEmbed ? (
                <iframe
                  src={`${embedUrl}?autoplay=1`}
                  title={project.title}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="pub-reel-media"
                />
              ) : project.coverUrl ? (
                <img src={project.coverUrl} alt="" className="pub-reel-media" />
              ) : (
                emblemArt
              )}
              <span className="pub-reel-chip"><i aria-hidden="true">{preset.icon}</i> SHORT</span>
              {!playingEmbed && embedUrl && (
                <button type="button" className="btn-astra pub-reel-play" onClick={() => setPlayingEmbed(true)}>
                  ▶ Ver clip
                </button>
              )}
            </div>
            <div className="project-info pub-reel-info">
              <span className="pub-badge"><i aria-hidden="true">{preset.icon}</i> {preset.kicker}</span>
              <h1 className="pub-title">{project.title}</h1>
              {project.summary && <p className="pub-lead">{project.summary}</p>}
              {cleanBody && <p className="pub-short-note">{cleanBody}</p>}
              {bylineEl}
              {tagsEl}
              {renderLinks(true)}
              {actionsEl}
            </div>
          </article>
        )

      case 'devlog':
        return (
          <article className={`project-hero utility-card pub-hero-devlog is-type-avance${project.coverUrl ? ' has-cover' : ''}`}>
            <div className="pub-devlog-main">
              <div className="pub-stage-head">
                <span className="pub-badge"><i aria-hidden="true">{preset.icon}</i> {preset.kicker}</span>
                {metaValue && <span className="pub-meta-pill pub-meta-highlight">{metaValue}</span>}
              </div>
              <h1 className="pub-title">{project.title}</h1>
              {project.summary && <p className="pub-lead">{project.summary}</p>}
              {progressPct !== null && (
                <div className="pub-progress-box" aria-label={`Progreso ${progressPct}%`}>
                  <div className="pub-progress-head">
                    <span>{metaLabel || 'Progreso del hito'}</span>
                    <b>{progressPct}%</b>
                  </div>
                  <div className="pub-progress-track">
                    <span className="pub-progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              )}
              <div className="pub-stage-footer">
                <div className="pub-stage-meta">
                  {bylineEl}
                  {tagsEl}
                </div>
                <div className="pub-stage-controls">
                  {renderLinks(true)}
                  {actionsEl}
                </div>
              </div>
            </div>
            {project.coverUrl && (
              <figure className="pub-devlog-thumb">
                <img src={project.coverUrl} alt="" />
              </figure>
            )}
          </article>
        )

      case 'resource':
        return (
          <article className={`project-hero utility-card pub-hero-resource is-type-link${project.coverUrl ? ' has-cover' : ''}`}>
            <div className="pub-resource-main">
              <div className="pub-stage-head">
                <span className="pub-badge"><i aria-hidden="true">{preset.icon}</i> {preset.kicker}</span>
                {primaryUrl && <span className="pub-meta-pill pub-host-chip">{hostLabel(primaryUrl)}</span>}
              </div>
              <h1 className="pub-title">{project.title}</h1>
              {project.summary && <p className="pub-lead">{project.summary}</p>}
              {bylineEl}
              {tagsEl}
              <div className="pub-stage-controls">
                {renderLinks(true)}
                {actionsEl}
              </div>
            </div>
            {project.coverUrl && (
              <figure className="pub-devlog-thumb">
                <img src={project.coverUrl} alt="" />
              </figure>
            )}
          </article>
        )

      default:
        // 'app' | 'release' (beta) | 'demo'
        return (
          <article className={`project-hero utility-card is-type-${project.type}`}>
            <figure className="project-cover" style={coverHue}>
              {project.coverUrl ? <img src={project.coverUrl} alt="" /> : emblemArt}
            </figure>

            <div className="project-info">
              <div className="pub-stage-head">
                <span className="pub-badge"><i aria-hidden="true">{preset.icon}</i> {typeLabel.toUpperCase()}</span>
                {project.type === 'beta' && (
                  <span className={`pub-status-dot${primaryUrl ? '' : ' is-upcoming'}`}>
                    {primaryUrl ? 'PRUEBAS ACTIVAS' : 'EN BETA · AÚN NO LANZADO'}
                  </span>
                )}
                {project.type !== 'demo' && metaValue && <span className="pub-meta-pill pub-meta-highlight">{metaValue}</span>}
              </div>
              <h1 className="pub-title">{project.title}</h1>
              {project.summary && <p className="pub-lead">{project.summary}</p>}
              {project.type === 'demo' && metaValue && (
                <div className="pub-spec-strip">
                  <span>{metaLabel || 'Controles'}</span>
                  <b>{metaValue}</b>
                </div>
              )}
              {bylineEl}
              {tagsEl}
              {renderLinks(true)}
              {actionsEl}
            </div>
          </article>
        )
    }
  }

  const isUpcomingBeta = project.type === 'beta' && !primaryUrl
  const showSeparateBody = Boolean(cleanBody) && preset.layout !== 'short'
  const showUpdatesSection = (preset.layout !== 'resource' && !isDemo && !isUpcomingBeta) || isOwner || updates.length > 0

  return (
    <div className="project-page" data-pub-type={project.type}>
      <nav className="crumbs" aria-label="Ruta">
        <Link className="crumb-back" to={backTo}><Icon name="back" /><span>Volver</span></Link>
        <span className="crumb-trail">
          <Link to="/">Inicio</Link><i>/</i><Link to={backTo}>{typeLabel}</Link><i>/</i><b>{project.title}</b>
        </span>
      </nav>

      {renderHero()}

      {showSeparateBody && (
        <section className={`utility-card pub-article${preset.layout === 'article' ? ' pub-prose-card' : ''}`} aria-labelledby="body-heading">
          <div className="utility-heading">
            <div>
              <span className="section-kicker">{isUpcomingBeta ? 'ACERCA DEL PROYECTO' : preset.bodyKicker}</span>
              <h2 id="body-heading">{isUpcomingBeta ? '¿De qué trata?' : preset.bodyHeading}</h2>
            </div>
          </div>
          <div className={`pub-body${preset.layout === 'article' ? ' pub-prose' : ''}`}>{cleanBody}</div>
        </section>
      )}

      {extraGallery.length > 0 && (
        <section className="utility-card pub-article" aria-labelledby="gallery-heading">
          <div className="utility-heading">
            <div><span className="section-kicker">GALERÍA</span><h2 id="gallery-heading">Imágenes y videos</h2></div>
          </div>
          <div className="pub-gallery">
            {extraGallery.map((url) =>
              isVideo(url)
                ? <video key={url} src={url} controls className="pub-media" />
                : <img key={url} src={url} alt="" loading="lazy" className="pub-media" />
            )}
          </div>
        </section>
      )}

      {showUpdatesSection && (
        <section className="utility-card pub-article" aria-labelledby="updates-heading">
          <div className="utility-heading">
            <div><span className="section-kicker">{preset.updatesKicker}</span><h2 id="updates-heading">{preset.updatesHeading}</h2></div>
          </div>
          {isOwner && (
            <form onSubmit={submitUpdate} className="task-entry">
              <input
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder="Cuenta un avance…"
                maxLength={2000}
                aria-label="Nuevo avance"
              />
              <button type="submit" className="icon-button" aria-label="Publicar avance"><Icon name="plus" /></button>
            </form>
          )}
          {error && <p className="form-error">{error}</p>}
          {updates.length === 0 ? (
            <p className="side-empty">Sin avances todavía.</p>
          ) : (
            <div className="update-list">
              {updates.map((u) => (
                <div key={u.id} className="update-item">
                  <time>{new Date(u.createdAt).toLocaleString()}</time>
                  <p>{u.text}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
