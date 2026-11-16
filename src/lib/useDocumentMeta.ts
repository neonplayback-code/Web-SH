import { useEffect } from 'react'

const BASE_TITLE = 'Overdrive - Box'
const BASE_DESCRIPTION = 'Overdrive - Box: publica proyectos, videos, anuncios, posts, betas, demos, avances y links.'

// Pone el título y la descripción de la página actual (pestañas, publicaciones, perfiles) y los restaura al salir.
export function useDocumentMeta(title?: string | null, description?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE_TITLE}` : BASE_TITLE

    // La descripción y el título también van en las etiquetas para compartir (og:), por si el lector ejecuta JavaScript.
    const pairs: [HTMLMetaElement | null, string, string][] = [
      [document.querySelector('meta[name="description"]'), description?.trim().slice(0, 160) || BASE_DESCRIPTION, BASE_DESCRIPTION],
      [document.querySelector('meta[property="og:description"]'), description?.trim().slice(0, 160) || BASE_DESCRIPTION, BASE_DESCRIPTION],
      [document.querySelector('meta[property="og:title"]'), title ? `${title} · ${BASE_TITLE}` : BASE_TITLE, BASE_TITLE],
    ]
    for (const [meta, text] of pairs) if (meta) meta.content = text

    return () => {
      document.title = BASE_TITLE
      for (const [meta, , base] of pairs) if (meta) meta.content = base
    }
  }, [title, description])
}
