import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { isBackendConfigured, supabase } from './supabase'
import { betaCatalogProjects } from './betaCatalog'
import { demoEnabled, demoProjects } from './demoProjects'
import { PROJECT_LIST_SELECT, toProject, type ProjectRow } from './projects'
import type { Project } from '../types'

interface Feed {
  remote: Project[]
  loading: boolean
  loadingMore: boolean
  error: string
  // Cuántas publicaciones publicadas hay en total (la lista se pide por tandas de PAGE).
  total: number | null
}

const PAGE = 100

// Una sola lista y un solo canal de tiempo real para toda la web, aunque varias páginas la usen.
let state: Feed = { remote: [], loading: isBackendConfigured, loadingMore: false, error: '', total: null }
const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
const set = (patch: Partial<Feed>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

async function load() {
  // Se vuelve a pedir lo que ya se había cargado (si ya se pidieron varias tandas), no solo la primera.
  const upTo = Math.max(PAGE, state.remote.length)
  const { data, error, count } = await supabase
    .from('projects')
    .select(PROJECT_LIST_SELECT, { count: 'exact' })
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(0, upTo - 1)
  // Si ya había una lista, un fallo puntual de red no la borra: se sigue mostrando la última buena.
  if (error) set({ error: state.remote.length > 0 ? '' : error.message, loading: false })
  else set({ remote: ((data ?? []) as ProjectRow[]).map(toProject), error: '', loading: false, total: count ?? state.total })
}

// Pide la siguiente tanda de publicaciones y la añade al final.
export async function loadMoreProjects() {
  if (state.loadingMore || state.total === null || state.remote.length >= state.total) return
  set({ loadingMore: true })
  const from = state.remote.length
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_LIST_SELECT)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(from, from + PAGE - 1)
  if (error) return set({ loadingMore: false })
  const known = new Set(state.remote.map((p) => p.id))
  const added = ((data ?? []) as ProjectRow[]).map(toProject).filter((p) => !known.has(p.id))
  set({ remote: [...state.remote, ...added], loadingMore: false })
}

let users = 0
let channel: ReturnType<typeof supabase.channel> | null = null
let timer = 0

// Cada like de cualquiera cambia una fila: se agrupan los avisos para no pedir 100 filas por cada uno.
const reloadSoon = () => {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => void load(), 1200)
}

function start() {
  if (users++ > 0) return
  void load()
  channel = supabase
    .channel('feed-projects')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, reloadSoon)
    .subscribe()
}

function stop() {
  if (--users > 0) return
  window.clearTimeout(timer)
  if (channel) void supabase.removeChannel(channel)
  channel = null
}

// Publicaciones publicadas, de la más reciente a la más antigua, en tiempo real.
export function useProjects() {
  // ?demo (solo en desarrollo) muestra datos de ejemplo.
  const demo = demoEnabled()
  const feed = useSyncExternalStore(subscribe, () => state)

  useEffect(() => {
    if (!isBackendConfigured || demo) return
    start()
    return stop
  }, [demo])

  const projects = useMemo<Project[]>(() => {
    if (demo) return demoProjects()
    // Sin base de datos, o con la base vacía, se muestra el catálogo de presentación (sin números inventados).
    if (!isBackendConfigured) return betaCatalogProjects()
    if (feed.loading || feed.error) return []
    return feed.remote.length > 0 ? feed.remote : betaCatalogProjects()
  }, [demo, feed])

  const hasMore = !demo && feed.total !== null && feed.remote.length < feed.total
  return {
    projects,
    loading: !demo && feed.loading,
    error: demo ? '' : feed.error,
    demo,
    hasMore,
    loadingMore: feed.loadingMore,
    // Total real de publicaciones (puede ser mayor que las cargadas).
    total: !demo && feed.remote.length > 0 ? feed.total : null,
  }
}
