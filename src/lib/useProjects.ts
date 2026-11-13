import { useEffect, useState } from 'react'
import { isBackendConfigured, supabase } from './supabase'
import { betaCatalogProjects } from './betaCatalog'
import { demoEnabled, demoProjects } from './demoProjects'
import { PROJECT_SELECT, toProject, type ProjectRow } from './projects'
import type { Project } from '../types'

// Publicaciones publicadas, de la más reciente a la más antigua, en tiempo real.
export function useProjects() {
  // ?demo (solo en desarrollo) muestra datos de ejemplo; en ausencia de base o sin publicaciones se muestra el catálogo beta.
  const demo = demoEnabled()
  const [projects, setProjects] = useState<Project[]>(() => (demo ? demoProjects() : betaCatalogProjects()))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isBackendConfigured || demo) return
    let alive = true

    const load = async () => {
      const { data, error: err } = await supabase
        .from('projects')
        .select(PROJECT_SELECT)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(100)
      if (!alive) return
      if (err) {
        setError(err.message)
      } else {
        const remote = ((data ?? []) as ProjectRow[]).map(toProject)
        setProjects(remote.length > 0 ? remote : betaCatalogProjects())
      }
      setLoading(false)
    }

    load()
    // Cada cambio en projects (nuevas publicaciones, likes) vuelve a cargar la lista.
    const channel = supabase
      .channel('feed-projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => load())
      .subscribe()

    return () => {
      alive = false
      supabase.removeChannel(channel)
    }
  }, [demo])

  return { projects, loading, error, demo }
}
