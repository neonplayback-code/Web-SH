import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { isBackendConfigured, supabase } from './supabase'
import { toProfile } from './projects'
import { cleanUsername } from './username'
import type { Profile } from '../types'

// Tracks the signed-in user, their profile row (which holds the username) and whether they are the site owner.
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(isBackendConfigured)

  useEffect(() => {
    if (!isBackendConfigured) return
    let alive = true

    const load = async (current: User | null) => {
      if (!alive) return
      setUser(current)
      if (!current) {
        setProfile(null)
        setIsOwner(false)
        setLoading(false)
        return
      }
      let { data } = await supabase
        .from('profiles')
        .select('id, username, created_at')
        .eq('id', current.id)
        .maybeSingle()
      // Cuenta sin perfil (creada antes de instalar el trigger): se crea aquí con el nombre del registro.
      if (!data) {
        const username = cleanUsername(String(current.user_metadata?.username ?? ''), current.email ?? '')
        const created = await supabase
          .from('profiles')
          .insert({ id: current.id, username, created_at: Date.now() })
          .select('id, username, created_at')
          .maybeSingle()
        data = created.data
      }
      // Solo la primera cuenta registrada (el dueño) puede publicar; el servidor lo decide.
      const owner = await supabase.rpc('is_owner')
      if (!alive) return
      setProfile(data ? toProfile(data) : null)
      setIsOwner(owner.data === true)
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user ?? null)
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return { user, profile, isOwner, loading }
}
