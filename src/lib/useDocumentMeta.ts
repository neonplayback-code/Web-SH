import { useEffect } from 'react'

const BASE_TITLE = 'Overdrive - Box'
const BASE_DESCRIPTION = 'Overdrive - Box: publica proyectos, videos, anuncios, posts, betas, demos, avances y links.'

// Pone el título y la descripción de la página actual (pestañas, publicaciones, perfiles) y los restaura al salir.
export function useDocumentMeta(title?: string | null, description?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE_TITLE}` : BASE_TITLE

    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const text = description?.trim().slice(0, 160) || BASE_DESCRIPTION
    if (meta) meta.content = text

    return () => {
      document.title = BASE_TITLE
      if (meta) meta.content = BASE_DESCRIPTION
    }
  }, [title, description])
}
