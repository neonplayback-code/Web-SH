import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { isBackendConfigured } from '../lib/supabase'
import { useCurrentUser } from '../lib/useCurrentUser'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import { AuthForm } from '../components/AuthForm'
import { Notice } from '../components/Notice'

// Solo rutas internas: evita que ?next=https://otro-sitio nos mande fuera.
function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
}

// Página de acceso a pantalla completa. Al terminar vuelve a donde estabas.
export function LoginPage() {
  const { user, loading } = useCurrentUser()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = safeNext(params.get('next'))
  useDocumentMeta('Entrar', 'Accede para publicar y dar ♥.')

  if (user) return <Navigate to={next} replace />

  let content
  if (!isBackendConfigured) {
    content = <Notice>El acceso necesita Supabase configurado. Sigue los pasos de <code>SETUP.md</code>.</Notice>
  } else if (loading) {
    content = <Notice>Cargando…</Notice>
  } else {
    content = <AuthForm onDone={() => navigate(next, { replace: true })} />
  }

  return (
    <main className="auth-page" id="contenido">
      {content}
      <Link className="auth-back" to="/">← Volver al inicio</Link>
    </main>
  )
}
