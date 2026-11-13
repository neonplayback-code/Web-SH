import { useSyncExternalStore } from 'react'

// Modo de interfaz (ASTRA o HANGAR, que internamente se llama "overdrive") y paleta de ambiente.
// Mismos nombres de atributos que la extensión: html[data-mode] y html[data-theme].

export const MODES = ['astra', 'overdrive'] as const
export type Mode = (typeof MODES)[number]
export const MODE_LABELS: Record<Mode, string> = { astra: 'ASTRA', overdrive: 'HANGAR' }

export const PRESETS = ['ice', 'toxic', 'ember', 'violet', 'white'] as const
export type Preset = (typeof PRESETS)[number]
export const PRESET_LABELS: Record<Preset, string> = {
  ice: 'Hielo',
  toxic: 'Tóxico',
  ember: 'Brasa',
  violet: 'Violeta',
  white: 'Blanco',
}

const MODE_KEY = 'od-uimode'
const THEME_KEY = 'od-theme'
const root = document.documentElement

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Sin almacenamiento la elección solo dura esta visita.
  }
}

export const getMode = (): Mode => MODES.find((m) => m === root.dataset.mode) ?? 'astra'
export const getPreset = (): Preset => PRESETS.find((p) => p === root.dataset.theme) ?? 'ice'

// El eclipse de la extensión: el nuevo modo aparece como un círculo que crece desde donde se pulsó.
let origin: { x: number; y: number } | null = null
document.addEventListener('pointerdown', (e) => { origin = { x: e.clientX, y: e.clientY } }, { capture: true, passive: true })

function apply(next: Mode) {
  root.dataset.mode = next
  remember(MODE_KEY, next)
  document.dispatchEvent(new CustomEvent('od-mode-change', { detail: { mode: next } }))
}

export function setMode(next: Mode) {
  if (getMode() === next) return
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced || typeof document.startViewTransition !== 'function') return apply(next)

  const from = origin ?? { x: innerWidth / 2, y: innerHeight / 2 }
  origin = null
  try {
    const transition = document.startViewTransition(() => apply(next))
    transition.ready.then(() => {
      const radius = Math.hypot(Math.max(from.x, innerWidth - from.x), Math.max(from.y, innerHeight - from.y))
      root.animate(
        { clipPath: [`circle(0px at ${from.x}px ${from.y}px)`, `circle(${radius}px at ${from.x}px ${from.y}px)`] },
        { duration: 760, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' }
      )
    }).catch(() => {})
  } catch {
    apply(next)
  }
}

// Siguiente (o anterior) modo en el orden del selector, dando la vuelta al final.
export function shiftMode(from: Mode, step: number): Mode {
  return MODES[(MODES.indexOf(from) + step + MODES.length) % MODES.length]
}

export function setPreset(next: Preset) {
  root.dataset.theme = next
  remember(THEME_KEY, next)
  document.dispatchEvent(new CustomEvent('od-theme-change'))
}

function subscribe(callback: () => void) {
  document.addEventListener('od-mode-change', callback)
  document.addEventListener('od-theme-change', callback)
  return () => {
    document.removeEventListener('od-mode-change', callback)
    document.removeEventListener('od-theme-change', callback)
  }
}

export const useMode = () => useSyncExternalStore(subscribe, getMode)
export const usePreset = () => useSyncExternalStore(subscribe, getPreset)
