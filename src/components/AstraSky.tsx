import { useEffect, useRef } from 'react'
import { compile, link, parseColor, type RGB } from '../lib/gl'

const VERT = `
attribute vec2 p;
void main() {
  gl_Position = vec4(p, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_dpr;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform float u_stars;
uniform float u_nebula;
uniform float u_twinkle;
uniform float u_meteor;

// ------------------------------------------------------------------ Hash & Noise
float h21(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec2 h22(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x),
    mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// FBM de 6 octavas con rotación entre octavas para eliminar artefactos axiales
float fbm6(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.80, -0.60, 0.60, 0.80) * 2.03;
  for (int i = 0; i < 6; i++) {
    sum += amp * vnoise(p);
    p = rot * p + vec2(13.7, 7.9);
    amp *= 0.5;
  }
  return sum;
}

// Filamentos tipo "ridged multifractal" de 5 octavas para frentes de gas ionizado
float ridged5(vec2 p) {
  float sum = 0.0;
  float amp = 0.52;
  float weight = 1.0;
  mat2 rot = mat2(0.78, 0.62, -0.62, 0.78) * 2.08;
  for (int i = 0; i < 5; i++) {
    float n = 1.0 - abs(vnoise(p) * 2.0 - 1.0);
    n = n * n * weight;
    weight = clamp(n * 1.45, 0.0, 1.0);
    sum += n * amp;
    p = rot * p + vec2(5.1, 11.3);
    amp *= 0.5;
  }
  return sum;
}

// ------------------------------------------------------------------ Capa 4: Nebulosas HD con domain warping
vec3 nebulaLayer(vec2 uv, float t) {
  vec2 p = uv * 1.45 + vec2(0.25, -0.15);

  // Domain warping de doble etapa para gas interestelar orgánico y nítido
  vec2 warp1 = vec2(
    fbm6(p * 1.05 + vec2(t * 0.011, -t * 0.007)),
    fbm6(p * 1.05 + vec2(5.2, 1.3) + vec2(-t * 0.009, t * 0.006))
  );
  vec2 warp2 = vec2(
    fbm6(p * 1.95 + 2.35 * warp1 + vec2(1.7, 9.2) + t * 0.005),
    fbm6(p * 1.95 + 2.35 * warp1 + vec2(8.3, 2.8) - t * 0.004)
  );

  float density = fbm6(p * 1.65 + 2.05 * warp2);
  float filament = ridged5(p * 2.45 + 1.85 * warp2);
  float fine = ridged5(p * 5.20 - 1.25 * warp1);

  // Zonas oscuras de polvo cósmico para contraste y profundidad volumétrica
  float dustNoise = fbm6(p * 2.15 + 1.55 * warp1 + vec2(11.4, 4.7));
  float dustLane = smoothstep(0.45, 0.75, dustNoise);
  float absorb = exp(-dustLane * 2.15);

  // Máscara de volumen interestelar (evita nubes planas cubriendo todo)
  float envelope = smoothstep(0.32, 0.78, density);
  float ridgeSharp = pow(clamp(filament, 0.0, 1.0), 1.55);
  float microFil = pow(clamp(fine, 0.0, 1.0), 2.4) * 0.42;

  // Paleta cósmica calibrada sobre los colores del tema (sin saturar ni opacar estrellas)
  vec3 deepGas = mix(u_c2 * 0.65, u_c1 * 0.52, smoothstep(0.25, 0.78, warp1.x));
  vec3 ionized = mix(u_c1 * 0.95, u_c3 * 0.92, smoothstep(0.30, 0.76, warp2.y));
  vec3 coreGlow = mix(u_c3 * 0.72, vec3(0.86, 0.94, 1.0), 0.35);

  vec3 col = deepGas * envelope * 0.42;
  col += ionized * ridgeSharp * (0.28 + 0.45 * envelope);
  col += coreGlow * microFil * (0.22 + 0.55 * ridgeSharp);

  // Iluminación de borde junto a los filamentos oscuros de polvo
  float rim = smoothstep(0.36, 0.54, dustNoise) * (1.0 - dustLane);
  col += mix(u_c1, u_c3, 0.45) * rim * 0.16;

  return col * absorb;
}

// Temperatura de color realista: blanco puro, azul hielo, dorado suave
vec3 starColor(float seed) {
  if (seed < 0.48) return vec3(0.97, 0.98, 1.00); // Blanco puro
  if (seed < 0.78) return vec3(0.68, 0.86, 1.00); // Azul hielo
  return vec3(1.00, 0.89, 0.68);                  // Dorado suave
}

// ------------------------------------------------------------------ Capa 2: Mini estrellas de fondo (profundidad)
vec3 miniStarsLayer(vec2 uv, float scale, float seedOffset, float px, float t) {
  vec2 g = uv * scale;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  vec3 sum = vec3(0.0);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 cid = id + o;
      vec2 rnd = h22(cid + seedOffset);
      if (rnd.x > 0.62) continue;

      vec2 pos = o + (rnd - 0.5) * 0.78;
      float d = length(f - pos) / scale;

      float mag = pow(h21(cid + seedOffset * 1.7 + 3.1), 2.4);
      // Tamaño proporcional al DPR y al viewport para nitidez 4K sin pixelarse
      float radius = (0.75 + 1.15 * mag) * px * u_dpr;
      float aa = max(px * 0.75, radius * 0.42);
      float core = smoothstep(radius + aa, max(0.0, radius - aa), d);

      float tw = 1.0 - u_twinkle * (0.18 + 0.20 * sin(t * (1.4 + 2.4 * rnd.y) + rnd.x * 62.83));
      float bright = (0.28 + 0.62 * mag) * tw;
      sum += starColor(h21(cid + seedOffset + 19.3)) * core * bright;
    }
  }
  return sum;
}

// ------------------------------------------------------------------ Capa 1: Estrellas principales realistas
vec3 mainStarsLayer(vec2 uv, float scale, float seedOffset, float px, float t, float density) {
  vec2 g = uv * scale;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  vec3 sum = vec3(0.0);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 cid = id + o;
      float presence = h21(cid + seedOffset);
      if (presence > clamp(0.32 * density, 0.0, 0.85)) continue;

      vec2 rnd = h22(cid + seedOffset + 7.7);
      vec2 delta = (f - o) - (rnd - 0.5) * 0.76;
      vec2 dVec = delta / scale;
      float d = length(dVec);

      float mag = pow(h21(cid + seedOffset + 23.9), 2.1);
      // Núcleo claramente visible y proporcional al viewport + DPR (nunca 1px perdido)
      float coreR = (1.35 + 2.35 * mag) * px * u_dpr;
      float haloR = coreR * (2.6 + 1.8 * mag);
      float aa = max(px * 0.65, coreR * 0.35);

      float core = smoothstep(coreR + aa, coreR * 0.18, d);
      // Halo sutil y limpio, con caída rápida para evitar manchas borrosas
      float halo = exp(-d * d / (haloR * haloR)) * (0.22 + 0.24 * mag);

      // Puntas de difracción finas solo en las estrellas más brillantes
      float spike = 0.0;
      if (mag > 0.68) {
        float spikeLen = coreR * (5.5 + 4.5 * mag);
        float thickness = max(px * 0.65, coreR * 0.26);
        float sx = smoothstep(thickness, 0.0, abs(dVec.y)) * smoothstep(spikeLen, 0.0, abs(dVec.x));
        float sy = smoothstep(thickness, 0.0, abs(dVec.x)) * smoothstep(spikeLen, 0.0, abs(dVec.y));
        spike = (sx + sy) * 0.34 * smoothstep(0.68, 1.0, mag);
      }

      // Parpadeo orgánico multi-frecuencia
      float phase = rnd.x * 62.8318 + rnd.y * 19.7;
      float osc = 0.65 * sin(t * (1.2 + 2.1 * rnd.x) + phase)
                + 0.35 * sin(t * (2.7 + 3.1 * rnd.y) + phase * 1.7);
      float tw = 1.0 - u_twinkle * (0.14 + 0.14 * osc);

      vec3 col = starColor(h21(cid + seedOffset + 41.2));
      float intensity = (0.72 + 0.78 * mag) * tw;
      sum += col * (core * 1.15 + halo + spike) * intensity;
    }
  }
  return sum;
}

// ------------------------------------------------------------------ Capa 3: Estrellas fugaces realistas
vec3 shootingStar(vec2 uv, float t, float period, float offset, float px) {
  float localT = t + offset;
  float cycle = floor(localT / period);
  float phase = fract(localT / period);

  // Ventana activa corta (~1.15s) para apariciones periódicas sin saturar
  float activeDur = 1.15 / period;
  if (phase > activeDur) return vec3(0.0);

  float u = phase / activeDur;
  float seed = h21(vec2(cycle, offset * 3.17));
  float seed2 = h21(vec2(cycle * 1.9 + 4.3, offset));

  // Trayectoria diagonal fluida desde cuadrante superior hacia abajo
  vec2 start = vec2(-0.75 + 1.55 * seed, 0.18 + 0.34 * seed2);
  float angle = -0.52 - 0.35 * h21(vec2(cycle, 17.3));
  vec2 dir = vec2(cos(angle), sin(angle));
  float travel = 0.58 + 0.28 * seed2;

  float ease = 1.0 - pow(1.0 - u, 2.2);
  vec2 head = start + dir * (travel * ease);
  float trailLen = (0.14 + 0.10 * seed) * sin(u * 3.14159265);
  vec2 tail = head - dir * trailLen;

  vec2 ab = head - tail;
  float abLenSq = max(dot(ab, ab), 1e-6);
  float proj = clamp(dot(uv - tail, ab) / abLenSq, 0.0, 1.0);
  vec2 closest = tail + ab * proj;
  float dist = length(uv - closest);

  float fadeEnv = sin(u * 3.14159265);
  float width = (1.1 + 1.2 * proj) * px * u_dpr;
  float streak = smoothstep(width, 0.0, dist) * pow(proj, 2.3) * fadeEnv;

  // Cabeza luminosa nítida
  float headDist = length(uv - head);
  float headR = 2.2 * px * u_dpr;
  float headCore = smoothstep(headR + px, 0.0, headDist) * fadeEnv;
  float headGlow = exp(-headDist * headDist / (headR * headR * 6.5)) * 0.35 * fadeEnv;

  vec3 trailCol = mix(u_c2 * 0.8 + vec3(0.2), mix(vec3(0.92, 0.98, 1.0), u_c1, 0.35), proj);
  return trailCol * streak * 1.25 + vec3(0.96, 0.99, 1.0) * (headCore * 1.5 + headGlow);
}

void main() {
  float minDim = min(u_resolution.x, u_resolution.y);
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / minDim;
  float px = 1.0 / minDim;

  // Fondo base de espacio profundo
  float bgGrad = clamp(0.5 - uv.y * 0.6, 0.0, 1.0);
  vec3 col = mix(vec3(0.012, 0.018, 0.048), vec3(0.005, 0.008, 0.022), bgGrad);

  // Capa 4: Nebulosas HD (si están activas)
  if (u_nebula > 0.5) {
    col += nebulaLayer(uv, u_time);
  }

  // Capa 2: Mini estrellas de fondo (2 sub-capas para paralaje visual y profundidad)
  float starScale = max(0.0, u_stars);
  if (starScale > 0.01) {
    col += miniStarsLayer(uv, 40.0, 11.3, px, u_time) * min(1.35, starScale);
    col += miniStarsLayer(uv, 74.0, 53.7, px, u_time) * min(1.35, starScale) * 0.72;

    // Capa 1: Estrellas principales realistas
    col += mainStarsLayer(uv, 11.5, 3.7, px, u_time, starScale);
    col += mainStarsLayer(uv, 20.5, 29.1, px, u_time, starScale) * 0.82;
  }

  // Capa 3: Estrellas fugaces periódicas
  if (u_meteor > 0.5) {
    col += shootingStar(uv, u_time, 6.8, 1.2, px);
    col += shootingStar(uv, u_time, 10.4, 5.9, px);
  }

  // Compresión suave de altas luces para conservar nitidez sin clipeo duro
  col = col / (1.0 + col * 0.22);
  col = pow(max(col, vec3(0.0)), vec3(0.95));

  // Dithering triangular ligero de 8 bits contra banding en gradientes oscuros
  float dither = (h21(gl_FragCoord.xy + fract(u_time)) - 0.5) / 255.0;
  col += dither;

  gl_FragColor = vec4(col, 1.0);
}
`

const FALLBACK_C1: RGB = [0.28, 0.84, 1.0]
const FALLBACK_C2: RGB = [0.46, 0.30, 0.94]
const FALLBACK_C3: RGB = [0.95, 0.36, 0.74]

// Fondo espacial WebGL de ASTRA: renderizado 1:1 en densidad HD/4K sin desenfoque ni post-procesado borroso.
export function AstraSky({ onUnsupported }: { onUnsupported: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    })
    if (!gl) {
      onUnsupported()
      return
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const prog = vs ? link(gl, vs, FRAG) : null
    if (!prog) {
      onUnsupported()
      return
    }

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    const u = {
      u_resolution: gl.getUniformLocation(prog, 'u_resolution'),
      u_time: gl.getUniformLocation(prog, 'u_time'),
      u_dpr: gl.getUniformLocation(prog, 'u_dpr'),
      u_c1: gl.getUniformLocation(prog, 'u_c1'),
      u_c2: gl.getUniformLocation(prog, 'u_c2'),
      u_c3: gl.getUniformLocation(prog, 'u_c3'),
      u_stars: gl.getUniformLocation(prog, 'u_stars'),
      u_nebula: gl.getUniformLocation(prog, 'u_nebula'),
      u_twinkle: gl.getUniformLocation(prog, 'u_twinkle'),
      u_meteor: gl.getUniformLocation(prog, 'u_meteor'),
    }

    const root = document.documentElement
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const active = () => !root.dataset.mode || root.dataset.mode === 'astra'
    const still = () => reduced.matches || root.dataset.motion === 'off'

    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let cur: [RGB, RGB, RGB] = [FALLBACK_C1, FALLBACK_C2, FALLBACK_C3]
    let target: [RGB, RGB, RGB] = cur
    let stars = 1
    let nebula = 1
    let twinkle = 1
    let meteor = 1
    let time = 0
    let last = 0
    let raf = 0
    let dirty = true

    const readTheme = () => {
      const s = getComputedStyle(root)
      target = [
        parseColor(s.getPropertyValue('--cyan').trim(), FALLBACK_C1),
        parseColor(s.getPropertyValue('--purple').trim(), FALLBACK_C2),
        parseColor(s.getPropertyValue('--pink').trim(), FALLBACK_C3),
      ]
      const prefs = globalThis.OverdrivePreferences ?? {}
      stars = typeof prefs.density === 'number' ? Math.max(0, prefs.density) / 100 : 1
      twinkle = prefs.twinkle === false ? 0 : 1
      meteor = prefs.meteors === false ? 0 : 1
      nebula = root.dataset.nebula === 'off' ? 0 : 1
      if (still()) cur = target
      dirty = true
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(window.innerWidth * dpr))
      const h = Math.max(1, Math.round(window.innerHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, canvas.width, canvas.height)
      dirty = true
    }

    const draw = () => {
      gl.useProgram(prog)
      gl.uniform2f(u.u_resolution, canvas.width, canvas.height)
      gl.uniform1f(u.u_time, time)
      gl.uniform1f(u.u_dpr, dpr)
      gl.uniform3fv(u.u_c1, cur[0])
      gl.uniform3fv(u.u_c2, cur[1])
      gl.uniform3fv(u.u_c3, cur[2])
      gl.uniform1f(u.u_stars, stars)
      gl.uniform1f(u.u_nebula, nebula)
      gl.uniform1f(u.u_twinkle, twinkle)
      gl.uniform1f(u.u_meteor, meteor)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const frame = (now: number) => {
      raf = 0
      if (!active()) return
      const dt = Math.min(0.1, (now - (last || now)) / 1000)
      last = now
      const speed = still() ? 0 : root.dataset.motion === 'calm' ? 0.35 : 1
      time += dt * speed

      const k = 1 - Math.exp(-dt * 3.5)
      let moving = false
      cur = cur.map((c, i) =>
        c.map((v, j) => {
          const d = target[i][j] - v
          if (Math.abs(d) > 0.002) moving = true
          return v + d * k
        }),
      ) as [RGB, RGB, RGB]

      if (speed > 0 || moving || dirty) {
        draw()
        dirty = false
      }
      if (speed > 0 || moving) raf = requestAnimationFrame(frame)
    }

    const kick = () => {
      if (!raf && active() && !document.hidden) {
        last = 0
        raf = requestAnimationFrame(frame)
      }
    }

    const onTheme = () => {
      readTheme()
      kick()
    }
    const onResize = () => {
      resize()
      kick()
    }
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
      } else {
        kick()
      }
    }
    const onLost = (e: Event) => {
      e.preventDefault()
      onUnsupported()
    }

    readTheme()
    resize()
    kick()

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null
    ro?.observe(canvas)
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVis)
    document.addEventListener('od-mode-change', onTheme)
    document.addEventListener('od-theme-change', onTheme)
    document.addEventListener('od-preferences-change', onTheme)
    reduced.addEventListener('change', onTheme)
    canvas.addEventListener('webglcontextlost', onLost)

    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVis)
      document.removeEventListener('od-mode-change', onTheme)
      document.removeEventListener('od-theme-change', onTheme)
      document.removeEventListener('od-preferences-change', onTheme)
      reduced.removeEventListener('change', onTheme)
      canvas.removeEventListener('webglcontextlost', onLost)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      if (vs) gl.deleteShader(vs)
    }
  }, [onUnsupported])

  return <canvas id="astra-sky" ref={ref} aria-hidden="true" />
}
