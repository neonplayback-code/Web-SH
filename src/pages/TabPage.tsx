import { useEffect, useMemo, useRef, useState } from 'react'
import { useProjects } from '../lib/useProjects'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import type { Tab } from '../config/tabs'
import { Creator } from '../components/Creator'
import { Footer } from '../components/Footer'
import { Icon } from '../components/Icon'
import { Item } from '../components/Items'
import { Notice } from '../components/Notice'
import { RailExtra } from '../components/RailExtra'
import { TabBar } from '../components/TabBar'

type Sort = 'recent' | 'liked'

// Una sección del sitio: cabecera del creador y, debajo, el cuerpo propio de la sección (su `layout`).
export function TabPage({ tab }: { tab: Tab }) {
  const { projects, loading, error } = useProjects()
  const [text, setText] = useState('')
  const [sort, setSort] = useState<Sort>('recent')
  const [shown, setShown] = useState(tab.pageSize)
  const searchRef = useRef<HTMLInputElement>(null)
  useDocumentMeta(tab.title, tab.blurb)

  // "/" lleva al buscador, como en la extensión.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      if (t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const totalLikes = useMemo(() => projects.reduce((sum, p) => sum + (p.likes ?? 0), 0), [projects])
  const avanceCount = useMemo(() => projects.filter((p) => p.type === 'avance').length, [projects])
  const ofTab = useMemo(() => (tab.type ? projects.filter((p) => p.type === tab.type) : projects), [projects, tab.type])

  const filtered = useMemo(() => {
    const needle = text.trim().toLowerCase()
    const list = needle
      ? ofTab.filter((p) => [p.title, p.summary, p.authorUsername, ...(p.tags ?? [])].some((s) => s?.toLowerCase().includes(needle)))
      : ofTab
    return sort === 'liked' ? [...list].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0)) : list
  }, [ofTab, text, sort])

  const visible = filtered.slice(0, shown)

  let body
  if (error) {
    body = <Notice>No se pudo cargar: {error}</Notice>
  } else if (loading) {
    body = <Notice>Cargando…</Notice>
  } else if (ofTab.length === 0) {
    body = <div className="utility-card pub-empty"><strong>{tab.empty}</strong></div>
  } else if (filtered.length === 0) {
    body = <div className="utility-card pub-empty"><strong>Sin resultados</strong>Prueba con otra búsqueda.</div>
  } else {
    body = (
      <div className="tab-grid" data-layout={tab.layout}>
        {visible.map((p) => <Item key={p.id} project={p} layout={tab.layout} />)}
      </div>
    )
  }

  return (
    <main className="dashboard" id="contenido">
      {/* Riel lateral en HANGAR; en ASTRA la rejilla reparte: tabs, creador + resumen, cuerpo */}
      <div className="col-rail">
        <Creator projects={projects} />
        <RailExtra
          stats={[
            { label: 'Publicaciones', value: projects.length },
            { label: 'Me gusta', value: totalLikes },
            { label: 'Avances', value: avanceCount },
          ]}
        />
      </div>

      <div className="col-stage">
        <TabBar />

        <section className="tab-body" aria-labelledby="tab-heading">
          <header className="section-heading tab-head">
            <div className="section-title">
              <span className="section-kicker">{filtered.length} ELEMENTOS</span>
              <h2 id="tab-heading">{tab.title}<span className="heading-period">.</span></h2>
            </div>
            <p className="tab-blurb">{tab.blurb}</p>
          </header>

          <form className="search tab-filters" role="search" onSubmit={(e) => e.preventDefault()}>
            <span className="search-cosmos" aria-hidden="true">
              <i className="search-stars" />
              <i className="search-beam" />
            </span>
            <div className="search-box">
              <span className="search-icon" aria-hidden="true"><Icon name="search" /></span>
              <input
                ref={searchRef}
                type="search"
                value={text}
                onChange={(e) => { setText(e.target.value); setShown(tab.pageSize) }}
                placeholder={`Buscar en ${tab.title.toLowerCase()}…`}
                autoComplete="off"
                aria-label={`Buscar en ${tab.title}`}
                className="search-input"
              />
              {text && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => { setText(''); searchRef.current?.focus() }}
                  aria-label="Limpiar búsqueda"
                >
                  <Icon name="close" />
                </button>
              )}
            </div>
            <div className="tab-sort" role="group" aria-label="Orden">
              <button
                type="button"
                className={`sort-btn${sort === 'recent' ? ' is-active' : ''}`}
                onClick={() => setSort('recent')}
                aria-pressed={sort === 'recent'}
              >
                <span className="sort-icon">↓</span>
                <span>Recientes</span>
              </button>
              <button
                type="button"
                className={`sort-btn${sort === 'liked' ? ' is-active' : ''}`}
                onClick={() => setSort('liked')}
                aria-pressed={sort === 'liked'}
              >
                <Icon name="heart" />
                <span>Más gustados</span>
              </button>
            </div>
          </form>

          {body}

          {filtered.length > shown && (
            <button type="button" className="ghost-button tab-more" onClick={() => setShown((n) => n + tab.pageSize)}>
              {tab.more}
            </button>
          )}
        </section>

        <Footer />
      </div>
    </main>
  )
}
