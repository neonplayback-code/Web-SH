import { useId, useState, type CSSProperties } from 'react'
import { MODES, MODE_LABELS, PRESETS, PRESET_LABELS, setMode, setPreset, useMode, usePreset, type Mode } from '../lib/mode'
import { FONT_OPTIONS, resetPrefs, setPrefs, usePrefs, type CardSize, type Density, type Fx, type Motion } from '../lib/prefs'
import { closePanel, useOpenPanel } from '../lib/ui'
import { Icon } from './Icon'
import { Modal } from './Modal'

const MODE_HINT: Record<Mode, string> = { astra: 'Cielo estrellado', overdrive: 'Código Matrix' }
const MODE_ICON: Record<Mode, string> = { astra: '✦', overdrive: '◈' }

type CzTab = 'look' | 'fx' | 'layout'
const CZ_TABS: { id: CzTab; label: string; icon: string }[] = [
  { id: 'look', label: 'Apariencia', icon: '✦' },
  { id: 'fx', label: 'Efectos y fondo', icon: '✧' },
  { id: 'layout', label: 'Diseño y texto', icon: '▤' },
]

interface SegProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}

// Selector de una opción entre varias.
function Seg<T extends string>({ label, value, options, onChange }: SegProps<T>) {
  return (
    <div className="cz-row">
      <span className="cz-label">{label}</span>
      <div className="cz-seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={value === o.value ? 'is-on' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface RangeProps {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  unit?: string
  hue?: boolean
  onChange: (v: number) => void
}

// Barra deslizante con su valor. Los controles no van dentro de <label> para no heredar los estilos de formulario de la extensión.
function RangeRow({ label, hint, value, min, max, unit = '', hue, onChange }: RangeProps) {
  const id = useId()
  const fill = `${((value - min) / (max - min)) * 100}%`
  return (
    <div className="cz-row">
      <label className="cz-label" htmlFor={id}>{label}{hint && <small>{hint}</small>}</label>
      <span className={hue ? 'cz-range cz-hue' : 'cz-range'}>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          value={value}
          style={{ '--fill': fill } as CSSProperties}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <output htmlFor={id}>{value}{unit}</output>
      </span>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId()
  return (
    <div className="cz-row">
      <label className="cz-label" htmlFor={id}>{label}</label>
      <input id={id} className="cz-switch" type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </div>
  )
}

// Ventana de personalización: cada ajuste se aplica al instante y se recuerda en este navegador.
export function CustomizeDialog() {
  const open = useOpenPanel() === 'customize'
  const mode = useMode()
  const preset = usePreset()
  const prefs = usePrefs()
  const [tab, setTab] = useState<CzTab>('look')

  return (
    <Modal open={open} onClose={closePanel} kicker="PERSONALIZAR" title="Hazla tuya" wide>
      <div className="cz-tabs" role="tablist" aria-label="Secciones de personalización">
        {CZ_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`cz-tab${tab === t.id ? ' is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="cz-tab-ic" aria-hidden="true">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="cz-body" role="tabpanel">
        {tab === 'look' && <>
        <section className="cz-block">
          <h3>Modo</h3>
          <div className="cz-modes" role="radiogroup" aria-label="Modo de interfaz">
            {MODES.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? 'is-on' : ''} onClick={() => setMode(m)}>
                <span className="cz-mode-top">
                  <b><span aria-hidden="true">{MODE_ICON[m]}</span> {MODE_LABELS[m]}</b>
                  {mode === m && <span className="cz-badge">Activo</span>}
                </span>
                <small>{MODE_HINT[m]}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="cz-block">
          <h3>Color</h3>
          <div className="cz-colors" role="radiogroup" aria-label="Color de acento">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                className={`theme-swatch cz-swatch${prefs.accent === 'preset' && preset === p ? ' is-selected' : ''}`}
                data-theme-choice={p}
                aria-checked={prefs.accent === 'preset' && preset === p}
                aria-label={PRESET_LABELS[p]}
                title={PRESET_LABELS[p]}
                onClick={() => {
                  setPrefs({ accent: 'preset' })
                  setPreset(p)
                }}
              />
            ))}
            <button
              type="button"
              role="radio"
              className={prefs.accent === 'custom' ? 'cz-swatch cz-custom is-selected' : 'cz-swatch cz-custom'}
              aria-checked={prefs.accent === 'custom'}
              aria-label="Color personalizado"
              title="Color personalizado"
              onClick={() => setPrefs({ accent: 'custom' })}
            />
          </div>
          <RangeRow
            label="Tono"
            hint="Mueve la barra para crear tu propio color"
            value={prefs.hue}
            min={0}
            max={360}
            unit="°"
            hue
            onChange={(v) => setPrefs({ accent: 'custom', hue: v })}
          />
          <RangeRow label="Brillo" value={prefs.glow} min={0} max={100} unit="%" onChange={(v) => setPrefs({ glow: v })} />
        </section>
        </>}

        {tab === 'fx' && <>
        <section className="cz-block">
          <h3>Movimiento y efectos</h3>
          <Seg<Motion>
            label="Animaciones"
            value={prefs.motion}
            options={[{ value: 'full', label: 'Completas' }, { value: 'calm', label: 'Suaves' }, { value: 'off', label: 'Quietas' }]}
            onChange={(v) => setPrefs({ motion: v })}
          />
          <Seg<Fx>
            label="Botones y tarjetas"
            value={prefs.fx}
            options={[{ value: 'cosmic', label: 'Cósmicos' }, { value: 'soft', label: 'Suaves' }, { value: 'minimal', label: 'Mínimos' }]}
            onChange={(v) => setPrefs({ fx: v })}
          />
          <Toggle label="Degradado animado en títulos" checked={prefs.titleFx} onChange={(v) => setPrefs({ titleFx: v })} />
        </section>

        {mode === 'overdrive' && <section className="cz-block hangar-settings">
          <h3>HANGAR · Fondo Matrix</h3>
          <p className="hangar-settings-hint">Ajusta la lluvia de código. Los cambios se ven al instante y se guardan en este navegador.</p>
          <div className="hangar-presets">
            <button type="button" onClick={() => { setPreset('ice'); setPrefs({ accent: 'preset', hangarSecondary: 275, hangarIntensity: 65, hangarBeams: true, hangarScan: true }) }}><span className="hp-ic" aria-hidden="true">◈</span><span className="hp-tx"><b>Hielo</b><small>Cian y violeta</small></span></button>
            <button type="button" onClick={() => setPrefs({ accent: 'custom', hue: 135, hangarSecondary: 175, hangarIntensity: 80, hangarBeams: false, hangarScan: true })}><span className="hp-ic" aria-hidden="true">⌘</span><span className="hp-tx"><b>Clásico</b><small>Verde fósforo</small></span></button>
            <button type="button" onClick={() => setPrefs({ accent: 'custom', hue: 345, hangarSecondary: 265, hangarIntensity: 75, hangarBeams: true, hangarScan: true })}><span className="hp-ic" aria-hidden="true">⚡</span><span className="hp-tx"><b>Reactor</b><small>Rojo y violeta</small></span></button>
          </div>
          <RangeRow label="Color secundario" value={prefs.hangarSecondary} min={0} max={360} unit="°" hue onChange={v => setPrefs({hangarSecondary:v})} />
          <RangeRow label="Intensidad de la lluvia" value={prefs.hangarIntensity} min={0} max={100} unit="%" onChange={v => setPrefs({hangarIntensity:v})} />
          <RangeRow label="Velocidad de la lluvia" value={prefs.hangarSpeed} min={10} max={100} unit="%" onChange={v => setPrefs({hangarSpeed:v})} />
          <Toggle label="Haces de luz" checked={prefs.hangarBeams} onChange={v => setPrefs({hangarBeams:v})} />
          <Toggle label="Barrido de escáner" checked={prefs.hangarScan} onChange={v => setPrefs({hangarScan:v})} />
        </section>}

        {mode === 'astra' && <section className="cz-block">
          <h3>Fondo <small>(ASTRA)</small></h3>
          <RangeRow label="Cantidad de estrellas" value={prefs.stars} min={0} max={220} unit="%" onChange={(v) => setPrefs({ stars: v })} />
          <Toggle label="Nebulosas" checked={prefs.nebula} onChange={(v) => setPrefs({ nebula: v })} />
          <Toggle label="Estrellas que titilan" checked={prefs.twinkle} onChange={(v) => setPrefs({ twinkle: v })} />
        </section>}
        </>}

        {tab === 'layout' && <>
        <section className="cz-block">
          <h3>Diseño</h3>
          <Seg<Density>
            label="Espaciado"
            value={prefs.density}
            options={[{ value: 'compact', label: 'Compacto' }, { value: 'cozy', label: 'Cómodo' }, { value: 'roomy', label: 'Amplio' }]}
            onChange={(v) => setPrefs({ density: v })}
          />
          <Seg<CardSize>
            label="Tamaño de tarjetas"
            value={prefs.cards}
            options={[{ value: 'sm', label: 'Pequeñas' }, { value: 'md', label: 'Medianas' }, { value: 'lg', label: 'Grandes' }]}
            onChange={(v) => setPrefs({ cards: v })}
          />
          <RangeRow label="Redondeo de esquinas" value={prefs.radius} min={0} max={32} unit="px" onChange={(v) => setPrefs({ radius: v })} />
        </section>

        <section className="cz-block">
          <h3>Tipografía</h3>
          <div className="cz-fonts" role="radiogroup" aria-label="Tipografía">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={prefs.font === f.value}
                className={prefs.font === f.value ? 'is-on' : ''}
                onClick={() => setPrefs({ font: f.value })}
              >
                <span style={{ fontFamily: f.sample }}>Aa</span>
                <small>{f.label}</small>
              </button>
            ))}
          </div>
        </section>
        </>}
      </div>

      <footer className="cz-foot">
        <button type="button" className="ghost-button" onClick={resetPrefs}>
          <Icon name="back" /><span>Restablecer todo</span>
        </button>
        <button type="button" className="save-button" onClick={closePanel}>Listo</button>
      </footer>
    </Modal>
  )
}
