import type { ProjectType } from '../types'

// Cada sección (tab) tiene su propia estructura de página: `layout` decide cómo se dibujan sus elementos.
export type Layout = 'tile' | 'tall' | 'video' | 'banner' | 'article' | 'beta' | 'demo' | 'timeline' | 'links' | 'short'

export interface Tab {
  slug: string
  type: ProjectType | null
  label: string
  title: string
  blurb: string
  layout: Layout
  more: string
  empty: string
  pageSize: number
}

export const TABS: Tab[] = [
  { slug: '', type: null, label: 'Todo', title: 'Publicaciones', blurb: 'Lo último que he publicado, de todo un poco.', layout: 'tile', more: 'Más publicaciones…', empty: 'Todavía no hay nada publicado.', pageSize: 10 },
  { slug: 'proyectos', type: 'app', label: 'Proyectos', title: 'Proyectos', blurb: 'Apps y proyectos en los que estoy trabajando.', layout: 'tall', more: 'Más proyectos…', empty: 'Todavía no hay proyectos.', pageSize: 6 },
  { slug: 'videos', type: 'video', label: 'Videos', title: 'Videos', blurb: 'Trailers, avances en video y tutoriales.', layout: 'video', more: 'Más videos…', empty: 'Todavía no hay videos.', pageSize: 6 },
  { slug: 'anuncios', type: 'anuncio', label: 'Anuncios', title: 'Anuncios', blurb: 'Novedades y avisos importantes.', layout: 'banner', more: 'Más anuncios…', empty: 'Todavía no hay anuncios.', pageSize: 8 },
  { slug: 'posts', type: 'post', label: 'Posts', title: 'Posts', blurb: 'Notas y textos más largos.', layout: 'article', more: 'Más posts…', empty: 'Todavía no hay posts.', pageSize: 8 },
  { slug: 'betas', type: 'beta', label: 'Betas', title: 'Betas', blurb: 'Versiones en pruebas para quien quiera probarlas.', layout: 'beta', more: 'Más betas…', empty: 'Todavía no hay betas.', pageSize: 6 },
  { slug: 'demos', type: 'demo', label: 'Demos', title: 'Demos', blurb: 'Pruébalo tú mismo, sin instalar nada.', layout: 'demo', more: 'Más demos…', empty: 'Todavía no hay demos.', pageSize: 6 },
  { slug: 'avances', type: 'avance', label: 'Avances', title: 'Avances', blurb: 'La línea de tiempo de lo que voy construyendo.', layout: 'timeline', more: 'Más avances…', empty: 'Todavía no hay avances.', pageSize: 8 },
  { slug: 'links', type: 'link', label: 'Links', title: 'Links', blurb: 'Enlaces que vale la pena guardar.', layout: 'links', more: 'Más links…', empty: 'Todavía no hay links.', pageSize: 12 },
  { slug: 'shorts', type: 'short', label: 'Shorts', title: 'Shorts', blurb: 'Publicaciones cortas, de un vistazo.', layout: 'short', more: 'Más shorts…', empty: 'Todavía no hay shorts.', pageSize: 10 },
]
