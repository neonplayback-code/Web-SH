// Efectos de interacción de HANGAR (los estilos están en hangar-tech-buttons.css y hangar-neo.css):
//  · Foco: mientras el cursor está sobre una tecla o una tarjeta, guarda su posición dentro de ella en variables CSS
//    (--px / --py en las teclas, --cx / --cy en las tarjetas) para que la luz lo siga.
//  · Descifrado: al entrar en una tecla, su texto se baraja un instante y se recompone de izquierda a derecha.
// Solo actúa en modo HANGAR, con ratón, y respeta "Animaciones: Quietas", "Botones y tarjetas: Mínimos"
// y prefers-reduced-motion.

const KEYS = '.tab, .ghost-button, .add-button, .save-button, .launcher-pill, .icon-button, .sort-btn, .pulse-customize, .crumb-back, .like-btn, .cz-seg > *, .hangar-presets > *, .cz-modes > *, .cz-fonts > *, .pe-check'
const CARDS = '.utility-card, .item-step-card, .home-hero'
// Teclas con texto monoespaciado: barajar los caracteres no cambia su ancho.
const DECODE = '.tab, .ghost-button, .add-button, .save-button, .launcher-pill, .sort-btn, .pulse-customize, .crumb-back, .cz-seg > *'
const GLYPHS = '01<>/\\[]{}=+*#%&$@'
const DECODE_MS = 260

const root = document.documentElement
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const decoding = new WeakSet<Element>()

function decode(el: Element) {
  if (decoding.has(el)) return
  const items: { node: Text; text: string; shown: string }[] = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.nodeValue ?? ''
    if (text.trim().length > 1) items.push({ node: n as Text, text, shown: text })
  }
  if (!items.length) return
  decoding.add(el)
  const start = performance.now()
  let lastStep = -1
  const tick = (now: number) => {
    const k = Math.min(1, (now - start) / DECODE_MS)
    const step = Math.floor((now - start) / 32)
    let alive = false
    for (const item of items) {
      // Si React cambió el texto mientras tanto, ese nodo ya no se toca.
      if (item.node.nodeValue !== item.shown) continue
      alive = true
      if (step === lastStep && k < 1) continue
      const keep = Math.floor(item.text.length * k)
      item.shown = k >= 1 ? item.text : item.text.slice(0, keep) + Array.from(item.text.slice(keep), (ch) => (ch === ' ' ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join('')
      item.node.nodeValue = item.shown
    }
    lastStep = step
    if (k < 1 && alive) requestAnimationFrame(tick)
    else decoding.delete(el)
  }
  requestAnimationFrame(tick)
}

function place(el: HTMLElement, x: number, y: number, nameX: string, nameY: string) {
  const r = el.getBoundingClientRect()
  el.style.setProperty(nameX, `${Math.round(x - r.left)}px`)
  el.style.setProperty(nameY, `${Math.round(y - r.top)}px`)
}
function clear(el: HTMLElement | null, nameX: string, nameY: string) {
  el?.style.removeProperty(nameX)
  el?.style.removeProperty(nameY)
}

let started = false
export function initHangarFx() {
  if (started) return
  started = true
  let key: HTMLElement | null = null
  let card: HTMLElement | null = null
  let pending: PointerEvent | null = null
  let raf = 0

  const reset = () => {
    clear(key, '--px', '--py')
    clear(card, '--cx', '--cy')
    key = card = null
  }

  const update = () => {
    raf = 0
    const e = pending
    pending = null
    if (!e) return
    if (root.dataset.mode !== 'overdrive' || e.pointerType !== 'mouse') return reset()
    const target = e.target instanceof Element ? e.target : null
    const nextKey = target?.closest<HTMLElement>(KEYS) ?? null
    const nextCard = target?.closest<HTMLElement>(CARDS) ?? null
    if (nextKey !== key) {
      clear(key, '--px', '--py')
      key = nextKey
      const lively = !reduced.matches && root.dataset.motion !== 'off' && root.dataset.fx !== 'minimal'
      if (key && lively && key.matches(DECODE)) decode(key)
    }
    if (nextCard !== card) {
      clear(card, '--cx', '--cy')
      card = nextCard
    }
    if (key) place(key, e.clientX, e.clientY, '--px', '--py')
    if (card) place(card, e.clientX, e.clientY, '--cx', '--cy')
  }

  window.addEventListener('pointermove', (e) => {
    pending = e
    raf ||= requestAnimationFrame(update)
  }, { passive: true })
  root.addEventListener('pointerleave', reset)
  document.addEventListener('od-mode-change', reset)
}
