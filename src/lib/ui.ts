import { useSyncExternalStore } from 'react'

// Qué ventana está abierta. Cualquier botón puede abrirlas sin pasar props por toda la página.
export type Panel = 'customize' | 'profile' | null

// /?personalizar abre la ventana de personalización directamente (útil para compartir el enlace).
let current: Panel = new URLSearchParams(window.location.search).has('personalizar') ? 'customize' : null
const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function openPanel(panel: Panel) {
  current = panel
  listeners.forEach((l) => l())
}

export const closePanel = () => openPanel(null)
export const useOpenPanel = () => useSyncExternalStore(subscribe, () => current)
