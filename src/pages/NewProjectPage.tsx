import { useEffect, useMemo, useState, type DragEvent, type FormEvent, type KeyboardEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { isBackendConfigured, supabase } from '../lib/supabase'
import { useCurrentUser } from '../lib/useCurrentUser'
import { Notice } from '../components/Notice'
import { Icon } from '../components/Icon'
import { PROJECT_TYPES, PROJECT_TYPE_LABELS, type ProjectType } from '../types'

// Límites espejados de storage para validar antes de subir.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_VIDEO_BYTES = 100 * 1024 * 1024
const MAX_MEDIA = 6
const DRAFT_KEY = 'od_pub_studio_draft'

interface FormatSpec {
  icon: string
  tagline: string
  ctaLabel: string
  titleLabel: string
  titlePlaceholder: string
  summaryLabel?: string
  summaryPlaceholder?: string
  bodyLabel?: string
  bodyPlaceholder?: string
  primaryLinkLabel?: string
  primaryLinkPlaceholder?: string
  primaryLinkRequired?: boolean
  extraLabel?: string
  extraPlaceholder?: string
  coverLabel?: string
  mediaLabel?: string
  mediaAccept?: string
  suggestedTags: string[]
  showBody: boolean
  showSummary: boolean
  showCover: boolean
  showMedia: boolean
  showExtraLinks: boolean
}

const FORMATS: Record<ProjectType, FormatSpec> = {
  app: {
    icon: '◈',
    tagline: 'Software, juego o herramienta lista para descargar o probar.',
    ctaLabel: 'Descargar / Abrir',
    titleLabel: 'Nombre del proyecto',
    titlePlaceholder: 'Ej. Overdrive Box Engine',
    summaryLabel: 'Resumen corto',
    summaryPlaceholder: 'Qué hace y por qué destaca en una línea.',
    extraLabel: 'Versión y plataforma',
    extraPlaceholder: 'Ej. v1.2.0 · Windows / Web',
    primaryLinkLabel: 'Enlace de descarga o repositorio',
    primaryLinkPlaceholder: 'https://github.com/... o https://...',
    bodyLabel: 'Características y notas técnicas',
    bodyPlaceholder: 'Describe funciones principales, requisitos o novedades de esta versión…',
    coverLabel: 'Portada del proyecto',
    mediaLabel: 'Capturas o video demo',
    mediaAccept: 'image/*,video/*',
    suggestedTags: ['app', 'web', 'herramienta', 'release'],
    showBody: true, showSummary: true, showCover: true, showMedia: true, showExtraLinks: true,
  },
  video: {
    icon: '▶',
    tagline: 'Video directo o enlace de YouTube/Vimeo con miniatura.',
    ctaLabel: 'Ver video',
    titleLabel: 'Título del video',
    titlePlaceholder: 'Ej. Cómo diseñé el nuevo motor espacial',
    primaryLinkLabel: 'Enlace de YouTube / Vimeo (si no subes archivo)',
    primaryLinkPlaceholder: 'https://youtube.com/watch?v=...',
    extraLabel: 'Duración o resolución',
    extraPlaceholder: 'Ej. 06:40 · 4K 60fps',
    summaryLabel: 'Gancho corto (se ve en la tarjeta)',
    summaryPlaceholder: 'De qué trata el video en pocas palabras.',
    bodyLabel: 'Descripción y marcas de tiempo',
    bodyPlaceholder: 'Capítulos, enlaces mencionados o notas del video…',
    coverLabel: 'Miniatura / Thumbnail',
    mediaLabel: 'Archivo de video (máx. 100 MB)',
    mediaAccept: 'video/*',
    suggestedTags: ['video', 'devlog', 'tutorial', '4k'],
    showBody: true, showSummary: true, showCover: true, showMedia: true, showExtraLinks: false,
  },
  anuncio: {
    icon: '✦',
    tagline: 'Comunicado destacado, lanzamiento o aviso importante.',
    ctaLabel: 'Ver anuncio',
    titleLabel: 'Titular del anuncio',
    titlePlaceholder: 'Ej. Nueva actualización disponible este viernes',
    extraLabel: 'Fecha o etiqueta del aviso',
    extraPlaceholder: 'Ej. Importante · 15 Nov',
    summaryLabel: 'Mensaje principal',
    summaryPlaceholder: 'Lo más importante que todos deben saber.',
    bodyLabel: 'Detalles del comunicado',
    bodyPlaceholder: 'Explica el contexto, horarios o cambios clave…',
    primaryLinkLabel: 'Enlace relacionado (opcional)',
    primaryLinkPlaceholder: 'https://...',
    coverLabel: 'Banner del anuncio',
    suggestedTags: ['anuncio', 'novedad', 'evento', 'aviso'],
    showBody: true, showSummary: true, showCover: true, showMedia: false, showExtraLinks: false,
  },
  post: {
    icon: '✎',
    tagline: 'Artículo completo, reflexión o guía paso a paso.',
    ctaLabel: 'Leer artículo',
    titleLabel: 'Título del artículo',
    titlePlaceholder: 'Ej. Por qué elegimos WebGL puro para el fondo',
    summaryLabel: 'Subtítulo / Bajada',
    summaryPlaceholder: 'Una frase que invite a leer el post completo.',
    bodyLabel: 'Contenido del artículo',
    bodyPlaceholder: 'Escribe tu artículo con claridad y detalle…',
    coverLabel: 'Imagen de cabecera',
    mediaLabel: 'Imágenes de apoyo',
    mediaAccept: 'image/*',
    suggestedTags: ['post', 'guía', 'diseño', 'arquitectura'],
    showBody: true, showSummary: true, showCover: true, showMedia: true, showExtraLinks: true,
  },
  beta: {
    icon: '⚗',
    tagline: 'Versión temprana para probar funciones y recoger feedback.',
    ctaLabel: 'Probar beta',
    titleLabel: 'Nombre de la beta',
    titlePlaceholder: 'Ej. Editor de niveles v0.4 Beta',
    extraLabel: 'Versión beta',
    extraPlaceholder: 'Ej. v0.4.0-beta.2',
    primaryLinkLabel: 'Enlace para probar o descargar la beta',
    primaryLinkPlaceholder: 'https://...',
    summaryLabel: 'Qué incluye esta prueba',
    summaryPlaceholder: 'Resumen de lo nuevo en esta build.',
    bodyLabel: 'Instrucciones y qué feedback buscas',
    bodyPlaceholder: 'Qué deben probar, errores conocidos y cómo reportar…',
    coverLabel: 'Portada de la beta',
    mediaLabel: 'Capturas de la build',
    mediaAccept: 'image/*,video/*',
    suggestedTags: ['beta', 'testing', 'feedback', 'early'],
    showBody: true, showSummary: true, showCover: true, showMedia: true, showExtraLinks: true,
  },
  demo: {
    icon: '◆',
    tagline: 'Demo jugable o interactiva lista para probar.',
    ctaLabel: 'Probar demo',
    titleLabel: 'Título de la demo',
    titlePlaceholder: 'Ej. Demo interactiva del sistema de partículas',
    primaryLinkLabel: 'URL para jugar / probar la demo',
    primaryLinkPlaceholder: 'https://...',
    extraLabel: 'Controles o requisitos',
    extraPlaceholder: 'Ej. Navegador moderno · Teclado y mouse',
    summaryLabel: 'Qué se puede probar',
    summaryPlaceholder: 'Describe la experiencia de la demo.',
    bodyLabel: 'Guía rápida de la demo',
    bodyPlaceholder: 'Atajos, controles o detalles técnicos…',
    coverLabel: 'Portada de la demo',
    mediaLabel: 'Capturas o clip de gameplay',
    mediaAccept: 'image/*,video/*',
    suggestedTags: ['demo', 'interactivo', 'webgl', 'juego'],
    showBody: true, showSummary: true, showCover: true, showMedia: true, showExtraLinks: false,
  },
  avance: {
    icon: '⚡',
    tagline: 'Progreso rápido de lo que estás construyendo hoy.',
    ctaLabel: 'Ver progreso',
    titleLabel: 'Qué avanzaste hoy',
    titlePlaceholder: 'Ej. Nuevo shader de nebulosas en 4K',
    extraLabel: 'Hito o progreso',
    extraPlaceholder: 'Ej. 80% · Pulido visual',
    summaryLabel: 'Resumen rápido',
    summaryPlaceholder: 'Qué cambió respecto al avance anterior.',
    bodyLabel: 'Notas de desarrollo (devlog)',
    bodyPlaceholder: 'Qué funcionó, qué sigue y próximos pasos…',
    coverLabel: 'Captura principal (opcional)',
    mediaLabel: 'Capturas o clips del progreso',
    mediaAccept: 'image/*,video/*',
    suggestedTags: ['avance', 'wip', 'devlog', 'progreso'],
    showBody: true, showSummary: true, showCover: true, showMedia: true, showExtraLinks: false,
  },
  link: {
    icon: '↗',
    tagline: 'Comparte un recurso, herramienta o enlace externo recomendado.',
    ctaLabel: 'Abrir recurso',
    titleLabel: 'Título del enlace',
    titlePlaceholder: 'Ej. Colección de shaders procedurales GLSL',
    primaryLinkLabel: 'URL del recurso (obligatorio)',
    primaryLinkPlaceholder: 'https://...',
    primaryLinkRequired: true,
    summaryLabel: 'Por qué vale la pena',
    summaryPlaceholder: 'Explica brevemente qué encontrarán al abrirlo.',
    coverLabel: 'Vista previa / imagen (opcional)',
    suggestedTags: ['recurso', 'link', 'referencia', 'tool'],
    showBody: false, showSummary: true, showCover: true, showMedia: false, showExtraLinks: false,
  },
  short: {
    icon: '✧',
    tagline: 'Publicación relámpago: una idea o captura al instante.',
    ctaLabel: 'Ver short',
    titleLabel: 'Frase o título corto',
    titlePlaceholder: 'Ej. Probando luces nuevas en el mapa estelar',
    coverLabel: 'Imagen principal',
    mediaLabel: 'Clip corto o imagen extra',
    mediaAccept: 'image/*,video/*',
    suggestedTags: ['short', 'clip', 'captura', 'flash'],
    showBody: false, showSummary: false, showCover: true, showMedia: true, showExtraLinks: false,
  },
}

interface LocalDraft {
  type?: ProjectType
  title?: string
  summary?: string
  body?: string
  extraMeta?: string
  primaryLink?: string
  linksRaw?: string
  tags?: string[]
}

function loadDraft(): LocalDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as LocalDraft) : {}
  } catch {
    return {}
  }
}

function validateFile(file: File, accept = 'image/*,video/*'): string | null {
  const onlyVideo = accept === 'video/*'
  const onlyImage = accept === 'image/*'
  if (file.type.startsWith('image/')) {
    if (onlyVideo) return `${file.name}: este formato espera un archivo de video.`
    return file.size > MAX_IMAGE_BYTES ? `${file.name}: la imagen supera 5 MB.` : null
  }
  if (file.type.startsWith('video/')) {
    if (onlyImage) return `${file.name}: este formato solo permite imágenes aquí.`
    return file.size > MAX_VIDEO_BYTES ? `${file.name}: el video supera 100 MB.` : null
  }
  return `${file.name}: formato no compatible (usa imagen o video).`
}

function storageName(name: string): string {
  return `${Date.now()}-${name.replace(/[^\w.-]+/g, '_')}`
}

function parseLinks(raw: string): string[] | null {
  const items = raw.split(/\s+/).map((s) => s.trim()).filter(Boolean)
  for (const item of items) {
    try {
      const url = new URL(item)
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    } catch {
      return null
    }
  }
  return items
}

function formatHost(rawUrl: string): string {
  try {
    return new URL(rawUrl.trim()).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

interface MediaItem {
  file: File
  url: string
  isVideo: boolean
}

// Publicador profesional adaptativo con drag & drop, vista previa por formato, etiquetas interactivas y autoguardado.
export function NewProjectPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, profile, isOwner, loading } = useCurrentUser()

  const saved = useMemo(loadDraft, [])
  const paramType = PROJECT_TYPES.find((t) => t === params.get('tipo'))
  const [type, setType] = useState<ProjectType>(paramType ?? (saved.type && PROJECT_TYPES.includes(saved.type) ? saved.type : 'post'))
  const [title, setTitle] = useState(saved.title ?? '')
  const [summary, setSummary] = useState(saved.summary ?? '')
  const [body, setBody] = useState(saved.body ?? '')
  const [extraMeta, setExtraMeta] = useState(saved.extraMeta ?? '')
  const [primaryLink, setPrimaryLink] = useState(saved.primaryLink ?? '')
  const [linksRaw, setLinksRaw] = useState(saved.linksRaw ?? '')
  const [tags, setTags] = useState<string[]>(Array.isArray(saved.tags) ? saved.tags : [])
  const [tagDraft, setTagDraft] = useState('')
  const [cover, setCover] = useState<File | null>(null)
  const [media, setMedia] = useState<File[]>([])
  const [dragZone, setDragZone] = useState<'cover' | 'media' | null>(null)
  const [error, setError] = useState('')
  const [statusMsg, setStatusMsg] = useState('')

  const spec = FORMATS[type]
  const busy = Boolean(statusMsg)

  // Autoguardado local continuo para no perder texto al recargar.
  useEffect(() => {
    try {
      const payload: LocalDraft = { type, title, summary, body, extraMeta, primaryLink, linksRaw, tags }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
    } catch {
      /* ignore quota errors */
    }
  }, [type, title, summary, body, extraMeta, primaryLink, linksRaw, tags])

  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : ''), [cover])
  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview) }, [coverPreview])

  const mediaPreviews: MediaItem[] = useMemo(
    () => media.map((file) => ({ file, url: URL.createObjectURL(file), isVideo: file.type.startsWith('video/') })),
    [media],
  )
  useEffect(() => () => mediaPreviews.forEach((m) => URL.revokeObjectURL(m.url)), [mediaPreviews])

  if (!isBackendConfigured) {
    return <Notice>Publicar requiere Supabase configurado. Sigue los pasos de <code>SETUP.md</code>.</Notice>
  }
  if (loading) return <Notice>Cargando…</Notice>
  if (!user || !profile) return <Navigate to="/entrar?next=/nuevo" replace />
  // Publicar es solo del dueño: cualquier otra cuenta solo ve y da ♥ (el servidor también lo impide).
  if (!isOwner) return <Notice>Solo el dueño de esta web publica aquí. Tú puedes ver todo y dar ♥ a lo que te guste.</Notice>

  const pickCover = (files: FileList | null) => {
    const file = files?.[0] ?? null
    if (!file) return
    const problem = validateFile(file, 'image/*')
    setError(problem ?? '')
    if (!problem) setCover(file)
  }

  const appendMedia = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const incoming = Array.from(files)
    const problem = incoming.map((f) => validateFile(f, spec.mediaAccept)).find(Boolean)
    if (problem) return setError(problem)
    setError('')
    setMedia((prev) => [...prev, ...incoming].slice(0, MAX_MEDIA))
  }

  const onDropZone = (zone: 'cover' | 'media') => (e: DragEvent) => {
    e.preventDefault()
    setDragZone(null)
    if (zone === 'cover') pickCover(e.dataTransfer.files)
    else appendMedia(e.dataTransfer.files)
  }

  const addTag = (raw: string) => {
    const clean = raw.replace(/^#+/, '').trim().toLowerCase()
    if (!clean) return
    setTags((prev) => (prev.includes(clean) || prev.length >= 8 ? prev : [...prev, clean]))
  }

  const onTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      tagDraft.split(',').forEach(addTag)
      setTagDraft('')
    } else if (e.key === 'Backspace' && !tagDraft && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  const clearAll = () => {
    setTitle('')
    setSummary('')
    setBody('')
    setExtraMeta('')
    setPrimaryLink('')
    setLinksRaw('')
    setTags([])
    setTagDraft('')
    setCover(null)
    setMedia([])
    setError('')
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
  }

  const submit = async (asDraft: boolean) => {
    setError('')
    const cleanTitle = title.trim()
    if (!cleanTitle) return setError('Ponle un título a tu publicación.')

    const combinedLinks = [primaryLink.trim(), ...(spec.showExtraLinks ? [linksRaw.trim()] : [])]
      .filter(Boolean)
      .join(' ')
    const links = parseLinks(combinedLinks)
    if (!links) return setError('Todos los enlaces deben empezar por http:// o https://')
    if (spec.primaryLinkRequired && !primaryLink.trim()) {
      return setError('Este formato necesita una URL principal válida.')
    }
    if (cover) {
      const problem = validateFile(cover, 'image/*')
      if (problem) return setError(problem)
    }

    const pendingTag = tagDraft.replace(/^#+/, '').trim().toLowerCase()
    const finalTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag].slice(0, 8) : tags

    const cleanExtra = extraMeta.trim()
    const finalSummary = (spec.showSummary ? summary.trim() : '') || cleanExtra
    const metaHeader = cleanExtra && spec.extraLabel ? `${spec.extraLabel}: ${cleanExtra}` : ''
    const rawBody = spec.showBody ? body.trim() : ''
    const finalBody = [metaHeader, rawBody].filter(Boolean).join('\n\n')

    setStatusMsg('Preparando publicación…')
    try {
      const projectId = crypto.randomUUID()
      const folder = `users/${user.id}/projects/${projectId}`
      const bucket = supabase.storage.from('media')

      const upload = async (file: File, name: string) => {
        const path = `${folder}/${storageName(name)}`
        const { error: upErr } = await bucket.upload(path, file, { contentType: file.type })
        if (upErr) throw new Error(upErr.message)
        return bucket.getPublicUrl(path).data.publicUrl
      }

      let coverUrl: string | null = null
      if (cover) {
        setStatusMsg('Subiendo portada…')
        coverUrl = await upload(cover, `cover-${cover.name}`)
      }

      const mediaUrls: string[] = []
      if (spec.showMedia && media.length > 0) {
        for (let i = 0; i < media.length; i++) {
          setStatusMsg(`Subiendo archivo ${i + 1} de ${media.length}…`)
          mediaUrls.push(await upload(media[i], media[i].name))
        }
      }

      setStatusMsg(asDraft ? 'Guardando borrador…' : 'Publicando…')
      const now = Date.now()
      const { error: insErr } = await supabase.from('projects').insert({
        id: projectId,
        type,
        title: cleanTitle.slice(0, 120),
        summary: finalSummary.slice(0, 300),
        body: finalBody.slice(0, 20000),
        cover_url: coverUrl,
        media_urls: mediaUrls,
        links,
        tags: finalTags,
        author_id: user.id,
        author_username: profile.username,
        status: asDraft ? 'draft' : 'published',
        created_at: now,
        updated_at: now,
        views: 0,
        likes: 0,
      })
      if (insErr) throw new Error(insErr.message)
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      navigate(`/p/${projectId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setStatusMsg('')
    }
  }

  const host = formatHost(primaryLink)
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0
  const readMinutes = Math.max(1, Math.round(wordCount / 180))
  const firstVideoPreview = mediaPreviews.find((m) => m.isVideo)

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        submit(false)
      }}
      className={`utility-card pub-studio is-type-${type}`}
    >
      <div className="pub-studio-top">
        <div>
          <span className="section-kicker">ESTUDIO DE PUBLICACIÓN · @{profile.username}</span>
          <h2>{spec.icon} {PROJECT_TYPE_LABELS[type]}</h2>
          <p className="pub-studio-sub">{spec.tagline}</p>
        </div>
        <div className="pub-studio-meta">
          <span className="pub-autosave" title="Tu texto se guarda automáticamente en este navegador">
            ● Autoguardado local
          </span>
          {(title || summary || body || extraMeta || primaryLink || tags.length > 0 || cover || media.length > 0) && (
            <button type="button" className="ghost-button pub-clear-btn" onClick={clearAll} disabled={busy}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="pub-type-grid" role="group" aria-label="Tipo de publicación">
        {PROJECT_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={type === t}
            onClick={() => { setType(t); setError('') }}
            className={`launcher-pill pub-type-btn${type === t ? ' is-active' : ''}`}
          >
            <span aria-hidden="true">{FORMATS[t].icon}</span>
            <span>{PROJECT_TYPE_LABELS[t]}</span>
          </button>
        ))}
      </div>

      <div className="pub-studio-grid">
        <div className="pub-fields">
          <label className="pub-field">
            <span className="pub-field-head">
              <span>{spec.titleLabel}</span>
              <small>{title.length}/120</small>
            </span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={spec.titlePlaceholder} maxLength={120} required />
          </label>

          {(spec.extraLabel || spec.primaryLinkLabel) && (
            <div className="pub-row-2">
              {spec.extraLabel && (
                <label className="pub-field">
                  <span className="pub-field-head"><span>{spec.extraLabel}</span></span>
                  <input value={extraMeta} onChange={(e) => setExtraMeta(e.target.value)} placeholder={spec.extraPlaceholder} maxLength={80} />
                </label>
              )}
              {spec.primaryLinkLabel && (
                <label className="pub-field">
                  <span className="pub-field-head">
                    <span>{spec.primaryLinkLabel}</span>
                    {host && <small className="pub-host-pill">{host}</small>}
                  </span>
                  <input
                    type="url"
                    value={primaryLink}
                    onChange={(e) => setPrimaryLink(e.target.value)}
                    placeholder={spec.primaryLinkPlaceholder}
                    required={spec.primaryLinkRequired}
                  />
                </label>
              )}
            </div>
          )}

          {spec.showSummary && (
            <label className="pub-field">
              <span className="pub-field-head">
                <span>{spec.summaryLabel}</span>
                <small>{summary.length}/300</small>
              </span>
              <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={spec.summaryPlaceholder} maxLength={300} />
            </label>
          )}

          {spec.showBody && (
            <label className="pub-field">
              <span className="pub-field-head">
                <span>{spec.bodyLabel}</span>
                <small>{wordCount > 0 ? `${wordCount} palabras` : `máx. 20,000`}</small>
              </span>
              <textarea
                rows={type === 'post' ? 7 : 4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={spec.bodyPlaceholder}
                maxLength={20000}
              />
            </label>
          )}

          <div className="pub-media-grid">
            {spec.showCover && (
              <div
                className={`pub-drop${dragZone === 'cover' ? ' is-drag' : ''}${cover ? ' has-file' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragZone('cover') }}
                onDragLeave={() => setDragZone((z) => (z === 'cover' ? null : z))}
                onDrop={onDropZone('cover')}
              >
                <span className="pub-drop-title">{spec.coverLabel} <small>(máx. 5 MB)</small></span>
                {coverPreview ? (
                  <div className="pub-drop-preview">
                    <img src={coverPreview} alt="" />
                    <div className="pub-drop-info">
                      <b>{cover?.name}</b>
                      <small>{cover ? formatBytes(cover.size) : ''}</small>
                    </div>
                    <button type="button" className="icon-button pub-mini-x" aria-label="Quitar portada" onClick={() => setCover(null)}>
                      <Icon name="close" />
                    </button>
                  </div>
                ) : (
                  <label className="pub-drop-trigger">
                    <input type="file" accept="image/*" onChange={(e) => pickCover(e.target.files)} />
                    <span>Arrastra una imagen aquí o haz clic para elegir</span>
                  </label>
                )}
              </div>
            )}

            {spec.showMedia && (
              <div
                className={`pub-drop${dragZone === 'media' ? ' is-drag' : ''}${media.length > 0 ? ' has-file' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragZone('media') }}
                onDragLeave={() => setDragZone((z) => (z === 'media' ? null : z))}
                onDrop={onDropZone('media')}
              >
                <span className="pub-drop-title">{spec.mediaLabel} <small>({media.length}/{MAX_MEDIA})</small></span>
                {media.length < MAX_MEDIA && (
                  <label className="pub-drop-trigger">
                    <input type="file" multiple accept={spec.mediaAccept} onChange={(e) => { appendMedia(e.target.files); e.target.value = '' }} />
                    <span>{media.length > 0 ? '+ Añadir más archivos' : 'Arrastra archivos aquí o haz clic'}</span>
                  </label>
                )}
                {mediaPreviews.length > 0 && (
                  <div className="pub-thumbs">
                    {mediaPreviews.map((m, idx) => (
                      <div key={m.url} className="pub-thumb">
                        {m.isVideo ? <video src={m.url} muted playsInline /> : <img src={m.url} alt="" />}
                        <button
                          type="button"
                          className="icon-button pub-mini-x"
                          aria-label={`Quitar ${m.file.name}`}
                          onClick={() => setMedia((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <Icon name="close" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {spec.showExtraLinks && (
            <label className="pub-field">
              <span className="pub-field-head"><span>Enlaces adicionales (separados por espacios)</span></span>
              <input value={linksRaw} onChange={(e) => setLinksRaw(e.target.value)} placeholder="https://..." />
            </label>
          )}

          <div className="pub-field">
            <span className="pub-field-head">
              <span>Etiquetas</span>
              <small>{tags.length}/8 · Enter o coma</small>
            </span>
            <div className="pub-tag-box">
              {tags.map((tg) => (
                <button key={tg} type="button" className="ghost-button pub-tag-chip" onClick={() => setTags((p) => p.filter((x) => x !== tg))}>
                  <span>#{tg}</span>
                  <Icon name="close" />
                </button>
              ))}
              {tags.length < 8 && (
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={onTagKeyDown}
                  onBlur={() => { if (tagDraft.trim()) { tagDraft.split(',').forEach(addTag); setTagDraft('') } }}
                  placeholder={tags.length === 0 ? 'Escribe un tag y pulsa Enter…' : 'Añadir…'}
                />
              )}
            </div>
            <div className="pub-suggest-row">
              <span>Sugeridos:</span>
              {spec.suggestedTags.filter((s) => !tags.includes(s)).map((s) => (
                <button key={s} type="button" className="ghost-button pub-suggest-btn" onClick={() => addTag(s)}>
                  + #{s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="pub-preview-col" aria-label="Vista previa en vivo">
          <span className="pub-preview-kicker">Vista previa · Formato {PROJECT_TYPE_LABELS[type]}</span>
          <div className={`pub-preview-card is-format-${type}`}>
            <div className="pub-preview-cover">
              {coverPreview ? (
                <img src={coverPreview} alt="" />
              ) : firstVideoPreview ? (
                <video src={firstVideoPreview.url} muted loop playsInline autoPlay />
              ) : (
                <div className="pub-preview-placeholder">
                  <span>{spec.icon}</span>
                  <small>{PROJECT_TYPE_LABELS[type]}</small>
                </div>
              )}
              <span className="pub-preview-badge">{spec.icon} {PROJECT_TYPE_LABELS[type]}</span>
              {extraMeta.trim() && (
                <span className="pub-preview-extra">{extraMeta.trim()}</span>
              )}
              {(type === 'video' || type === 'short') && (
                <span className="pub-preview-play" aria-hidden="true">▶</span>
              )}
            </div>
            <div className="pub-preview-body">
              <strong>{title.trim() || spec.titlePlaceholder.replace(/^Ej\.\s*/i, '')}</strong>
              {spec.showSummary && (summary.trim() || spec.summaryPlaceholder) && (
                <p>{summary.trim() || spec.summaryPlaceholder}</p>
              )}
              {type === 'post' && wordCount > 0 && (
                <span className="pub-preview-meta">📖 ~{readMinutes} min de lectura</span>
              )}
              {primaryLink.trim() && (
                <span className="pub-preview-link">
                  <Icon name="external" /> {host || primaryLink.trim()} · {spec.ctaLabel}
                </span>
              )}
              {mediaPreviews.length > 0 && (
                <div className="pub-preview-strip">
                  {mediaPreviews.slice(0, 4).map((m) => (
                    <span key={m.url} className="pub-preview-dot">
                      {m.isVideo ? '🎬' : <img src={m.url} alt="" />}
                    </span>
                  ))}
                  {mediaPreviews.length > 4 && <small>+{mediaPreviews.length - 4}</small>}
                </div>
              )}
              {tags.length > 0 && (
                <div className="pub-preview-tags">
                  {tags.map((tg) => <i key={tg}>#{tg}</i>)}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="form-actions pub-actions">
        <button type="button" className="ghost-button" disabled={busy} onClick={() => submit(true)}>
          Guardar borrador
        </button>
        <button type="submit" disabled={busy} className="save-button">
          {busy ? statusMsg : `Publicar ${PROJECT_TYPE_LABELS[type].toLowerCase()}`}
        </button>
      </div>
    </form>
  )
}
