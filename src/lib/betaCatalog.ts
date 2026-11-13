import type { Project } from '../types'

interface BetaSeed {
  id: string
  title: string
  summary: string
  body: string
  tags: string[]
  likes: number
  daysAgo: number
  accent: [string, string]
}

const makeBetaCover = (c1: string, c2: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs>` +
    `<rect width="800" height="500" fill="#060918"/>` +
    `<circle cx="205" cy="145" r="235" fill="${c1}" fill-opacity=".26"/>` +
    `<circle cx="615" cy="365" r="250" fill="${c2}" fill-opacity=".24"/>` +
    `<circle cx="400" cy="250" r="136" fill="none" stroke="url(#g)" stroke-opacity=".42" stroke-width="1.5"/>` +
    `<circle cx="400" cy="250" r="74" fill="${c1}" fill-opacity=".14" stroke="${c2}" stroke-opacity=".5" stroke-width="1.5"/>` +
    `<rect x="28" y="28" width="744" height="444" rx="22" fill="none" stroke="url(#g)" stroke-opacity=".45" stroke-width="2"/>` +
    `</svg>`
  )}`

const BETA_SEEDS: BetaSeed[] = [
  {
    id: 'beta-sh-aero',
    title: 'SH.Aero',
    summary: 'Lanzador de escritorio para Windows (Python + pywebview) diseñado para gestionar e iniciar múltiples cuentas de Roblox desde una sola ventana.',
    body: [
      'Versión beta: Beta interna · Todavía no lanzado',
      '¿De qué trata?\nSH.Aero (AlchemyAero) es un lanzador multi-cuenta para Windows 10 y 11 construido con Python, pywebview y una interfaz visual de alto contraste. Reúne la gestión de cuentas, juegos guardados e inicio rápido en una sola aplicación de escritorio.',
      'Lo que integra esta beta:\n• Almacenamiento local cifrado con DPAPI de Windows para resguardar sesiones.\n• Respaldos automáticos y recuperación segura del almacén ante fallos.\n• Diagnóstico paso a paso de conexión para detectar incidencias sin exponer datos privados.',
      'Estado: En desarrollo activo. Todavía no cuenta con lanzamiento público.'
    ].join('\n\n'),
    tags: ['en-beta', 'desktop', 'python', 'windows'],
    likes: 18,
    daysAgo: 1,
    accent: ['#f97316', '#38bdf8'],
  },
  {
    id: 'beta-sh-download',
    title: 'SH.Download',
    summary: 'Descargador multimedia de escritorio para Windows hecho con React, Tauri y un worker en Python con FFmpeg para audio y video.',
    body: [
      'Versión beta: Beta en desarrollo · Todavía no lanzado',
      '¿De qué trata?\nSH.Download combina una interfaz moderna en React sobre Rust/Tauri con un motor de descarga en Python y FFmpeg integrado para guardar audio y video desde plataformas compatibles.',
      'Lo que integra esta beta:\n• Conversión automática de audio y video mediante FFmpeg incluido en el worker.\n• Compatibilidad planificada con enlaces de YouTube y búsqueda de pistas desde metadatos públicos.\n• Empaquetado nativo pensado para ejecutarse en Windows sin configuraciones manuales.',
      'Estado: En fase beta privada. Todavía no ha sido lanzado al público.'
    ].join('\n\n'),
    tags: ['en-beta', 'tauri', 'rust', 'python'],
    likes: 16,
    daysAgo: 2,
    accent: ['#22d3ee', '#6366f1'],
  },
  {
    id: 'beta-sh-extension',
    title: 'SH.Extension (Alchemy AI)',
    summary: 'Extensión de Chrome (Manifest V3) conectada a un backend en Node.js/Express para resumir, traducir y extraer datos clave de cualquier web.',
    body: [
      'Versión beta: Beta temprana · Todavía no lanzado',
      '¿De qué trata?\nSH.Extension (Alchemy AI) es un prototipo de extensión para Google Chrome acompañada por un servidor local en Node.js y Express que analiza el contenido de la página activa directamente desde el navegador.',
      'Lo que integra esta beta:\n• Resúmenes automáticos de artículos o fragmentos seleccionados en español (TL;DR, viñetas o detallado).\n• Traducción contextual compatible con modelos locales (Ollama, LM Studio / API compatible con OpenAI) o proveedores externos.\n• Extracción de métricas, entidades y fechas importantes desde cualquier pestaña.',
      'Estado: En fase de pruebas locales. Aún no está publicada en Chrome Web Store.'
    ].join('\n\n'),
    tags: ['en-beta', 'chrome', 'ia', 'nodejs'],
    likes: 14,
    daysAgo: 3,
    accent: ['#a855f7', '#06b6d4'],
  },
  {
    id: 'beta-sh-p',
    title: 'SH.P (Proyecto S.HP)',
    summary: 'Almacén inteligente de archivos, proyectos y documentos con IA integrada, modos offline/online/híbrido y bóveda cifrada AES-256.',
    body: [
      'Versión beta: Beta temprana · Todavía no lanzado',
      '¿De qué trata?\nSH.P es una plataforma de organización y almacenamiento inteligente pensada para reunir código, documentos, notas y proyectos bajo una experiencia fluida, pudiendo trabajar 100% offline en local o en modo híbrido.',
      'Lo que integra esta beta:\n• Búsqueda universal planteada por texto, significado semántico, OCR en imágenes, transcripción y voz.\n• Visor integrado de archivos, editor Markdown en vivo y copiloto IA con contexto sobre tus documentos.\n• Bóveda de seguridad con cifrado local AES-256 para carpetas protegidas.',
      'Estado: En construcción temprana. Todavía no lanzado al público.'
    ].join('\n\n'),
    tags: ['en-beta', 'almacen-ia', 'desktop', 'seguridad'],
    likes: 19,
    daysAgo: 4,
    accent: ['#ef4444', '#f59e0b'],
  },
  {
    id: 'beta-sh-portfolio',
    title: 'SH.Portfolio',
    summary: 'Portafolio interactivo de ingeniería de software de AlchemyDev con HUD de telemetría, buscador Ctrl+K, temas visuales y escaparate técnico.',
    body: [
      'Versión beta: En ajuste visual · Todavía no lanzado',
      '¿De qué trata?\nSH.Portfolio es la web personal dedicada de AlchemyDev para presentar proyectos de software, sistemas nativos con Rust y Tauri, arquitectura en Roblox Luau, herramientas Python y aplicaciones web.',
      'Lo que integra esta beta:\n• Fondo animado en canvas 2D, barra HUD interactiva y selector de paletas visuales.\n• Paleta de comandos rápida (Ctrl + K) para explorar proyectos, servicios y stack técnico.\n• Catálogo estructurado por disciplinas antes de su apertura pública.',
      'Estado: En fase beta de diseño y revisión antes del lanzamiento.'
    ].join('\n\n'),
    tags: ['en-beta', 'web', 'portafolio', 'ui'],
    likes: 15,
    daysAgo: 5,
    accent: ['#10b981', '#3b82f6'],
  },
]

// Fecha base fija y estable para que los contadores no varíen en cada render.
const CATALOG_EPOCH = Date.UTC(2026, 10, 12, 18, 0, 0)

export function betaCatalogProjects(): Project[] {
  return BETA_SEEDS.map((seed) => {
    const createdAt = CATALOG_EPOCH - seed.daysAgo * 86_400_000
    return {
      id: seed.id,
      type: 'beta',
      title: seed.title,
      summary: seed.summary,
      body: seed.body,
      coverUrl: makeBetaCover(seed.accent[0], seed.accent[1]),
      mediaUrls: [],
      links: [],
      tags: seed.tags,
      authorUid: 'alchemy-studios',
      authorUsername: 'AlchemyStudios',
      status: 'published',
      createdAt,
      updatedAt: createdAt,
      views: seed.likes * 3 + 10,
      likes: seed.likes,
    }
  })
}

export function findBetaCatalogProject(id: string): Project | undefined {
  return betaCatalogProjects().find((p) => p.id === id)
}
