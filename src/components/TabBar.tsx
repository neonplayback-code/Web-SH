import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router'
import { TABS } from '../config/tabs'
import { useSiteProfile } from '../lib/siteProfile'

// Secciones del sitio. Cada una abre una página con su propia estructura; el dueño puede ocultar las que no usa.
export function TabBar() {
  const { hiddenTabs } = useSiteProfile()
  const { pathname } = useLocation()
  const ref = useRef<HTMLElement>(null)
  // Como texto, para que el efecto solo se repita cuando cambia la lista y no en cada render.
  const hiddenKey = hiddenTabs.join(',')

  // Cuando el riel se desplaza en horizontal (HANGAR en móvil), la sección activa queda a la vista.
  // Solo se mueve el riel: la página no cambia de posición.
  useEffect(() => {
    const nav = ref.current
    const active = nav?.querySelector<HTMLElement>('.is-active')
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return
    const offset = active.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft
    nav.scrollLeft = offset - (nav.clientWidth - active.offsetWidth) / 2
  }, [pathname, hiddenKey])

  return (
    <nav className="tabbar" aria-label="Secciones" ref={ref}>
      {TABS.filter((t) => !t.slug || !hiddenTabs.includes(t.slug)).map((t) => (
        <NavLink
          key={t.slug}
          to={`/${t.slug}`}
          end
          className={({ isActive }) => `launcher-pill tab${isActive ? ' is-active' : ''}`}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
