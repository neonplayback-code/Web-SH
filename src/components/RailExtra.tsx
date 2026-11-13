export interface RailStat {
  label: string
  value: number
}

// Campos numerados del riel lateral de HANGAR (en ASTRA el CSS los oculta).
// El medidor de FPS y la red los rellena el script hangar-fx.js con valores reales.
export function RailExtra({ stats = [] }: { stats?: RailStat[] }) {
  return (
    <section className="rail-extra" aria-label="Panel de control">
      <div className="rail-field">
        <div className="field-label"><span className="idx">02</span>ATAJOS</div>
        <ul className="key-list">
          <li><kbd>/</kbd><span>Buscador</span></li>
          <li><kbd>Alt</kbd><kbd>M</kbd><span>Modo</span></li>
        </ul>
      </div>
      <div className="rail-field hg-telemetry">
        <div className="field-label"><span className="idx">03</span>TELEMETRÍA</div>
        <div className="hg-meter">
          <canvas id="hg-fps" width={280} height={56} aria-hidden="true" />
          <div className="hg-meter-read"><span>FPS</span><b id="hg-fps-val">--</b></div>
        </div>
        {stats.length > 0 && (
          <dl className="hg-stats">
            {stats.map((s) => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}
          </dl>
        )}
        <ul className="hg-status"><li><i />Red <b id="hg-net">—</b></li></ul>
      </div>
    </section>
  )
}
