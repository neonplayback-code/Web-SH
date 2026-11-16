import { useSyncExternalStore } from 'react'
import type { User } from '@supabase/supabase-js'
import { isBackendConfigured, supabase } from './supabase'
import { toProfile } from './projects'
import { cleanUsername } from './username'
import type { Profile } from '../types'

interface AuthState {
  user: User | null
  // Fila de profiles (guarda el nombre de usuario).
  profile: Profile | null
  // Solo la primera cuenta registrada (el dueño) puede publicar; el servidor lo decide.
  isOwner: boolean
  loading: boolean
  // Se abrió el enlace de "restablecer contraseña" del correo: toca escribir la contraseña nueva.
  recovering: boolean
}

// Un único estado compartido: Header, páginas y formularios leen lo mismo sin repetir pedidos ni listeners.
let state: AuthState = { user: null, profile: null, isOwner: false, loading: isBackendConfigured, recovering: false }
const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
function set(patch: Partial<AuthState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

type ProfileRow = { id: string; username: string; created_at: number }

// Cuenta sin perfil (creada antes de instalar el trigger): se crea aquí con el nombre del registro.
// El nombre es único: si ya está tomado se prueba con un sufijo.
async function createProfile(user: User): Promise<ProfileRow | null> {
  const base = cleanUsername(String(user.user_metadata?.username ?? ''), user.email ?? '')
  for (let n = 0; n < 5; n++) {
    const suffix = n === 0 ? '' : `-${n}`
    const username = base.slice(0, 30 - suffix.length) + suffix
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: user.id, username, created_at: Date.now() })
      .select('id, username, created_at')
      .maybeSingle()
    if (!error) return data
    if (error.code !== '23505') return null
    // Conflicto: o el perfil ya existe (carrera con el trigger) o el nombre está tomado.
    const existing = await supabase.from('profiles').select('id, username, created_at').eq('id', user.id).maybeSingle()
    if (existing.data) return existing.data
  }
  return null
}

let seq = 0
async function load(current: User | null) {
  const mine = ++seq
  if (!current) {
    set({ user: null, profile: null, isOwner: false, loading: false })
    return
  }
  // Mientras llega el perfil se sigue "cargando": así las páginas protegidas no te devuelven a /entrar por error.
  set({ user: current, loading: state.profile?.id === current.id ? state.loading : true })
  let { data } = await supabase.from('profiles').select('id, username, created_at').eq('id', current.id).maybeSingle()
  if (!data) data = await createProfile(current)
  const owner = await supabase.rpc('is_owner')
  // Si mientras tanto entró o salió otra sesión, esta respuesta ya no vale.
  if (mine !== seq) return
  set({ profile: data ? toProfile(data) : null, isOwner: owner.data === true, loading: false })
}

if (isBackendConfigured) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') set({ recovering: true })
    const next = session?.user ?? null
    // Renovar el token o volver a la pestaña no cambia quién eres: no se repite todo el pedido.
    if (next && next.id === state.user?.id && state.profile && event !== 'USER_UPDATED') return
    // Dentro del callback no se llama a Supabase directamente (puede bloquearse): se difiere.
    setTimeout(() => void load(next), 0)
  })
}

export const finishRecovery = () => set({ recovering: false })

export function useCurrentUser(): AuthState {
  return useSyncExternalStore(subscribe, () => state)
}
