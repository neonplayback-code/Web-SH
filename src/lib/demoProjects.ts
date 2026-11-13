import type { Project, ProjectType, ProjectUpdate } from '../types'

// Publicaciones de ejemplo para inspeccionar cada formato y abrir su vista interna (/p/demo-...) sin base de datos.
// Solo se usan en desarrollo con ?demo o ?demos en la URL; nunca llegan a producción.
interface DemoSeed {
  id: string
  type: ProjectType
  title: string
  summary: string
  body: string
  links: string[]
  tags: string[]
  likes: number
  daysAgo: number
  accent?: [string, string]
  updates?: string[]
}

const makeCover = (c1: string, c2: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs>` +
    `<rect width="800" height="500" fill="#060918"/>` +
    `<circle cx="210" cy="150" r="240" fill="${c1}" fill-opacity=".28"/>` +
    `<circle cx="610" cy="360" r="260" fill="${c2}" fill-opacity=".26"/>` +
    `<circle cx="400" cy="250" r="140" fill="none" stroke="url(#g)" stroke-opacity=".42" stroke-width="1.5"/>` +
    `<circle cx="400" cy="250" r="78" fill="${c1}" fill-opacity=".14" stroke="${c2}" stroke-opacity=".5" stroke-width="1.5"/>` +
    `<circle cx="520" cy="180" r="6" fill="#eef6ff" fill-opacity=".85"/>` +
    `<circle cx="285" cy="325" r="4" fill="${c1}" fill-opacity=".9"/>` +
    `<rect x="28" y="28" width="744" height="444" rx="22" fill="none" stroke="url(#g)" stroke-opacity=".45" stroke-width="2"/>` +
    `</svg>`
  )}`

const SEEDS: DemoSeed[] = [
  {
    id: 'demo-app-1',
    type: 'app',
    title: 'Overdrive Box',
    summary: 'Lanzador y centro creativo con modos ASTRA, HANGAR y PIXEL en un solo lugar.',
    body: [
      'Versión y plataforma: v1.4.0 · Web / Desktop',
      'Incluye fondos procedurales en WebGL puro (ASTRA 4K sin blur y matriz/circuitos en HANGAR), estudio de publicación adaptativo y personalización en vivo.',
      'Novedades:\n• Nuevo shader de cielo estrellado con nebulosas por domain warping.\n• Botones espaciales unificados con variantes por estado.\n• Autoguardado local en el editor.'
    ].join('\n\n'),
    links: ['https://example.com/overdrive-box'],
    tags: ['app', 'webgl', 'v1.4'],
    likes: 28,
    daysAgo: 1,
    accent: ['#38bdf8', '#a855f7'],
    updates: ['v1.4.0: Nuevo cielo 4K en ASTRA y botones con cometa orbital.', 'v1.3.2: Optimización de tarjetas y búsqueda instantánea.'],
  },
  {
    id: 'demo-app-2',
    type: 'app',
    title: 'Forja de píxeles',
    summary: 'Editor ligero para sprites, paletas retro y exportación directa a hoja de frames.',
    body: 'Versión y plataforma: v1.1.0 · Navegador\n\nDiseñado para crear assets nítidos sin menús pesados. Soporta cuadrícula pixel-perfect, espejado en tiempo real y exportación PNG.',
    links: ['https://example.com/pixel-forge'],
    tags: ['pixel', 'herramienta', 'sprites'],
    likes: 14,
    daysAgo: 5,
  },
  {
    id: 'demo-video-1',
    type: 'video',
    title: 'Cómo hice el cielo 4K de ASTRA',
    summary: 'Desglose paso a paso del shader GLSL sin desenfoques: estrellas, nebulosas y fugaces.',
    body: [
      'Duración o resolución: 08:24 · 4K 60fps',
      '00:00 Introducción y problema del blur anterior\n01:45 Renderizado 1:1 con DPR nativo\n03:30 Nebulosas con domain warping de 6 octavas\n06:10 Estrellas principales con temperatura de color y fugaces'
    ].join('\n\n'),
    links: ['https://youtube.com/watch?v=dQw4w9WgXcQ'],
    tags: ['video', 'glsl', '4k'],
    likes: 19,
    daysAgo: 2,
    accent: ['#22d3ee', '#ec4899'],
    updates: ['Añadidos capítulos y enlaces al código del shader en la descripción.'],
  },
  {
    id: 'demo-video-2',
    type: 'video',
    title: 'Trailer de la beta abierta',
    summary: 'Recorrido rápido de 60 segundos por las nuevas funciones y animaciones.',
    body: 'Duración o resolución: 01:05 · 1080p 60fps\n\nMuestra rápida de los 3 modos visuales y el nuevo estudio adaptativo.',
    links: ['https://example.com/trailer'],
    tags: ['video', 'trailer', 'beta'],
    likes: 12,
    daysAgo: 6,
  },
  {
    id: 'demo-anuncio-1',
    type: 'anuncio',
    title: 'Nueva beta abierta este fin de semana',
    summary: 'Ya puedes probar los 3 modos visuales, el acceso sin contraseña y dejar tu ♥ en cada pieza.',
    body: [
      'Fecha o etiqueta del aviso: Lanzamiento · Este viernes 20:00',
      'Abrimos el acceso para que cualquiera explore la web, pruebe ASTRA/HANGAR/PIXEL y comparta feedback sobre rendimiento y diseño.',
      'Si encuentras algún detalle visual en tu pantalla, respóndelo en las notas de la beta.'
    ].join('\n\n'),
    links: ['https://example.com/anuncio-beta'],
    tags: ['anuncio', 'beta', 'comunidad'],
    likes: 23,
    daysAgo: 2,
    updates: ['Recordatorio: el acceso con enlace mágico ya está habilitado.'],
  },
  {
    id: 'demo-anuncio-2',
    type: 'anuncio',
    title: 'Estrenamos dominio y estudio de publicación',
    summary: 'Ahora cada tipo de contenido tiene su propio formato visual y vista previa en vivo.',
    body: 'Fecha o etiqueta del aviso: Novedad importante\n\nCentralizamos todos los lanzamientos, videos, avances y recursos en una sola dirección.',
    links: ['https://example.com/estudio'],
    tags: ['anuncio', 'web'],
    likes: 10,
    daysAgo: 8,
  },
  {
    id: 'demo-post-1',
    type: 'post',
    title: 'Por qué rehicimos el shader espacial desde cero',
    summary: 'Cómo pasamos de nubes borrosas a filamentos cristalinos respetando el DPR real.',
    body: [
      'Cuando dibujas un cielo en baja resolución y luego lo reescalas, cada estrella pierde precisión y las nebulosas terminan pareciendo manchas planas.',
      'La solución fue renderizar en una sola pasada a la resolución real del dispositivo (Math.min(devicePixelRatio, 2)), calculando los bordes con smoothstep calibrado al tamaño de píxel.',
      'Además, separar las mini estrellas de fondo de las estrellas principales con temperatura de color real (blanco puro, azul hielo y dorado suave) da una sensación de profundidad inmediata sin saturar la interfaz.'
    ].join('\n\n'),
    links: ['https://example.com/post-shader'],
    tags: ['post', 'webgl', 'arquitectura'],
    likes: 25,
    daysAgo: 3,
    accent: ['#6366f1', '#22d3ee'],
    updates: ['Actualizado con métricas de nitidez en pantallas 2× Retina.'],
  },
  {
    id: 'demo-post-2',
    type: 'post',
    title: 'Notas de la semana: botones con vida propia',
    summary: 'Diseñando variantes claras entre estado seleccionado, reposo, hover y deshabilitado.',
    body: 'Un botón espacial no debe tapar su propio texto con destellos. Movimos las estrellas de 4 puntas a los flancos y separamos visualmente los estados activos del reposo.',
    links: [],
    tags: ['post', 'ui', 'css'],
    likes: 11,
    daysAgo: 9,
  },
  {
    id: 'demo-beta-1',
    type: 'beta',
    title: 'Overdrive 0.9 Beta',
    summary: 'Versión de prueba con el nuevo estudio adaptativo de publicaciones y acceso rápido.',
    body: [
      'Versión beta: v0.9.0-beta.3',
      'Qué probar:\n1. Cambia entre App, Video, Post, Beta y Short en el estudio.\n2. Arrastra una imagen a la zona de portada.\n3. Prueba las variantes de botones en Personalizar.',
      'Feedback buscado: cuéntanos si notas algún texto encimado en pantallas móviles o monitores ultrawide.'
    ].join('\n\n'),
    links: ['https://example.com/beta-09'],
    tags: ['v0.9-beta', 'testing', 'feedback'],
    likes: 21,
    daysAgo: 3,
    updates: ['Beta.3: Corregida la vista previa en formato Short y añadidos tags interactivos.'],
  },
  {
    id: 'demo-beta-2',
    type: 'beta',
    title: 'Box Mobile Preview',
    summary: 'Ajustes táctiles, menús compactos y tarjetas adaptadas a pantallas verticales.',
    body: 'Versión beta: v0.3.1-mobile\n\nEnfocada en ergonomía en teléfonos: botones amplios, buscador limpio y cero desbordes horizontales.',
    links: ['https://example.com/mobile-beta'],
    tags: ['mobile', 'beta', 'ux'],
    likes: 16,
    daysAgo: 10,
  },
  {
    id: 'demo-demo-1',
    type: 'demo',
    title: 'Demo de la escena espacial',
    summary: 'Explora en tiempo real las nebulosas volumétricas, fugaces y cambio instantáneo de color.',
    body: [
      'Controles o requisitos: Navegador con WebGL · Mouse / Teclado (Alt+M cambia de modo)',
      'Abre "Personalizar la web" desde cualquier tarjeta para ajustar densidad de estrellas, brillo, tipografía Cósmica y velocidad de animaciones en tiempo real.'
    ].join('\n\n'),
    links: ['https://example.com/demo-escena'],
    tags: ['demo', 'interactivo', 'webgl'],
    likes: 22,
    daysAgo: 4,
    accent: ['#eab308', '#14b8a6'],
  },
  {
    id: 'demo-demo-2',
    type: 'demo',
    title: 'Prueba el editor adaptativo',
    summary: 'Sandbox interactivo del nuevo flujo de creación para los 9 tipos de publicación.',
    body: 'Controles o requisitos: Navegador moderno · Arrastrar y soltar archivos\n\nComprueba cómo cambia la tarjeta de vista previa al cambiar entre Video, Link o Short.',
    links: ['https://example.com/demo-editor'],
    tags: ['demo', 'editor', 'ui'],
    likes: 15,
    daysAgo: 11,
  },
  {
    id: 'demo-avance-1',
    type: 'avance',
    title: 'Buscador cósmico y tarjetas listas',
    summary: 'Cápsula con blur profundo, borde cometa rotatorio y filtros de orden integrados.',
    body: [
      'Hito o progreso: 90% · Pulido visual completado',
      'Se unificaron los botones "Recientes" y "Más gustados" al sistema de estrellas y se ajustó el contraste de descripciones sobre nebulosas.'
    ].join('\n\n'),
    links: [],
    tags: ['avance', 'wip', 'ui'],
    likes: 18,
    daysAgo: 4,
    updates: ['Día 2: Añadida estela fugaz al pasar el cursor por los filtros.'],
  },
  {
    id: 'demo-avance-2',
    type: 'avance',
    title: 'Ventana de configuración por pestañas',
    summary: 'Separamos Apariencia, Efectos y Diseño para ajustar todo sin scroll eterno.',
    body: 'Hito o progreso: 100% · Refactorización completada\n\nCada tarjeta de modo ahora muestra una insignia "Activo" clara y botones con estado visual.',
    links: [],
    tags: ['avance', 'config', 'devlog'],
    likes: 13,
    daysAgo: 7,
  },
  {
    id: 'demo-link-1',
    type: 'link',
    title: 'Documentación de shaders GLSL',
    summary: 'Referencia rápida y clara sobre FBM, domain warping y anti-aliasing con smoothstep.',
    body: 'Recurso seleccionado para dominar ruido procedural y composición nítida en WebGL.',
    links: ['https://thebookofshaders.com'],
    tags: ['link', 'glsl', 'guía'],
    likes: 17,
    daysAgo: 5,
  },
  {
    id: 'demo-link-2',
    type: 'link',
    title: 'Repositorio del proyecto',
    summary: 'Código fuente, historial de mejoras y guía rápida para configurar Supabase.',
    body: 'Consulta la arquitectura de componentes y estilos del proyecto.',
    links: ['https://github.com/alchemy-studios/overdrive-box'],
    tags: ['github', 'link', 'código'],
    likes: 14,
    daysAgo: 12,
  },
  {
    id: 'demo-short-1',
    type: 'short',
    title: 'Estrellas nítidas a 60 FPS en 4K',
    summary: 'Captura directa sin blur post-procesado: cada estrella brilla con su propio tono.',
    body: 'Short rápido mostrando el contraste entre el núcleo blanco y los filamentos violeta.',
    links: [],
    tags: ['short', '4k', 'captura'],
    likes: 24,
    daysAgo: 1,
    accent: ['#22c55e', '#06b6d4'],
  },
  {
    id: 'demo-short-2',
    type: 'short',
    title: 'Antes y después del botón espacial',
    summary: 'De borde doble cortado a un único cometa orbital continuo.',
    body: 'Comparativa rápida del nuevo sistema unificado en astra-fx.css.',
    links: [],
    tags: ['short', 'antes-despues', 'css'],
    likes: 20,
    daysAgo: 6,
  },
]

function toProject(seed: DemoSeed, now: number): Project {
  const createdAt = now - seed.daysAgo * 86_400_000
  return {
    id: seed.id,
    type: seed.type,
    title: seed.title,
    summary: seed.summary,
    body: seed.body,
    coverUrl: seed.accent ? makeCover(seed.accent[0], seed.accent[1]) : null,
    mediaUrls: [],
    links: seed.links,
    tags: seed.tags,
    authorUid: 'demo',
    authorUsername: 'overdrive',
    status: 'published',
    createdAt,
    updatedAt: createdAt,
    views: seed.likes * 4 + 12,
    likes: seed.likes,
  }
}

let demoSession = false

export const demoEnabled = () => {
  if (!import.meta.env.DEV) return false
  const q = new URLSearchParams(location.search)
  if (q.has('demo') || q.has('demos')) demoSession = true
  return demoSession
}

export function demoProjects(): Project[] {
  const now = Date.now()
  return SEEDS.map((s) => toProject(s, now)).sort((a, b) => b.createdAt - a.createdAt)
}

export function findDemoProject(id: string): Project | null {
  if (!import.meta.env.DEV) return null
  const seed = SEEDS.find((s) => s.id === id)
  return seed ? toProject(seed, Date.now()) : null
}

export function demoUpdates(id: string): ProjectUpdate[] {
  if (!import.meta.env.DEV) return []
  const seed = SEEDS.find((s) => s.id === id)
  if (!seed?.updates?.length) return []
  const now = Date.now()
  return seed.updates.map((text, idx) => ({
    id: `${id}-upd-${idx + 1}`,
    text,
    createdAt: now - (idx + 1) * 3_600_000 * 12,
  }))
}
