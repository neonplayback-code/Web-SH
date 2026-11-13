import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { isBackendConfigured, supabase } from '../lib/supabase'
import { openPanel } from '../lib/ui'
import { useCurrentUser } from '../lib/useCurrentUser'
import { Icon } from './Icon'
import { ModeSelector } from './ModeSelector'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(id)
  }, [])
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function Header() {
  const { user, profile, isOwner } = useCurrentUser()
  const { pathname } = useLocation()
  const time = useClock()

  return (
    <header className="topbar">
      <Link className="wordmark" to="/" aria-label="Overdrive - Box, inicio">
        <span className="brand-mark"><i className="od-logo" role="img" aria-label="Overdrive" /></span>
        <span className="brand-text">
          <span className="brand-name">OVERDRIVE</span>
          <span className="brand-box">BOX</span>
        </span>
      </Link>

      <ModeSelector />

      <div className="topbar-right">
        <div className="tele-cell tele-time" aria-hidden="true">
          <span className="tele-label">HORA LOCAL</span><time>{time}</time>
        </div>
        <div className="tele-cell tele-count" aria-hidden="true">
          <span className="tele-label">SESIÓN</span><b>{user ? 'ON' : '—'}</b>
        </div>
        {(isBackendConfigured || import.meta.env.DEV) && (
          <div className="online-pill">
            <span className="online-dot" />
            <span>SUPABASE</span>
            <strong>{isBackendConfigured ? 'OK' : 'OFF'}</strong>
          </div>
        )}
        <button className="icon-button" type="button" aria-label="Personalizar la web" title="Personalizar la web" onClick={() => openPanel('customize')}>
          <Icon name="sliders" />
        </button>
        {!user && isBackendConfigured && pathname !== '/entrar' && (
          <Link className="launcher-pill header-login" to="/entrar">Entrar</Link>
        )}
        {isOwner && pathname !== '/nuevo' && (
          <Link className="add-button" to="/nuevo" aria-label="Publicar" title="Nueva publicación">
            <Icon name="plus" /><span>Publicar</span>
          </Link>
        )}
        {user && profile && (
          <Link className="icon-button" to={`/u/${profile.username}`} aria-label="Mi perfil" title={`@${profile.username}`}>
            <Icon name="user" />
          </Link>
        )}
        {user && (
          <button className="icon-button" type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={() => supabase.auth.signOut()}>
            <Icon name="logout" />
          </button>
        )}
      </div>
    </header>
  )
}
