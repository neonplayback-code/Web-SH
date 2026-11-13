import { useCallback, useEffect, useRef, useState } from 'react'
import { useMode, usePreset } from '../lib/mode'
import { usePrefs } from '../lib/prefs'
import { HangarMatrix } from './HangarMatrix'

// Fondo de HANGAR: la lluvia de código Matrix. Con "Intensidad" a cero no se dibuja nada.
export function HangarScene() {
  const mode = useMode()
  const preset = usePreset()
  const prefs = usePrefs()
  const ref = useRef<HTMLCanvasElement>(null)
  // La lluvia de código es un shader WebGL (HangarMatrix). Si el navegador no lo soporta, vuelve la lluvia 2D de abajo.
  const [legacy, setLegacy] = useState(false)
  const onUnsupported = useCallback(() => setLegacy(true), [])
  const rain = prefs.hangarIntensity > 0
  useEffect(() => {
    const canvas = ref.current
    if (mode !== 'overdrive' || !canvas || !legacy || !rain) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0, last = 0, step = 0, width = 0, height = 0
    const chars = '01{}[]<>/;=+アカサタナハマヤラワ'
    let drops: { x: number; y: number; speed: number; seed: number }[] = []
    const resize = () => {
      width = innerWidth; height = innerHeight
      const dpr = Math.min(devicePixelRatio || 1, 1.5)
      canvas.width = width * dpr; canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drops = Array.from({length: Math.ceil(width / 38)}, (_, i) => ({x: i * 38, y: ((i * 137) % (height + 240)) - 240, speed: .5 + (i % 5) * .17, seed: i * 19}))
    }
    const render = (time: number) => {
      if (document.hidden) return
      const still = reduced.matches || prefs.motion === 'off'
      if (time - last > 50 || still) {
        const delta = Math.min(100, time - last || 50) / 50
        last = time
        ctx.clearRect(0, 0, width, height)
        ctx.font = '12px Consolas, monospace'
        const color = getComputedStyle(document.documentElement).getPropertyValue('--hg-ac').trim()
        for (const d of drops) {
          for (let n = 0; n < 13; n++) {
            ctx.globalAlpha = (1 - n / 13) * .55
            ctx.fillStyle = n === 0 ? '#ddffef' : color
            ctx.fillText(chars[(d.seed + n * 7 + Math.floor(step / 12)) % chars.length], d.x, d.y - n * 18)
          }
          if (!still) d.y += delta * d.speed * (prefs.hangarSpeed / 9) * (prefs.motion === 'calm' ? .3 : 1)
          if (d.y > height + 240) d.y = -20
        }
        step++
      }
      if (!still) frame = requestAnimationFrame(render)
    }
    const resume = () => { cancelAnimationFrame(frame); last = 0; if (!document.hidden) frame = requestAnimationFrame(render) }
    resize(); resume()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', resume)
    reduced.addEventListener('change', resume)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', resume); reduced.removeEventListener('change', resume) }
  }, [mode, preset, prefs, legacy, rain])

  if (mode !== 'overdrive') return null
  return <div className="hg-environment" aria-hidden="true">
    {rain && (legacy ? <canvas ref={ref} className="hg-code-rain" /> : <HangarMatrix onUnsupported={onUnsupported} />)}
  </div>
}

export function HangarConsole() {
  const mode = useMode()
  if (mode !== 'overdrive') return null
  return <div className="hg-console-art" aria-hidden="true">
    <div className="hg-bay-label"><span>◈ HANGAR / BAHÍA 01</span><span>PERFIL DE CREADOR</span></div>
    <div className="hg-terminal"><span><b>~/hangar</b> $ build --creative</span><span className="hg-code-line">{'const ideas = await create();'}<i /></span></div>
  </div>
}
