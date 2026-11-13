import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { CREATOR } from '../config/site'
import { supabase } from '../lib/supabase'
import { cleanUsername } from '../lib/username'
import { Icon } from './Icon'

type Mode = 'sign-in' | 'sign-up' | 'magic'

const LAST_EMAIL_KEY = 'od_last_email'

// Los errores de Supabase llegan en inglés: aquí se convierten en frases que se entienden.
function friendly(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos. Si no la recuerdas, usa "Olvidé mi contraseña" o "Sin contraseña".'
  if (m.includes('email not confirmed')) return 'Confirma tu correo antes de entrar: te enviamos un enlace a tu bandeja.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ese correo ya tiene cuenta. Entra con tu contraseña o con enlace mágico.'
  if (m.includes('at least') && m.includes('password')) return 'La contraseña necesita al menos 6 caracteres.'
  if (m.includes('unable to validate email') || m.includes('invalid email') || (m.includes('email address') && m.includes('invalid'))) return 'Revisa el correo: parece que no está bien escrito.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos seguidos. Espera un minuto e inténtalo de nuevo.'
  if (m.includes('database error saving new user')) return 'No se pudo crear tu perfil: falta ejecutar el SQL de Supabase (mira SETUP.md).'
  if (m.includes('failed to fetch') || m.includes('network')) return 'No hay conexión con el servidor. Revisa tu internet.'
  return message
}

const POINTS = [
  'Entra en segundos con contraseña o con un enlace mágico a tu correo.',
  'Tu nombre de perfil se genera solo si no quieres pensarlo ahora.',
  'Da ♥ a proyectos, videos, demos y avances al instante.',
]

interface Props {
  // Se llama cuando la sesión queda iniciada (para volver a donde estabas).
  onDone?: () => void
}

function readSavedEmail(): string {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

// Pantalla de acceso de dos paneles: presentación a la izquierda, formulario rápido y cómodo a la derecha.
export function AuthForm({ onDone }: Props) {
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState(readSavedEmail)
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [caps, setCaps] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isUp = mode === 'sign-up'
  const isMagic = mode === 'magic'
  const cleanEmail = email.trim()
  const previewHandle = cleanUsername(username, cleanEmail)

  useEffect(() => {
    try {
      if (cleanEmail) localStorage.setItem(LAST_EMAIL_KEY, cleanEmail)
    } catch {
      /* ignore storage errors */
    }
  }, [cleanEmail])

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
    setInfo('')
  }

  const sendReset = async () => {
    setError('')
    setInfo('')
    if (!cleanEmail) {
      setError('Escribe tu correo arriba para enviarte el enlace de recuperación.')
      return
    }
    setSubmitting(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/entrar`,
      })
      if (err) throw err
      setInfo(`Listo: enviamos un enlace para restablecer tu contraseña a ${cleanEmail}.`)
    } catch (err) {
      setError(friendly(err instanceof Error ? err.message : String(err)))
    } finally {
      setSubmitting(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)
    try {
      if (isMagic) {
        const { error: err } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { emailRedirectTo: window.location.origin },
        })
        if (err) throw err
        setInfo(`Enlace mágico enviado a ${cleanEmail}. Ábrelo desde tu correo para entrar sin contraseña.`)
        return
      }
      if (isUp) {
        const { data, error: err } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { username: previewHandle } },
        })
        if (err) throw err
        if (!data.session) {
          setInfo(`Cuenta creada para @${previewHandle}. Revisa ${cleanEmail} para confirmar y entrar.`)
          setMode('sign-in')
          return
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
        if (err) throw err
      }
      onDone?.()
    } catch (err) {
      const text = friendly(err instanceof Error ? err.message : String(err))
      setError(text)
      if (text.startsWith('Ese correo ya tiene cuenta')) setMode('sign-in')
    } finally {
      setSubmitting(false)
    }
  }

  const onKey = (e: KeyboardEvent) => setCaps(e.getModifierState?.('CapsLock') ?? false)

  const title = isUp ? 'Crea tu cuenta' : isMagic ? 'Entra sin contraseña' : 'Inicia sesión'
  const subtitle = isUp
    ? 'Solo correo y contraseña. Tu usuario se ajusta automáticamente.'
    : isMagic
      ? 'Te enviamos un enlace directo a tu correo para entrar en 1 clic.'
      : 'Bienvenido de vuelta. Entra rápido para dar ♥ y publicar.'

  return (
    <div className="auth-shell utility-card">
      <aside className="auth-aside">
        <img className="auth-logo" src={CREATOR.logo} alt={`Logo de ${CREATOR.name}`} width="84" height="84" />
        <p className="auth-eyebrow">OVERDRIVE BOX</p>
        <h2>Acceso rápido, claro y sin fricción.</h2>
        <ul className="auth-points">
          {POINTS.map((p) => <li key={p}>{p}</li>)}
        </ul>
        <p className="auth-by">POR {CREATOR.name.toUpperCase()}</p>
      </aside>

      <form className="auth-form" onSubmit={submit}>
        <div className="auth-tabs" role="tablist" aria-label="Modo de acceso">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'sign-in'}
            className={`auth-tab${mode === 'sign-in' ? ' is-active' : ''}`}
            onClick={() => switchMode('sign-in')}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'sign-up'}
            className={`auth-tab${mode === 'sign-up' ? ' is-active' : ''}`}
            onClick={() => switchMode('sign-up')}
          >
            Crear cuenta
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'magic'}
            className={`auth-tab${mode === 'magic' ? ' is-active' : ''}`}
            onClick={() => switchMode('magic')}
          >
            Enlace mágico
          </button>
        </div>

        <div className="auth-head">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <label className="auth-field">
          <span>Correo electrónico</span>
          <span className="auth-input">
            <Icon name="mail" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              autoFocus={!email}
              autoComplete="email"
              inputMode="email"
            />
          </span>
        </label>

        {isUp && (
          <label className="auth-field">
            <span className="auth-field-row">
              <span>Nombre de usuario <small className="auth-opt">(opcional)</small></span>
              <span className="auth-preview">@{previewHandle}</span>
            </span>
            <span className="auth-input">
              <Icon name="user" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Se genera del correo si lo dejas vacío"
                maxLength={30}
                autoComplete="username"
              />
            </span>
          </label>
        )}

        {!isMagic && (
          <label className="auth-field">
            <span className="auth-field-row">
              <span>Contraseña</span>
              {!isUp ? (
                <button type="button" className="auth-forgot" onClick={sendReset} disabled={submitting}>
                  ¿Olvidaste tu contraseña?
                </button>
              ) : (
                <span className={`auth-pass-state${password.length >= 6 ? ' is-ok' : ''}`}>
                  {password.length >= 6 ? '✓ Lista (6+ caracteres)' : `${password.length}/6 caracteres`}
                </span>
              )}
            </span>
            <span className="auth-input">
              <Icon name="lock" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={onKey}
                onKeyDown={onKey}
                placeholder={isUp ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                minLength={6}
                required
                autoFocus={Boolean(email)}
                autoComplete={isUp ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPass}
              >
                <Icon name={showPass ? 'eyeOff' : 'eye'} />
              </button>
            </span>
            {caps && <small className="auth-caps">Bloq Mayús está activado.</small>}
          </label>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}
        {info && <p className="auth-info" role="status">{info}</p>}

        <button type="submit" disabled={submitting} className="save-button auth-submit">
          {submitting ? 'Un momento…' : isUp ? 'Crear cuenta ahora' : isMagic ? 'Enviar enlace mágico' : 'Entrar'}
        </button>

        {!isMagic && (
          <button type="button" className="ghost-button auth-magic-btn" onClick={() => switchMode('magic')}>
            ¿No recuerdas tu contraseña? Entra con enlace mágico
          </button>
        )}
      </form>
    </div>
  )
}
