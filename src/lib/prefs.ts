import { useSyncExternalStore } from 'react'

// Personalización del visitante: se guarda en su navegador y cambia la web de verdad
// (color, brillo, animación, fondo, densidad, tamaño de tarjetas, redondeo y tipografía).

export type Motion = 'full' | 'calm' | 'off'
export type Fx = 'cosmic' | 'soft' | 'minimal'
export type Density = 'compact' | 'cozy' | 'roomy'
export type CardSize = 'sm' | 'md' | 'lg'
export type FontKey = 'classic' | 'modern' | 'tech' | 'editorial' | 'cosmic'

export interface Prefs {
  accent: 'preset' | 'custom'
  hue: number
  glow: number
  motion: Motion
  fx: Fx
  stars: number
  nebula: boolean
  twinkle: boolean
  density: Density
  cards: CardSize
  radius: number
  font: FontKey
  titleFx: boolean
  hangarScan: boolean
  hangarBeams: boolean
  hangarIntensity: number
  hangarSpeed: number
  hangarSecondary: number
}

export const DEFAULT_PREFS: Prefs = {
  accent: 'preset',
  hue: 200,
  glow: 60,
  motion: 'full',
  fx: 'cosmic',
  stars: 100,
  nebula: true,
  twinkle: true,
  density: 'cozy',
  cards: 'md',
  radius: 18,
  font: 'cosmic',
  titleFx: true,
  hangarScan: true, hangarBeams: true, hangarIntensity: 65,
  hangarSpeed: 45, hangarSecondary: 275
}

export const FONT_OPTIONS: { value: FontKey; label: string; sample: string }[] = [
  { value: 'classic', label: 'Clásica', sample: 'var(--display)' },
  { value: 'modern', label: 'Moderna', sample: '"Space Grotesk", sans-serif' },
  { value: 'tech', label: 'Técnica', sample: '"OD Orbitron", sans-serif' },
  { value: 'editorial', label: 'Editorial', sample: '"Playfair Display", serif' },
  { value: 'cosmic', label: 'Cósmica', sample: '"Unbounded", sans-serif' }
]

const KEY = 'od-prefs'
const MOTIONS: readonly Motion[] = ['full', 'calm', 'off']
const FXS: readonly Fx[] = ['cosmic', 'soft', 'minimal']
const DENSITIES: readonly Density[] = ['compact', 'cozy', 'roomy']
const CARDS: readonly CardSize[] = ['sm', 'md', 'lg']
const FONTS: readonly FontKey[] = ['classic', 'modern', 'tech', 'editorial', 'cosmic']

const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T => (allowed.includes(v as T) ? (v as T) : d)
const num = (v: unknown, min: number, max: number, d: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)

// Lo guardado puede venir de otra versión o estar roto: cada campo se valida y, si no sirve, vuelve a su valor por defecto.
function sanitize(x: unknown): Prefs {
  const o = x && typeof x === 'object' ? (x as Record<string, unknown>) : {}
  const d = DEFAULT_PREFS
  return {
    accent: o.accent === 'custom' ? 'custom' : 'preset',
    hue: num(o.hue, 0, 360, d.hue),
    glow: num(o.glow, 0, 100, d.glow),
    motion: pick(o.motion, MOTIONS, d.motion),
    fx: pick(o.fx, FXS, d.fx),
    stars: num(o.stars, 0, 220, d.stars),
    nebula: bool(o.nebula, d.nebula),
    twinkle: bool(o.twinkle, d.twinkle),
    density: pick(o.density, DENSITIES, d.density),
    cards: pick(o.cards, CARDS, d.cards),
    radius: num(o.radius, 0, 32, d.radius),
    font: pick(o.font, FONTS, d.font),
    titleFx: bool(o.titleFx, d.titleFx),
    hangarScan: bool(o.hangarScan, d.hangarScan),
    hangarBeams: bool(o.hangarBeams, d.hangarBeams),
    hangarIntensity: num(o.hangarIntensity, 0, 100, d.hangarIntensity),
    hangarSpeed: num(o.hangarSpeed, 10, 100, d.hangarSpeed),
    hangarSecondary: num(o.hangarSecondary, 0, 360, d.hangarSecondary),
  }
}

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? sanitize(JSON.parse(raw)) : DEFAULT_PREFS
  } catch {
    return DEFAULT_PREFS
  }
}

const CARD_SCALE: Record<CardSize, number> = { sm: 0.82, md: 1, lg: 1.28 }
const ACCENT_VARS = ['--cyan', '--purple', '--pink', '--hg-ac', '--hg-ac2', '--hg-ac3'] as const

declare global {
  // Opciones que lee el cielo de estrellas de la extensión (public/ext/starrynight.js).
  var OverdrivePreferences: Record<string, unknown> | undefined
}

// Aplica las preferencias a la página: atributos en <html>, variables CSS y opciones del cielo.
function apply(p: Prefs) {
  const root = document.documentElement
  root.dataset.motion = p.motion
  root.dataset.fx = p.fx
  root.dataset.density = p.density
  root.dataset.font = p.font
  root.dataset.titlefx = p.titleFx ? 'on' : 'off'
  root.dataset.nebula = p.nebula ? 'on' : 'off'
  // Botones de HANGAR: un único estilo, "tech" (ver src/hangar-tech-buttons.css).
  root.dataset.hangarButtons = 'tech'
  root.style.setProperty('--hangar-energy', String(p.hangarIntensity / 100))
  root.style.setProperty('--hangar-duration', `${22 - p.hangarSpeed * .18}s`)
  root.style.setProperty('--hangar-secondary', `hsl(${p.hangarSecondary} 90% 68%)`)

  root.style.setProperty('--glow', String(p.glow / 60))
  root.style.setProperty('--card-scale', String(CARD_SCALE[p.cards]))
  root.style.setProperty('--fx-speed', p.motion === 'calm' ? '2.4' : '1')
  if (p.radius === DEFAULT_PREFS.radius) root.style.removeProperty('--radius')
  else root.style.setProperty('--radius', `${p.radius}px`)

  if (p.accent === 'custom') {
    const h = p.hue
    const main = `hsl(${h} 100% 68%)`
    const second = `hsl(${(h + 55) % 360} 85% 66%)`
    const third = `hsl(${(h + 300) % 360} 90% 68%)`
    const values = [main, second, third, main, second, third]
    ACCENT_VARS.forEach((name, i) => root.style.setProperty(name, values[i]))
  } else {
    ACCENT_VARS.forEach((name) => root.style.removeProperty(name))
  }

  const still = p.motion === 'off'
  globalThis.OverdrivePreferences = {
    ...(globalThis.OverdrivePreferences ?? {}),
    density: p.stars,
    twinkle: p.twinkle && !still,
    meteors: p.motion === 'full' && p.fx !== 'minimal'
  }
  document.dispatchEvent(new CustomEvent('od-preferences-change'))
}

let prefs: Prefs = load()
const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export const getPrefs = () => prefs

export function setPrefs(patch: Partial<Prefs>) {
  prefs = sanitize({ ...prefs, ...patch })
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // Sin almacenamiento los cambios duran solo esta visita.
  }
  apply(prefs)
  listeners.forEach((l) => l())
}

export const resetPrefs = () => setPrefs(DEFAULT_PREFS)

// Se llama una vez al arrancar, antes de pintar la interfaz.
export const initPrefs = () => apply(prefs)

export const usePrefs = () => useSyncExternalStore(subscribe, getPrefs)
