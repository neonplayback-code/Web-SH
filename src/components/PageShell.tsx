import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useCurrentUser } from '../lib/useCurrentUser'
import { Footer } from './Footer'
import { RailExtra } from './RailExtra'
import { TabBar } from './TabBar'

// Marco de las páginas interiores. En HANGAR conserva el riel lateral de la extensión;
// en ASTRA el riel se oculta y el contenido queda centrado.
export function PageShell({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser()
  return (
    <main className="dashboard page-shell" id="contenido">
      <div className="col-rail">
        <section className="hero">
          <div className="hero-copy">
            <div className="hero-topline">
              <span className="hero-id">OD / OVERDRIVE BOX</span>
              <span className="hero-session"><i aria-hidden="true" /> {user ? 'SESIÓN ACTIVA' : 'INVITADO'}</span>
            </div>
            <p className="hero-greeting">TU ESPACIO PÚBLICO</p>
            <Link className="add-button" to="/" style={{ width: 'fit-content', textDecoration: 'none' }}>
              <span className="add-symbol" aria-hidden="true">←</span><span>INICIO</span>
            </Link>
          </div>
        </section>
        <RailExtra />
      </div>
      <div className="col-stage">
        <TabBar />
        {children}
        <Footer />
      </div>
    </main>
  )
}
