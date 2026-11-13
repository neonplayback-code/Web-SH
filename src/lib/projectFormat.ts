import type { ProjectType } from '../types'

export type DetailLayout =
  | 'app'
  | 'video'
  | 'bulletin'
  | 'article'
  | 'release'
  | 'demo'
  | 'devlog'
  | 'resource'
  | 'short'

export interface DetailPreset {
  layout: DetailLayout
  icon: string
  kicker: string
  ctaLabel: string
  bodyKicker: string
  bodyHeading: string
  updatesKicker: string
  updatesHeading: string
}

export const DETAIL_PRESETS: Record<ProjectType, DetailPreset> = {
  anuncio: {
    layout: 'bulletin',
    icon: '✦',
    kicker: 'COMUNICADO OFICIAL',
    ctaLabel: 'Abrir enlace del aviso',
    bodyKicker: 'COMUNICADO',
    bodyHeading: 'Detalles del aviso',
    updatesKicker: 'SEGUIMIENTO',
    updatesHeading: 'Notas adicionales',
  },
  post: {
    layout: 'article',
    icon: '✎',
    kicker: 'ARTÍCULO EDITORIAL',
    ctaLabel: 'Enlace relacionado',
    bodyKicker: 'LECTURA',
    bodyHeading: 'Artículo completo',
    updatesKicker: 'FE DE ERRATAS Y NOTAS',
    updatesHeading: 'Actualizaciones',
  },
  video: {
    layout: 'video',
    icon: '▶',
    kicker: 'VIDEO',
    ctaLabel: 'Ver video completo',
    bodyKicker: 'CAPÍTULOS Y NOTAS',
    bodyHeading: 'Descripción del video',
    updatesKicker: 'LÍNEA DE TIEMPO',
    updatesHeading: 'Avances',
  },
  short: {
    layout: 'short',
    icon: '✧',
    kicker: 'SHORT VERTICAL',
    ctaLabel: 'Abrir clip',
    bodyKicker: 'CLIP',
    bodyHeading: 'Sobre este short',
    updatesKicker: 'LÍNEA DE TIEMPO',
    updatesHeading: 'Avances',
  },
  beta: {
    layout: 'release',
    icon: '⚗',
    kicker: 'LABORATORIO BETA',
    ctaLabel: 'Probar esta beta',
    bodyKicker: 'INSTRUCCIONES DE PRUEBA',
    bodyHeading: 'Qué probar y feedback',
    updatesKicker: 'CHANGELOG',
    updatesHeading: 'Historial de builds',
  },
  demo: {
    layout: 'demo',
    icon: '◆',
    kicker: 'DEMO INTERACTIVA',
    ctaLabel: 'Lanzar demo',
    bodyKicker: 'GUÍA RÁPIDA',
    bodyHeading: 'Cómo jugar o probar',
    updatesKicker: 'LÍNEA DE TIEMPO',
    updatesHeading: 'Avances',
  },
  avance: {
    layout: 'devlog',
    icon: '⚡',
    kicker: 'BITÁCORA DE AVANCE',
    ctaLabel: 'Ver referencia',
    bodyKicker: 'DEVLOG',
    bodyHeading: 'Notas de desarrollo',
    updatesKicker: 'SEGUIMIENTO',
    updatesHeading: 'Hitos relacionados',
  },
  link: {
    layout: 'resource',
    icon: '↗',
    kicker: 'RECURSO RECOMENDADO',
    ctaLabel: 'Abrir recurso',
    bodyKicker: 'CONTEXTO',
    bodyHeading: 'Por qué vale la pena',
    updatesKicker: 'NOTAS',
    updatesHeading: 'Avances',
  },
  app: {
    layout: 'app',
    icon: '◈',
    kicker: 'PROYECTO Y SOFTWARE',
    ctaLabel: 'Abrir / Descargar',
    bodyKicker: 'FICHA TÉCNICA',
    bodyHeading: 'Características y notas',
    updatesKicker: 'CHANGELOG',
    updatesHeading: 'Avances',
  },
}

const KNOWN_META_LABELS = [
  'Versión y plataforma',
  'Duración o resolución',
  'Fecha o etiqueta del aviso',
  'Versión beta',
  'Controles o requisitos',
  'Hito o progreso',
]

export interface ExtractedFormatMeta {
  metaLabel: string | null
  metaValue: string | null
  progressPct: number | null
  cleanBody: string
}

/**
 * Separa la línea inicial de metadatos generada por el estudio de publicación
 * para mostrarla como insignia/barra destacada en la cabecera en lugar de texto plano.
 */
export function extractFormatMeta(body: string): ExtractedFormatMeta {
  const trimmed = body.trim()
  if (!trimmed) return { metaLabel: null, metaValue: null, progressPct: null, cleanBody: '' }

  const lines = trimmed.split('\n')
  const first = lines[0]?.trim() ?? ''
  const matched = KNOWN_META_LABELS.find((label) => first.startsWith(`${label}:`))
  if (!matched) return { metaLabel: null, metaValue: null, progressPct: null, cleanBody: trimmed }

  const value = first.slice(matched.length + 1).trim()
  const rest = lines.slice(1).join('\n').trim()
  const pctMatch = value.match(/(\d{1,3})\s*%/)
  const rawPct = pctMatch ? Number(pctMatch[1]) : NaN
  const progressPct = Number.isFinite(rawPct) ? Math.min(100, Math.max(0, rawPct)) : null

  return {
    metaLabel: matched,
    metaValue: value || null,
    progressPct,
    cleanBody: rest,
  }
}

export function estimateReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 180))
}

export function hostLabel(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '')
}

export function parseVideoEmbed(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0]
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v')
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
      }
      const parts = u.pathname.split('/').filter(Boolean)
      if ((parts[0] === 'shorts' || parts[0] === 'embed') && parts[1]) {
        return `https://www.youtube-nocookie.com/embed/${parts[1]}`
      }
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0]
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null
    }
    return null
  } catch {
    return null
  }
}
