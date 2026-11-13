import { useEffect, type KeyboardEvent } from 'react'
import { MODES, MODE_LABELS, getMode, setMode, shiftMode, useMode, type Mode } from '../lib/mode'

const ICONS: Record<Mode, string> = { astra: '✦', overdrive: '◈' }
const STEP_BY_KEY: Record<string, number> = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }

// Selector ASTRA / HANGAR de la barra superior: ratón, flechas del teclado y Alt+M.
export function ModeSelector() {
  const mode = useMode()

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.key.toLowerCase() !== 'm') return
      const t = e.target
      if (t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return
      e.preventDefault()
      setMode(shiftMode(getMode(), 1))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: Mode | undefined
    if (e.key === 'Home') next = MODES[0]
    else if (e.key === 'End') next = MODES[MODES.length - 1]
    else if (e.key in STEP_BY_KEY) next = shiftMode(mode, STEP_BY_KEY[e.key])
    if (!next) return
    e.preventDefault()
    setMode(next)
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-set-mode="${next}"]`)?.focus()
  }

  return (
    <div className="mode-selector" role="radiogroup" aria-label="Modo de interfaz" data-active={mode} onKeyDown={onKeyDown}>
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          className="mode-btn"
          role="radio"
          aria-checked={mode === m}
          tabIndex={mode === m ? 0 : -1}
          data-set-mode={m}
          title={`Modo ${MODE_LABELS[m]} (Alt+M)`}
          onClick={() => setMode(m)}
        >
          <span aria-hidden="true">{ICONS[m]}</span> {MODE_LABELS[m]}
        </button>
      ))}
      <i className="mode-thumb" aria-hidden="true" />
    </div>
  )
}
