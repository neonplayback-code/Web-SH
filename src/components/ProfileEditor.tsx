import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { TABS } from '../config/tabs'
import { DEFAULT_PROFILE, saveSiteProfile, useSiteProfile, type SiteProfile } from '../lib/siteProfile'
import { supabase } from '../lib/supabase'
import { closePanel, useOpenPanel } from '../lib/ui'
import { useCurrentUser } from '../lib/useCurrentUser'
import { Icon } from './Icon'
import { Modal } from './Modal'

const MAX_LOGO_BYTES = 5 * 1024 * 1024

// Ventana para que el dueño edite su perfil público. Lo que guarda se ve en todas las secciones.
export function ProfileEditor() {
  const open = useOpenPanel() === 'profile'
  const profile = useSiteProfile()
  const { user, isOwner } = useCurrentUser()
  const [form, setForm] = useState<SiteProfile>(profile)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Cada vez que se abre, el formulario parte de lo que hay publicado ahora.
  useEffect(() => {
    if (open) {
      setForm(profile)
      setError('')
    }
    // Solo al abrir: si `profile` cambiara mientras se edita, no debe pisar lo que se está escribiendo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!isOwner || !user) return null

  const set = <K extends keyof SiteProfile>(key: K, value: SiteProfile[K]) => setForm((f) => ({ ...f, [key]: value }))

  const setLink = (index: number, patch: Partial<{ label: string; url: string }>) =>
    set('links', form.links.map((l, i) => (i === index ? { ...l, ...patch } : l)))

  const toggleTab = (slug: string) =>
    set('hiddenTabs', form.hiddenTabs.includes(slug) ? form.hiddenTabs.filter((s) => s !== slug) : [...form.hiddenTabs, slug])

  const pickLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('El logo debe ser una imagen.')
    if (file.size > MAX_LOGO_BYTES) return setError('El logo supera 5 MB.')
    setBusy(true)
    setError('')
    const path = `users/${user.id}/profile/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`
    const bucket = supabase.storage.from('media')
    const { error: upErr } = await bucket.upload(path, file, { contentType: file.type })
    setBusy(false)
    if (upErr) return setError(upErr.message)
    set('logoUrl', bucket.getPublicUrl(path).data.publicUrl)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const message = await saveSiteProfile(form)
    setBusy(false)
    if (message) setError(message)
    else closePanel()
  }

  return (
    <Modal open={open} onClose={closePanel} kicker="SOLO PARA TI" title="Editar mi perfil" wide>
      <form className="pe-form" onSubmit={submit}>
        <p className="pe-lead">Lo que guardes aquí se publica en la portada de <b>todas las secciones</b>.</p>

        <div className="pe-logo">
          <img src={form.logoUrl} alt="" width="72" height="72" />
          <div>
            <label className="ghost-button pe-upload">
              <Icon name="plus" /><span>Cambiar logo</span>
              <input type="file" accept="image/*" onChange={pickLogo} hidden />
            </label>
            {form.logoUrl !== DEFAULT_PROFILE.logoUrl && (
              <button type="button" className="pe-reset" onClick={() => set('logoUrl', DEFAULT_PROFILE.logoUrl)}>Usar el logo original</button>
            )}
            <small>Imagen cuadrada, máximo 5 MB.</small>
          </div>
        </div>

        <div className="pe-grid">
          <label>Nombre
            <input value={form.displayName} onChange={(e) => set('displayName', e.target.value)} maxLength={60} required />
          </label>
          <label>Rol
            <input value={form.role} onChange={(e) => set('role', e.target.value)} maxLength={40} placeholder="CREADOR" />
          </label>
          <label>Etiqueta
            <input value={form.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} maxLength={60} placeholder="ARCHIVO PERSONAL" />
          </label>
          <label>Ubicación
            <input value={form.location} onChange={(e) => set('location', e.target.value)} maxLength={60} placeholder="Ciudad, país" />
          </label>
          <label>Título (primera línea)
            <input value={form.titleLead} onChange={(e) => set('titleLead', e.target.value)} maxLength={60} />
          </label>
          <label>Título (línea destacada)
            <input value={form.titleMain} onChange={(e) => set('titleMain', e.target.value)} maxLength={60} />
          </label>
        </div>

        <label>Frase corta
          <input value={form.tagline} onChange={(e) => set('tagline', e.target.value)} maxLength={160} />
        </label>
        <label>Nota
          <input value={form.note} onChange={(e) => set('note', e.target.value)} maxLength={120} />
        </label>
        <label>Estado (opcional)
          <input value={form.statusText} onChange={(e) => set('statusText', e.target.value)} maxLength={80} placeholder="Ej. Trabajando en mi próximo juego" />
        </label>
        <label>Sobre mí
          <textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} maxLength={600} rows={4} placeholder="Cuéntale al mundo quién eres y qué construyes." />
          <small className="pe-count">{form.bio.length}/600</small>
        </label>

        <fieldset className="pe-links">
          <legend>Mis enlaces <small>(hasta 8, solo http o https)</small></legend>
          {form.links.map((l, i) => (
            <div key={i} className="pe-link-row">
              <input value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} maxLength={30} placeholder="YouTube" aria-label={`Nombre del enlace ${i + 1}`} />
              <input value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} placeholder="https://…" inputMode="url" aria-label={`Dirección del enlace ${i + 1}`} />
              <button type="button" className="icon-button" aria-label="Quitar enlace" onClick={() => set('links', form.links.filter((_, j) => j !== i))}>
                <Icon name="trash" />
              </button>
            </div>
          ))}
          {form.links.length < 8 && (
            <button type="button" className="ghost-button" onClick={() => set('links', [...form.links, { label: '', url: '' }])}>
              <Icon name="plus" /><span>Añadir enlace</span>
            </button>
          )}
        </fieldset>

        <fieldset className="pe-tabs">
          <legend>Secciones visibles</legend>
          <div className="pe-tab-list">
            {TABS.filter((t) => t.slug).map((t) => (
              <label key={t.slug} className="pe-check">
                <input type="checkbox" checked={!form.hiddenTabs.includes(t.slug)} onChange={() => toggleTab(t.slug)} />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && <p className="form-error" role="alert">{error}</p>}

        <footer className="cz-foot">
          <button type="button" className="ghost-button" onClick={closePanel}>Cancelar</button>
          <button type="submit" className="save-button" disabled={busy}>{busy ? 'Guardando…' : 'Guardar y publicar'}</button>
        </footer>
      </form>
    </Modal>
  )
}
