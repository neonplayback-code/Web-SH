import { useEffect, useSyncExternalStore } from 'react'
import { CREATOR } from '../config/site'
import { isBackendConfigured, supabase } from './supabase'

export interface SiteLink {
  label: string
  url: string
}

// El perfil público del dueño: se ve en la portada de todas las secciones y solo el dueño lo cambia.
export interface SiteProfile {
  displayName: string
  role: string
  eyebrow: string
  titleLead: string
  titleMain: string
  tagline: string
  note: string
  bio: string
  location: string
  statusText: string
  logoUrl: string
  links: SiteLink[]
  hiddenTabs: string[]
}

// Valores por defecto (los de src/config/site.ts) mientras no hay base de datos o aún no se guardó nada.
export const DEFAULT_PROFILE: SiteProfile = {
  displayName: CREATOR.name,
  role: CREATOR.role,
  eyebrow: CREATOR.eyebrow,
  titleLead: CREATOR.titleLead,
  titleMain: CREATOR.titleMain,
  tagline: CREATOR.tagline,
  note: CREATOR.note,
  bio: '',
  location: '',
  statusText: '',
  logoUrl: CREATOR.logo,
  links: CREATOR.links,
  hiddenTabs: []
}

interface Row {
  display_name: string
  role: string
  eyebrow: string
  title_lead: string
  title_main: string
  tagline: string
  note: string
  bio: string
  location: string
  status_text: string
  logo_url: string | null
  links: unknown
  hidden_tabs: string[] | null
}

function fromRow(r: Row): SiteProfile {
  const links = Array.isArray(r.links)
    ? (r.links as SiteLink[]).filter((l) => l && typeof l.label === 'string' && typeof l.url === 'string')
    : []
  return {
    displayName: r.display_name || DEFAULT_PROFILE.displayName,
    role: r.role,
    eyebrow: r.eyebrow,
    titleLead: r.title_lead,
    titleMain: r.title_main,
    tagline: r.tagline,
    note: r.note,
    bio: r.bio ?? '',
    location: r.location ?? '',
    statusText: r.status_text ?? '',
    logoUrl: r.logo_url || DEFAULT_PROFILE.logoUrl,
    links,
    hiddenTabs: r.hidden_tabs ?? []
  }
}

let state: SiteProfile = DEFAULT_PROFILE
let started = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

async function load() {
  if (!isBackendConfigured) return
  const { data } = await supabase.from('site_profile').select('*').eq('id', 'main').maybeSingle()
  if (data) {
    state = fromRow(data as Row)
    emit()
  }
}

// Solo http(s): lo guardado nunca debe poder abrir otros esquemas (javascript:, data:...).
export function safeHref(url: string): string | null {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null
  } catch {
    return null
  }
}

// Guarda el perfil y lo publica en todas las páginas. Devuelve un mensaje de error o null si salió bien.
export async function saveSiteProfile(next: SiteProfile): Promise<string | null> {
  const links = next.links
    .map((l) => ({ label: l.label.trim().slice(0, 30), url: l.url.trim() }))
    .filter((l) => l.label && safeHref(l.url))
    .slice(0, 8)

  const { error } = await supabase.from('site_profile').upsert({
    id: 'main',
    display_name: next.displayName.trim().slice(0, 60) || DEFAULT_PROFILE.displayName,
    role: next.role.trim().slice(0, 40),
    eyebrow: next.eyebrow.trim().slice(0, 60),
    title_lead: next.titleLead.trim().slice(0, 60),
    title_main: next.titleMain.trim().slice(0, 60),
    tagline: next.tagline.trim().slice(0, 160),
    note: next.note.trim().slice(0, 120),
    bio: next.bio.trim().slice(0, 600),
    location: next.location.trim().slice(0, 60),
    status_text: next.statusText.trim().slice(0, 80),
    logo_url: next.logoUrl && next.logoUrl !== DEFAULT_PROFILE.logoUrl ? next.logoUrl : null,
    links,
    hidden_tabs: next.hiddenTabs,
    updated_at: Date.now()
  })
  if (error) {
    return error.message.toLowerCase().includes('site_profile')
      ? 'Falta ejecutar el SQL del perfil (supabase/4-perfil.sql) en Supabase.'
      : error.message
  }
  state = { ...next, links }
  emit()
  return null
}

export function useSiteProfile(): SiteProfile {
  useEffect(() => {
    if (started) return
    started = true
    void load()
  }, [])
  return useSyncExternalStore(subscribe, () => state)
}
