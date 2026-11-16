import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { CREATOR } from '../config/site'
import { escapeLike, isEmail, mailboxUrl, maskEmail, passwordStrength, suggestEmail } from '../lib/authHelpers'
import { hueOf } from '../lib/hue'
import { supabase } from '../lib/supabase'
import { handleOf } from '../lib/username'
import { finishRecovery } from '../lib/useCurrentUser'
import { Icon } from './Icon'

type View = 'signin' | 'signup' | 'magic' | 'forgot'
type SentKind = 'signup' | 'magic' | 'reset'
type Sent = { kind: SentKind; email: string }
type NameCheck = 'idle' | 'checking' | 'free' | 'taken'

const LAST_EMAIL_KEY = 'od_last_email'
const RESEND_SECONDS = 45

// Dirección completa dentro de la web, respetando la ruta base (en GitHub Pages es /nombre-del-repo/).
const appUrl = (path = '') => `${window.location.origin}${import.meta.env.BASE_URL}${path}`

// Los errores de Supabase llegan en inglés: aquí se convierten en frases que dicen qué pasó y qué hacer.
function friendly(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'El correo o la contraseña no coinciden. Revísalos o entra con un enlace al correo.'
  if (m.includes('email not confirmed')) return 'Falta confirmar el correo. Abre el enlace que te enviamos al registrarte.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ese correo ya tiene cuenta. Entra con tu contraseña o con un enlace al correo.'
  if (m.includes('at least') && m.includes('password')) return 'La contraseña necesita al menos 6 caracteres.'
  if (m.includes('unable to validate email') || m.includes('invalid email') || (m.includes('email address') && m.includes('invalid'))) return 'Ese correo no parece válido. Revisa que esté bien escrito.'
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'Hiciste demasiados intentos seguidos. Espera un minuto y vuelve a probar.'
  if (m.includes('database error saving new user')) return 'No se pudo crear tu perfil. Falta ejecutar el SQL de Supabase (mira SETUP.md).'
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'Ahora mismo no se admiten cuentas nuevas.'
  if (m.includes('same password')) return 'La contraseña nueva debe ser distinta de la anterior.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'No hay conexión con el servidor. Revisa tu internet y vuelve a probar.'
  return message
}

function readSavedEmail(): string {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

// Cuenta atrás en segundos hasta `until` (milisegundos). Devuelve 0 cuando ya pasó.
function useCountdown(until: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (until <= Date.now()) return
    const id = window.setInterval(() => {
      setNow(Date.now())
      if (Date.now() >= until) window.clearInterval(id)
    }, 500)
    return () => window.clearInterval(id)
  }, [until])
  return Math.max(0, Math.ceil((until - now) / 1000))
}

// ---------------------------------------------------------------------------------------------------------------
// Ficha: la tarjeta de la izquierda. Se va completando con lo que escribes, para ver qué se está creando.
// ---------------------------------------------------------------------------------------------------------------

interface CardProps {
  view: View | 'recovery'
  email: string
  handle: string
  fromEmail: boolean
  emailOk: boolean
  nameCheck: NameCheck
  strength: number
  passwordOk: boolean
  // Si ya se envió el enlace al correo: la ficha pasa a mostrar que se espera la confirmación.
  sentKind?: SentKind
}

const PROMISE: Record<CardProps['view'], string> = {
  signin: 'Entra para seguir dando ♥ donde lo dejaste.',
  signup: 'Con una cuenta puedes dar ♥ a lo que te guste.',
  magic: 'Sin contraseña: el enlace que te llega al correo te deja dentro.',
  forgot: 'Desde el enlace del correo eliges una contraseña nueva.',
  recovery: 'Elige una contraseña que no uses en ningún otro sitio.',
}

function Check({ ok, children, pending }: { ok: boolean; children: ReactNode; pending?: boolean }) {
  return (
    <li className={`ax-check${ok ? ' is-ok' : ''}${pending ? ' is-pending' : ''}`}>
      <span className="ax-check-dot" aria-hidden="true">{ok ? <Icon name="check" /> : null}</span>
      <span>{children}</span>
    </li>
  )
}

function Stage({ card }: { card: CardProps }) {
  const { view, email, handle, fromEmail, emailOk, nameCheck, strength, passwordOk, sentKind } = card
  const seed = view === 'signup' ? handle || email || 'nuevo' : email || 'invitado'
  const initial = (seed.replace(/[^\p{L}\p{N}]/gu, '')[0] ?? '?').toUpperCase()
  const signup = view === 'signup'
  const name = signup ? `@${handle || 'tu-nombre'}` : emailOk ? maskEmail(email) : view === 'recovery' ? 'Nueva contraseña' : 'Tu cuenta'
  const role = sentKind ? (sentKind === 'signup' ? 'Esperando tu confirmación' : 'Enlace enviado') : signup ? (fromEmail && handle ? 'Nombre tomado de tu correo' : 'Visitante nuevo') : view === 'recovery' ? 'Cuenta verificada' : 'Visitante'

  return (
    <aside className="ax-stage">
      <div className="ax-brand">
        <img src={CREATOR.logo} alt="" width="40" height="40" />
        <span>Overdrive Box</span>
      </div>

      <div className="ax-rings" aria-hidden="true"><i /><i /><i /></div>

      <div className="ax-badge" data-ready={emailOk && (view === 'recovery' || view === 'magic' || view === 'forgot' || passwordOk)} style={{ '--h': hueOf(seed) } as CSSProperties}>
        <div className="ax-badge-top">
          <span className="ax-avatar" aria-hidden="true">{initial}</span>
          <div className="ax-badge-id">
            <strong>{name}</strong>
            <small>{role}</small>
          </div>
        </div>
        <ul className="ax-checks" aria-label="Estado de lo que has escrito">
          {sentKind && (
            <>
              <Check ok>Correo {maskEmail(email)}</Check>
              <Check ok>{sentKind === 'signup' ? 'Cuenta creada' : 'Enlace enviado'}</Check>
              <Check ok={false} pending>{sentKind === 'signup' ? 'Falta confirmar el correo' : 'Falta abrir el enlace'}</Check>
            </>
          )}
          {!sentKind && view !== 'recovery' && <Check ok={emailOk} pending={!email}>Correo {emailOk ? 'válido' : 'sin escribir'}</Check>}
          {!sentKind && signup && (
            <Check ok={nameCheck === 'free' || (!handle ? false : nameCheck === 'idle' && fromEmail)} pending={nameCheck === 'checking'}>
              {nameCheck === 'checking' ? 'Comprobando el nombre' : nameCheck === 'taken' ? 'Nombre ocupado, se ajustará' : handle ? 'Nombre disponible' : 'Nombre por elegir'}
            </Check>
          )}
          {!sentKind && (view === 'signin' || signup || view === 'recovery') && (
            <Check ok={passwordOk} pending={strength === 0}>
              {passwordOk ? (signup || view === 'recovery' ? 'Contraseña lista' : 'Contraseña escrita') : 'Contraseña por escribir'}
            </Check>
          )}
        </ul>
        <div className="ax-badge-seal" aria-hidden="true"><Icon name={emailOk && (passwordOk || view === 'magic' || view === 'forgot') ? 'check' : 'key'} /></div>
      </div>

      <p className="ax-promise">{sentKind ? 'Falta un paso: abre el enlace del correo para terminar.' : PROMISE[view]}</p>
    </aside>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Piezas del formulario
// ---------------------------------------------------------------------------------------------------------------

function Field({ id, label, error, hint, aside, children }: { id: string; label: string; error?: string; hint?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className={`ax-field${error ? ' has-error' : ''}`}>
      <div className="ax-field-head">
        <label htmlFor={id}>{label}</label>
        {aside}
      </div>
      {children}
      {error ? (
        <p className="ax-msg is-error" id={`${id}-msg`}><Icon name="alert" />{error}</p>
      ) : hint ? (
        <p className="ax-msg" id={`${id}-msg`}>{hint}</p>
      ) : null}
    </div>
  )
}

function Meter({ score, label, hint }: { score: number; label: string; hint: string }) {
  // Sin nada escrito no se enciende ninguna barra; con algo escrito, al menos una.
  const filled = label ? Math.max(1, score) : 0
  return (
    <div className="ax-meter" data-score={score} aria-live="polite">
      <div className="ax-meter-bars" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => <i key={i} className={i < filled ? 'on' : undefined} />)}
      </div>
      <p>{label && <b>{label}. </b>}{hint}</p>
    </div>
  )
}

interface PasswordInputProps {
  id: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  placeholder: string
  invalid?: boolean
  describedBy?: string
  autoFocus?: boolean
  inputRef?: Ref<HTMLInputElement>
  onBlur?: () => void
}

function PasswordInput({ id, value, onChange, autoComplete, placeholder, invalid, describedBy, autoFocus, inputRef, onBlur }: PasswordInputProps) {
  const [show, setShow] = useState(false)
  const [caps, setCaps] = useState(false)
  const onKey = (e: KeyboardEvent) => setCaps(e.getModifierState?.('CapsLock') ?? false)
  return (
    <>
      <span className="ax-input">
        <Icon name="lock" />
        <input
          id={id}
          ref={inputRef}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          onKeyUp={onKey}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          spellCheck={false}
          autoCapitalize="none"
        />
        <button type="button" className="ax-eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={show}>
          <Icon name={show ? 'eyeOff' : 'eye'} />
        </button>
      </span>
      {caps && <p className="ax-msg is-warn"><Icon name="alert" />Tienes las mayúsculas activadas.</p>}
    </>
  )
}

function Submit({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button type="submit" className="ax-submit" disabled={busy}>
      {busy ? <span className="ax-spinner" aria-hidden="true" /> : null}
      <span>{busy ? 'Un momento…' : children}</span>
    </button>
  )
}

const COPY: Record<View, { title: string; lead: string; cta: string }> = {
  signin: { title: 'Entra a tu cuenta', lead: 'Da ♥ a lo que te guste y vuelve cuando quieras.', cta: 'Entrar' },
  signup: { title: 'Crea tu cuenta', lead: 'Un correo y una contraseña. Tarda menos de un minuto.', cta: 'Crear cuenta' },
  magic: { title: 'Entra con un enlace', lead: 'Escribe tu correo y te enviamos un enlace. Lo abres y ya estás dentro.', cta: 'Enviar enlace' },
  forgot: { title: 'Recupera tu contraseña', lead: 'Escribe tu correo y te enviamos un enlace para elegir una nueva.', cta: 'Enviar instrucciones' },
}

const SENT_COPY: Record<SentKind, { title: string; lead: string }> = {
  signup: { title: 'Confirma tu correo', lead: 'Tu cuenta está creada. Abre el enlace que te enviamos para activarla.' },
  magic: { title: 'Revisa tu correo', lead: 'Abre el enlace que te enviamos y entrarás sin escribir la contraseña.' },
  reset: { title: 'Revisa tu correo', lead: 'Abre el enlace que te enviamos para elegir una contraseña nueva.' },
}

interface Props {
  // Se llama cuando la sesión queda iniciada (para volver a donde estabas).
  onDone?: () => void
}

// Acceso: entrar, crear cuenta, entrar con enlace y recuperar contraseña en una sola pantalla.
export function AuthForm({ onDone }: Props) {
  const uid = useId()
  const [view, setView] = useState<View>('signin')
  // Solo en desarrollo: /entrar?sent=magic|signup|reset enseña el paso "revisa tu correo" sin enviar nada.
  const [sent, setSent] = useState<Sent | null>(() => {
    if (!import.meta.env.DEV) return null
    const kind = new URLSearchParams(window.location.search).get('sent')
    return kind === 'magic' || kind === 'signup' || kind === 'reset' ? { kind, email: 'lucia.prueba@gmail.com' } : null
  })
  const [email, setEmail] = useState(readSavedEmail)
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [nameCheck, setNameCheck] = useState<NameCheck>('idle')
  const [resendAt, setResendAt] = useState(0)
  const emailRef = useRef<HTMLInputElement>(null)
  const passRef = useRef<HTMLInputElement>(null)

  const cleanEmail = email.trim()
  const emailOk = isEmail(cleanEmail)
  const typo = emailOk ? suggestEmail(cleanEmail) : null
  const strength = useMemo(() => passwordStrength(password), [password])
  const signup = view === 'signup'
  const needsPassword = view === 'signin' || signup
  const typedName = handleOf(username)
  const handle = typedName || (signup && emailOk ? handleOf(cleanEmail) : '')
  const fromEmail = !typedName && Boolean(handle)
  const emailError = touched.email && !emailOk ? (cleanEmail ? 'Ese correo no parece completo. Falta algo como @gmail.com.' : 'Escribe tu correo.') : ''
  const passwordError = touched.password && needsPassword && password.length < 6 ? (password ? `Te faltan ${6 - password.length} caracteres.` : 'Escribe tu contraseña.') : ''
  const cooldown = useCountdown(resendAt)

  useEffect(() => {
    try {
      if (emailOk) localStorage.setItem(LAST_EMAIL_KEY, cleanEmail)
    } catch {
      /* sin almacenamiento */
    }
  }, [cleanEmail, emailOk])

  // Disponibilidad del nombre mientras se escribe (con una pequeña espera para no preguntar en cada letra).
  useEffect(() => {
    if (!signup || handle.length < 3) {
      setNameCheck('idle')
      return
    }
    let alive = true
    setNameCheck('checking')
    const timer = window.setTimeout(async () => {
      const { count, error: err } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .ilike('username', escapeLike(handle))
      if (!alive) return
      setNameCheck(err ? 'idle' : (count ?? 0) > 0 ? 'taken' : 'free')
    }, 450)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [signup, handle])

  const go = (next: View) => {
    setView(next)
    setSent(null)
    setError('')
    setTouched({ email: false, password: false })
    setPassword('')
  }

  const mailInput = (
    <>
      <span className="ax-input">
        <Icon name="mail" />
        <input
          id={`${uid}-email`}
          ref={emailRef}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          placeholder="tu@correo.com"
          autoComplete="email"
          inputMode="email"
          autoFocus={!email}
          aria-invalid={Boolean(emailError) || undefined}
          aria-describedby={`${uid}-email-msg`}
          spellCheck={false}
          autoCapitalize="none"
        />
      </span>
      {typo && (
        <p className="ax-msg is-hint">
          ¿Querías decir <button type="button" className="ax-inline" onClick={() => setEmail(typo)}>{typo}</button>?
        </p>
      )}
    </>
  )

  const send = async (kind: SentKind, to: string) => {
    if (kind === 'signup') {
      const { error: err } = await supabase.auth.resend({ type: 'signup', email: to, options: { emailRedirectTo: appUrl() } })
      if (err) throw err
    } else if (kind === 'magic') {
      const { error: err } = await supabase.auth.signInWithOtp({ email: to, options: { emailRedirectTo: appUrl() } })
      if (err) throw err
    } else {
      const { error: err } = await supabase.auth.resetPasswordForEmail(to, { redirectTo: appUrl('entrar') })
      if (err) throw err
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setTouched({ email: true, password: true })
    if (!emailOk) return emailRef.current?.focus()
    if (needsPassword && password.length < 6) return passRef.current?.focus()
    setSubmitting(true)
    try {
      if (view === 'magic') {
        await send('magic', cleanEmail)
        setSent({ kind: 'magic', email: cleanEmail })
        setResendAt(Date.now() + RESEND_SECONDS * 1000)
      } else if (view === 'forgot') {
        await send('reset', cleanEmail)
        setSent({ kind: 'reset', email: cleanEmail })
        setResendAt(Date.now() + RESEND_SECONDS * 1000)
      } else if (signup) {
        const { data, error: err } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { username: handle }, emailRedirectTo: appUrl() },
        })
        if (err) throw err
        // Con la confirmación por correo activa, Supabase no da error si el correo ya existe: devuelve un usuario sin identidades.
        if (data.user && data.user.identities?.length === 0) {
          go('signin')
          setError('Ese correo ya tiene cuenta. Entra con tu contraseña o con un enlace al correo.')
          return
        }
        if (!data.session) {
          setSent({ kind: 'signup', email: cleanEmail })
          setResendAt(Date.now() + RESEND_SECONDS * 1000)
          return
        }
        onDone?.()
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
        if (err) throw err
        onDone?.()
      }
    } catch (err) {
      const text = friendly(err instanceof Error ? err.message : String(err))
      // Si ya tiene cuenta, se pasa a "Entrar" (eso limpia el aviso) y después se muestra el mensaje.
      if (text.startsWith('Ese correo ya tiene cuenta') && signup) go('signin')
      setError(text)
    } finally {
      setSubmitting(false)
    }
  }

  const resend = async () => {
    if (!sent || cooldown > 0) return
    setError('')
    try {
      await send(sent.kind, sent.email)
      setResendAt(Date.now() + RESEND_SECONDS * 1000)
    } catch (err) {
      setError(friendly(err instanceof Error ? err.message : String(err)))
    }
  }

  const card: CardProps = {
    view: sent ? (sent.kind === 'signup' ? 'signup' : view) : view,
    sentKind: sent?.kind,
    email: sent ? sent.email : cleanEmail,
    handle: sent && sent.kind === 'signup' ? handleOf(sent.email) : handle,
    fromEmail,
    emailOk: sent ? true : emailOk,
    nameCheck,
    strength: strength.score + (password.length >= 6 ? 1 : 0),
    passwordOk: password.length >= 6,
  }

  const copy = COPY[view]
  const mailbox = sent ? mailboxUrl(sent.email) : null

  return (
    <div className="ax-shell" data-view={sent ? 'sent' : view}>
      <Stage card={card} />

      <section className="ax-panel">
        {sent ? (
          <div className="ax-sent" role="status">
            <span className="ax-sent-icon" aria-hidden="true"><Icon name="mail" /><i><Icon name="check" /></i></span>
            <h1>{SENT_COPY[sent.kind].title}</h1>
            <p className="ax-lead">{SENT_COPY[sent.kind].lead}</p>
            <p className="ax-sent-to">Enviado a <b>{sent.email}</b></p>
            {error && <p className="ax-alert" role="alert"><Icon name="alert" />{error}</p>}
            <div className="ax-sent-actions">
              {mailbox && <a className="ax-submit" href={mailbox.url} target="_blank" rel="noopener noreferrer"><span>{mailbox.label}</span></a>}
              <button type="button" className={mailbox ? 'ax-ghost' : 'ax-submit'} onClick={resend} disabled={cooldown > 0}>
                <span>{cooldown > 0 ? `Reenviar en ${cooldown} s` : 'Reenviar el enlace'}</span>
              </button>
              <button type="button" className="ax-link" onClick={() => setSent(null)}>Usar otro correo</button>
            </div>
            <p className="ax-note">Si no llega en un par de minutos, mira en la carpeta de spam.</p>
          </div>
        ) : (
          <form className="ax-form" onSubmit={submit} noValidate>
            {(view === 'signin' || signup) ? (
              <div className="ax-tabs" role="tablist" aria-label="Entrar o crear cuenta" data-active={view}>
                <button type="button" role="tab" id={`${uid}-t-in`} aria-selected={view === 'signin'} onClick={() => go('signin')}>Entrar</button>
                <button type="button" role="tab" id={`${uid}-t-up`} aria-selected={signup} onClick={() => go('signup')}>Crear cuenta</button>
                <i aria-hidden="true" />
              </div>
            ) : (
              <button type="button" className="ax-back" onClick={() => go('signin')}><Icon name="back" />Volver a entrar</button>
            )}

            <header className="ax-head" key={view}>
              <h1>{copy.title}</h1>
              <p className="ax-lead">{copy.lead}</p>
            </header>

            {error && <p className="ax-alert" role="alert"><Icon name="alert" />{error}</p>}

            <Field id={`${uid}-email`} label="Correo" error={emailError}>{mailInput}</Field>

            {signup && (
              <Field
                id={`${uid}-user`}
                label="Nombre de usuario (opcional)"
                hint={
                  nameCheck === 'taken' ? (
                    <span className="is-warn-text">@{handle} ya está en uso. Te asignaremos uno parecido, como @{handle}-1.</span>
                  ) : nameCheck === 'free' && typedName ? (
                    <span className="is-ok-text">@{typedName} está disponible.</span>
                  ) : nameCheck === 'free' ? (
                    <span className="is-ok-text">Usaremos @{handle}, tomado de tu correo. Puedes cambiarlo aquí.</span>
                  ) : (
                    'Es público: se ve en tu perfil. Si lo dejas vacío usaremos el de tu correo.'
                  )
                }
              >
                <span className="ax-input">
                  <span className="ax-at" aria-hidden="true">@</span>
                  <input
                    id={`${uid}-user`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={(emailOk && handleOf(cleanEmail)) || 'tu-nombre'}
                    maxLength={30}
                    autoComplete="username"
                    spellCheck={false}
                    autoCapitalize="none"
                    aria-describedby={`${uid}-user-msg`}
                  />
                  {nameCheck === 'checking' && <span className="ax-spinner is-small" aria-label="Comprobando" />}
                  {nameCheck === 'free' && typedName && <span className="ax-ok" aria-hidden="true"><Icon name="check" /></span>}
                </span>
              </Field>
            )}

            {needsPassword && (
              <Field
                id={`${uid}-pass`}
                label="Contraseña"
                error={passwordError}
                aside={view === 'signin' ? <button type="button" className="ax-inline" onClick={() => go('forgot')}>¿La olvidaste?</button> : undefined}
              >
                <PasswordInput
                  id={`${uid}-pass`}
                  inputRef={passRef}
                  value={password}
                  onChange={setPassword}
                  onBlur={() => password && setTouched((t) => ({ ...t, password: true }))}
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  placeholder={signup ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                  invalid={Boolean(passwordError)}
                  describedBy={`${uid}-pass-msg`}
                  autoFocus={Boolean(email) && view === 'signin'}
                />
                {signup && <Meter score={strength.score} label={strength.label} hint={strength.hint} />}
              </Field>
            )}

            <Submit busy={submitting}>{copy.cta}</Submit>

            {view === 'signin' && (
              <button type="button" className="ax-link" onClick={() => go('magic')}><Icon name="mail" />Entrar con un enlace al correo</button>
            )}
            {signup && <p className="ax-note">Tu nombre de usuario es público. Tu correo no se muestra a nadie.</p>}
          </form>
        )}
      </section>
    </div>
  )
}

// Se muestra al abrir el enlace de "restablecer contraseña" del correo: aquí se escribe la nueva.
export function RecoveryForm({ onDone }: Props) {
  const uid = useId()
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const strength = useMemo(() => passwordStrength(password), [password])
  const matches = again.length > 0 && again === password

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('La contraseña necesita al menos 6 caracteres.')
    if (password !== again) return setError('Las dos contraseñas no son iguales.')
    setSubmitting(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (err) return setError(friendly(err.message))
    finishRecovery()
    onDone?.()
  }

  const card: CardProps = {
    view: 'recovery',
    email: '',
    handle: '',
    fromEmail: false,
    emailOk: true,
    nameCheck: 'idle',
    strength: password.length >= 6 ? 1 : 0,
    passwordOk: password.length >= 6 && matches,
  }

  return (
    <div className="ax-shell" data-view="recovery">
      <Stage card={card} />
      <section className="ax-panel">
        <form className="ax-form" onSubmit={submit} noValidate>
          <header className="ax-head">
            <h1>Elige una contraseña nueva</h1>
            <p className="ax-lead">Escríbela dos veces. Después entras con ella.</p>
          </header>

          {error && <p className="ax-alert" role="alert"><Icon name="alert" />{error}</p>}

          <Field id={`${uid}-p1`} label="Contraseña nueva">
            <PasswordInput id={`${uid}-p1`} value={password} onChange={setPassword} autoComplete="new-password" placeholder="Mínimo 6 caracteres" autoFocus />
            <Meter score={strength.score} label={strength.label} hint={strength.hint} />
          </Field>

          <Field
            id={`${uid}-p2`}
            label="Repite la contraseña"
            hint={again ? (matches ? <span className="is-ok-text">Coinciden.</span> : 'Todavía no coinciden.') : undefined}
          >
            <PasswordInput id={`${uid}-p2`} value={again} onChange={setAgain} autoComplete="new-password" placeholder="La misma de arriba" />
          </Field>

          <Submit busy={submitting}>Guardar contraseña</Submit>
        </form>
      </section>
    </div>
  )
}

