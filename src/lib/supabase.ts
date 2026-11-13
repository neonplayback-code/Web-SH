import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const isBackendConfigured = Boolean(url && key)

// Sin configuración el cliente igual necesita valores; cada página comprueba isBackendConfigured antes de usarlo.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder'
)
