import { useEffect, useRef } from 'react'
import { compile, link, parseColor, type RGB } from '../lib/gl'
import { getPrefs } from '../lib/prefs'

// Fondo de HANGAR: lluvia de código tipo Matrix dibujada en un shader WebGL a resolución nativa.
//  · Tres capas en profundidad (lejana, media y cercana desenfocada) con paralaje al mover el cursor.
//  · Cabezas al rojo blanco con halo, estelas que se apagan y glifos que mutan; detrás, un muro de código tenue.
//  · Columnas del color secundario, ráfagas que encienden una columna entera y una franja de color desplazada.
//  · Onda expansiva al hacer clic (y una de ambiente cada pocos segundos), aura alrededor del cursor,
//    barrido de escáner, haces de luz en diagonal, una ola que recorre el muro y desgarros de señal.
// Los glifos salen de un atlas generado en un canvas 2D (katakana reflejado, cifras y símbolos).
// Los colores son el acento y el secundario de HANGAR; velocidad, escáner y haces siguen a Personalizar.

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uScale, uScan, uBeams, uGain, uQ;
uniform vec3 uC1, uC2;
uniform vec3 uMouse;   // posición en píxeles (y hacia abajo) y fuerza 0-1
uniform vec4 uPulse;   // último clic: posición, instante y fuerza
uniform sampler2D uAtlas;

float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y);
}

// Un glifo del atlas (16 × 8). El sesgo de mipmap lo desenfoca: sirve de halo y de profundidad de campo.
float glyph(vec2 f, float gi, float bias){
  gi = mod(gi, 128.);
  vec2 c = vec2(mod(gi, 16.), floor(gi / 16.));
  vec2 q = clamp((f - .5) * 1.06 + .5, .03, .97);
  return texture2D(uAtlas, (c + q) / vec2(16., 8.), bias).r;
}

// Una capa de lluvia. "boost" enciende el muro de código (ondas, cursor, escáner).
vec3 layer(vec2 p, float cell, float speed, float seed, float bias, float density, float boost){
  vec2 g = p / vec2(cell * .62, cell);
  float col = floor(g.x);
  float hc = h11(col * .731 + seed * 17.3);
  if (hc > density) return vec3(0.);
  g.y += h11(col * 5.3 + seed) * 7.;
  float row = floor(g.y);
  vec2 f = fract(g);

  // Dos gotas por columna, cada una con su largo, su pausa y su ritmo. Bajan celda a celda.
  float sp = speed * mix(.5, 1.4, h11(col * 1.37 + seed * 3.1));
  float lum = 0., head = 0.;
  for (int k = 0; k < 2; k++){
    float fk = float(k);
    float len = mix(7., 30., h11(col * 2.11 + fk * 13.7 + seed));
    float period = len + mix(14., 70., h11(col * 3.31 + fk * 5.1 + seed * 2.));
    float pos = uTime * sp * (1. + fk * .37) + h11(col * 7.7 + fk * 3.3 + seed) * period;
    float d = mod(floor(pos) - row, period);
    lum = max(lum, pow(max(1. - d / len, 0.), 1.7));
    head = max(head, d < .5 ? .4 + .6 * smoothstep(0., .3, fract(pos)) : (d < 1.5 ? .35 : 0.));
  }

  // Ráfaga: muy de vez en cuando la columna entera se enciende y se apaga.
  float bt = uTime * 1.3 + hc * 5.;
  float burst = step(.988, h21(vec2(col, floor(bt)) + seed)) * (1. - fract(bt));
  burst *= burst;

  // El glifo de cada celda cambia a su ritmo; junto a la cabeza parpadea deprisa.
  float hcell = h21(vec2(col, row) + seed * 31.7);
  float rate = mix(.12, 1.1, hcell * hcell) + head * 8.;
  float gi = floor(hcell * 128.) + floor(uTime * rate + hcell * 20.) * 37.;
  float gm = glyph(f, gi, bias);
  float halo = glyph(f, gi, bias + 2.7);

  // Color de la columna, más saturado que el del tema para que la estela no salga gris; aclara hacia la cabeza.
  vec3 base = mix(uC1, uC2, step(.86, h11(col * 9.1 + seed * 5.)));
  vec3 deep = base * base / max(max(base.r, max(base.g, base.b)), .05);
  float lit = lum + boost * (.25 + .75 * hcell) + burst * .7;
  float wall = .035 + .04 * hcell;
  vec3 ink = mix(deep, base, clamp(lit * lit, 0., 1.));
  vec3 c = ink * gm * (wall + lit * 1.05 + lit * lit * .7);
  // El halo se recoge hacia el centro de la celda: redondo, no un recuadro.
  vec2 fo = f - .5;
  halo *= exp(-dot(fo, fo) * 5.5);
  c += ink * halo * lit * .9;
  c += vec3(1.) * head * (gm * 1.3 + halo * 1.1);
  if (uQ < .5) c += uC2 * glyph(f + vec2(.09, 0.), gi, bias) * lit * .3;
  float cx = (f.x - .5) * 3.;
  c += base * lum * exp(-cx * cx) * .05;
  return c;
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 p = vec2(fc.x, uRes.y - fc.y);
  vec2 uv = p / uRes;
  vec2 q = (p - .5 * uRes) / uRes.y;
  float t = uTime;

  // Desgarro de señal: unas bandas horizontales se desplazan un instante.
  float gt = floor(t * .8), gph = fract(t * .8);
  float gOn = step(.84, h11(gt * 3.7 + 1.)) * step(gph, .2);
  float band = floor(uv.y * 16. + h11(gt + 4.) * 9.);
  float tear = gOn * step(.62, h11(band * 1.7 + gt * 5.3)) * (h11(band * 3.1 + gt) - .5);
  p.x += tear * 120. * uScale;

  // Ondas expansivas: la del último clic y una de ambiente. Empujan los glifos y los encienden al pasar.
  float ring = 0.;
  vec2 push = vec2(0.);
  {
    vec2 d = p - uPulse.xy;
    float r = length(d) + .001, age = max(t - uPulse.z, 0.);
    float x = (r - age * 700. * uScale) / (52. * uScale);
    float w = exp(-x * x) * exp(-age * 1.2) * uPulse.w;
    ring += w; push += d / r * w;
  }
  {
    float T = 11., cyc = floor(t / T), age = fract(t / T) * T;
    vec2 d = p - vec2(h11(cyc * 1.7 + .3), h11(cyc * 2.9 + .7)) * uRes;
    float r = length(d) + .001;
    float x = (r - age * 520. * uScale) / (70. * uScale);
    float w = exp(-x * x) * exp(-age * .7) * .6;
    ring += w; push += d / r * w;
  }
  p += push * 9. * uScale;

  // Lo que enciende el muro: ondas, cursor, escáner y una ola lenta en diagonal.
  vec2 md = (p - uMouse.xy) / (170. * uScale);
  float aura = exp(-dot(md, md)) * uMouse.z;
  float sy = fract(t * .06) * 1.3 - .15;
  float sd = (uv.y - sy) * 22.;
  float scan = uScan * exp(-sd * sd);
  float wv = .5 + .5 * sin(q.x * 2.4 + q.y * 3.1 - t * .4);
  wv *= wv; wv *= wv; wv *= wv;
  float boost = ring * 1.3 + aura * .6 + scan * .55 + wv * .16;

  // Tres capas con paralaje. La cercana va desenfocada y solo ocupa algunas columnas.
  vec2 par = (uMouse.xy - .5 * uRes) * uMouse.z;
  vec3 rain = layer(p - par * .012, 11. * uScale, 5., 1., -.5, 1., boost) * .32;
  rain += layer(p - par * .03, 18. * uScale, 9., 2., -.6, .9, boost) * .85;
  if (uQ < 1.5) rain += layer(p - par * .07, 30. * uScale, 15., 3., .8, .16, boost * .6) * .3;
  // El centro, donde va el contenido, queda algo más tenue que los márgenes.
  rain *= mix(.5, 1., smoothstep(.2, .5, abs(uv.x - .5))) * uGain;

  // Fondo: casi negro, con niebla del tema que se mueve despacio.
  vec3 col = vec3(.008, .013, .02) + uC1 * .018 * (1. - uv.y * .5);
  col += uC1 * .05 * smoothstep(.55, 1.1, uv.y) + uC2 * .025 * (1. - smoothstep(-.2, .5, uv.y));
  float fog = noise(q * 2.2 + vec2(t * .03, -t * .05)) * noise(q * 4.7 - vec2(t * .02, t * .04));
  col += mix(uC1, uC2, .35) * fog * .07;

  // Haces de luz en diagonal.
  vec2 bq = vec2(q.x * .9 + q.y * .44, -q.x * .44 + q.y * .9);
  float b1 = .5 + .5 * sin(bq.x * 3.4 + t * .11 + noise(vec2(bq.x * 1.5, t * .07)) * 2.5);
  float b2 = .5 + .5 * sin(bq.x * 2.1 - t * .08 + 2.);
  b1 = b1 * b1 * b1; b1 *= b1;
  b2 = b2 * b2 * b2; b2 *= b2;
  col += (uC1 * b1 + uC2 * b2) * .05 * uBeams * (.55 + .45 * noise(vec2(bq.y * 3. - t * .3, bq.x * 6.)));

  // Línea del escáner, anillo de la onda y tinte del desgarro.
  float ln = (uv.y - sy) * uRes.y / (1.5 * uScale);
  col += uC1 * uScan * (exp(-ln * ln) * .35 + exp(-sd * sd) * .03);
  col += mix(uC1, vec3(1.), .4) * ring * .1;
  col += uC2 * abs(tear) * .12;
  col += rain;

  // Viñeta, tono y dither.
  vec2 vq = q * vec2(.6, .85);
  col *= max(1. - dot(vq, vq) * .7, 0.);
  col = 1. - exp(-max(col, 0.) * 1.25);
  col += (h21(fc + fract(t) * 91.) - .5) / 255.;
  gl_FragColor = vec4(col, 1.);
}`

const ATLAS_COLS = 16, ATLAS_ROWS = 8, ATLAS_CELL = 64
const KANA = Array.from({ length: 56 }, (_, i) => String.fromCharCode(0xff66 + i)).join('')
const ASCII = '0123456789ZXCVBNMQWRTYLKJHGFDSAP:.=*+-<>|"_/\\[]{}#%&$@'
const ATLAS_FONT = '"Noto Sans Mono CJK JP", "Noto Sans CJK JP", "MS Gothic", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Cascadia Mono", Consolas, monospace'

// Atlas de 128 glifos blancos sobre negro. Si el sistema no tiene katakana (saldrían cuadros iguales), usa solo ASCII,
// con la mitad de los glifos reflejados.
function buildAtlas(): HTMLCanvasElement {
  const canvas = Object.assign(document.createElement('canvas'), { width: ATLAS_COLS * ATLAS_CELL, height: ATLAS_ROWS * ATLAS_CELL })
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return canvas
  ctx.font = `600 ${ATLAS_CELL * .74}px ${ATLAS_FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const shape = (ch: string) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, ATLAS_CELL, ATLAS_CELL)
    ctx.fillStyle = '#fff'
    ctx.fillText(ch, ATLAS_CELL / 2, ATLAS_CELL / 2)
    return ctx.getImageData(0, 0, ATLAS_CELL, ATLAS_CELL).data.join()
  }
  const hasKana = shape(KANA[11]) !== shape(KANA[40])
  const chars = hasKana ? KANA + ASCII : ASCII

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#fff'
  for (let i = 0; i < ATLAS_COLS * ATLAS_ROWS; i++) {
    const ch = chars[i % chars.length]
    // Cada glifo se estira al mismo ancho (en pantalla la celda es más estrecha que alta) y el katakana va reflejado.
    const stretch = (ATLAS_CELL * .78) / Math.max(ctx.measureText(ch).width, 1)
    ctx.save()
    ctx.translate((i % ATLAS_COLS + .5) * ATLAS_CELL, (Math.floor(i / ATLAS_COLS) + .5) * ATLAS_CELL)
    ctx.scale((hasKana ? KANA.includes(ch) : i % 2 === 1) ? -stretch : stretch, 1)
    ctx.fillText(ch, 0, 2)
    ctx.restore()
  }
  return canvas
}

const UNIFORMS = ['uRes', 'uTime', 'uScale', 'uScan', 'uBeams', 'uGain', 'uQ', 'uC1', 'uC2', 'uMouse', 'uPulse', 'uAtlas'] as const

export function HangarMatrix({ onUnsupported }: { onUnsupported: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' })
    const vs = gl && compile(gl, gl.VERTEX_SHADER, VERT)
    const prog = gl && vs ? link(gl, vs, FRAG) : null
    const tex = gl?.createTexture()
    if (!gl || !prog || !tex) {
      onUnsupported()
      return
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.useProgram(prog)
    const u = Object.fromEntries(UNIFORMS.map((n) => [n, gl.getUniformLocation(prog, n)])) as Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>

    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, buildAtlas())
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.uniform1i(u.uAtlas, 0)

    const root = document.documentElement
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const maxScale = Math.min(devicePixelRatio || 1, 1.5)
    let scale = maxScale
    // Ahorro si la GPU va justa: 1 = sin franja de color; 2 = además sin capa cercana y con algo menos de resolución.
    let level = 0, slow = 0
    let raf = 0, last = 0, time = 40, dirty = true
    let cur: RGB[] = [[.34, .86, 1], [.72, .5, 1]]
    let target = cur
    // Cursor (suavizado) y último clic, en píxeles CSS.
    let mx = innerWidth / 2, my = innerHeight / 2, sx = mx, sy = my, mAmt = 0, mGoal = 0
    let pulse: [number, number, number, number] = [0, 0, -100, 0]

    const active = () => root.dataset.mode === 'overdrive' && !document.hidden
    const still = () => reduced.matches || root.dataset.motion === 'off'

    const readTheme = () => {
      const s = getComputedStyle(root)
      target = [
        parseColor(s.getPropertyValue('--hg-ac').trim(), cur[0]),
        parseColor(s.getPropertyValue('--hangar-secondary').trim(), cur[1]),
      ]
      if (still()) cur = target
      dirty = true
    }

    const resize = () => {
      const w = Math.max(1, Math.round(innerWidth * scale)), h = Math.max(1, Math.round(innerHeight * scale))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      dirty = true
    }

    const draw = () => {
      const prefs = getPrefs()
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(u.uRes, canvas.width, canvas.height)
      gl.uniform1f(u.uTime, time)
      gl.uniform1f(u.uScale, scale)
      gl.uniform1f(u.uScan, prefs.hangarScan ? 1 : 0)
      gl.uniform1f(u.uBeams, prefs.hangarBeams ? 1 : 0)
      gl.uniform1f(u.uGain, prefs.hangarIntensity / 65)
      gl.uniform1f(u.uQ, level)
      gl.uniform3fv(u.uC1, cur[0])
      gl.uniform3fv(u.uC2, cur[1])
      gl.uniform3f(u.uMouse, sx * scale, sy * scale, mAmt)
      gl.uniform4f(u.uPulse, pulse[0] * scale, pulse[1] * scale, pulse[2], pulse[3])
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const frame = (now: number) => {
      raf = 0
      if (!active()) return
      const dt = Math.min(.1, (now - (last || now)) / 1000)
      last = now
      const prefs = getPrefs()
      const speed = still() ? 0 : (root.dataset.motion === 'calm' ? .35 : 1) * (prefs.hangarSpeed / 45)
      time += dt * speed

      const k = 1 - Math.exp(-dt * 3.2)
      let moving = false
      cur = cur.map((c, i) => c.map((v, j) => {
        const d = target[i][j] - v
        if (Math.abs(d) > .002) moving = true
        return v + d * k
      }) as RGB)
      const km = 1 - Math.exp(-dt * 7)
      sx += (mx - sx) * km
      sy += (my - sy) * km
      mAmt += (mGoal - mAmt) * km

      if (speed > 0 || moving || dirty) {
        draw()
        dirty = false
        slow = dt > .035 ? slow + 1 : Math.max(0, slow - 2)
        if (slow > 90 && level < 2) {
          level++
          if (level === 2) scale = Math.max(.75, scale * .8)
          slow = 0
          resize()
        }
      }
      if (speed > 0 || moving) raf = requestAnimationFrame(frame)
    }

    const kick = () => {
      if (!raf && active()) {
        last = 0
        raf = requestAnimationFrame(frame)
      }
    }
    const onTheme = () => { readTheme(); kick() }
    const onResize = () => { resize(); kick() }
    const onVis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0 } else kick() }
    const onMove = (e: PointerEvent) => { mx = e.clientX; my = e.clientY; mGoal = 1 }
    const onOut = () => { mGoal = 0 }
    const onDown = (e: PointerEvent) => { if (!still()) pulse = [e.clientX, e.clientY, time, 1] }
    const onLost = (e: Event) => { e.preventDefault(); onUnsupported() }

    readTheme()
    resize()
    kick()
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    root.addEventListener('pointerleave', onOut)
    document.addEventListener('visibilitychange', onVis)
    document.addEventListener('od-mode-change', onTheme)
    document.addEventListener('od-theme-change', onTheme)
    document.addEventListener('od-preferences-change', onTheme)
    reduced.addEventListener('change', onTheme)
    canvas.addEventListener('webglcontextlost', onLost)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      root.removeEventListener('pointerleave', onOut)
      document.removeEventListener('visibilitychange', onVis)
      document.removeEventListener('od-mode-change', onTheme)
      document.removeEventListener('od-theme-change', onTheme)
      document.removeEventListener('od-preferences-change', onTheme)
      reduced.removeEventListener('change', onTheme)
      canvas.removeEventListener('webglcontextlost', onLost)
    }
  }, [onUnsupported])

  return <canvas className="hg-matrix" ref={ref} aria-hidden="true" />
}
