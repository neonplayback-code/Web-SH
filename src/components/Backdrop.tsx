import { useCallback, useEffect, useState } from 'react'
import { AstraSky } from './AstraSky'
import { HangarScene } from './HangarScene'

interface Sky {
  refresh(): void
}

declare global {
  interface Window {
    OverdriveStarryNight?: { create(canvas: HTMLCanvasElement): Sky }
  }
}

// El cielo se crea una sola vez aunque React monte el componente dos veces (StrictMode).
let sky: Sky | undefined

// Fondo de la extensión: cielo de estrellas y cometas (ASTRA) y circuitos, cuadrícula y escaneo (HANGAR).
// El dibujo lo hacen los scripts originales; aquí solo se monta el mismo marcado.
export function Backdrop() {
  // El cielo de ASTRA es un shader WebGL (AstraSky). Si el navegador no lo soporta, vuelve el cielo 2D original.
  const [legacy, setLegacy] = useState(false)
  const onUnsupported = useCallback(() => setLegacy(true), [])

  useEffect(() => {
    if (!legacy) return
    const canvas = document.getElementById('particles') as HTMLCanvasElement | null
    if (canvas && !sky) sky = window.OverdriveStarryNight?.create(canvas)
  }, [legacy])

  useEffect(() => {
    const refresh = () => sky?.refresh()
    document.addEventListener('od-mode-change', refresh)

    // Los efectos de HANGAR leen el DOM al cargar, así que se cargan cuando ya está montado.

    const ready = window.setTimeout(() => document.body.classList.add('is-ready'), 1800)
    return () => {
      document.removeEventListener('od-mode-change', refresh)
      window.clearTimeout(ready)
    }
  }, [])

  return (
    <>
      <HangarScene />
      {!legacy && <AstraSky onUnsupported={onUnsupported} />}
      <canvas id="particles" aria-hidden="true" />
      <div className="aurora aurora-one" aria-hidden="true" />
      <div className="aurora aurora-two" aria-hidden="true" />
      <div className="grid-glow" aria-hidden="true" />
      <div className="astra-deco" aria-hidden="true">
        <i className="nebula nebula-a" /><i className="nebula nebula-b" />
        <i className="comet-streak cs-a" /><i className="comet-streak cs-b" />
      </div>
      <i className="hangar-line" aria-hidden="true" />
    </>
  )
}
