// Ayudantes de WebGL compartidos por los fondos de ASTRA (AstraSky) y HANGAR (HangarMatrix).

export type RGB = [number, number, number]

let probe: CanvasRenderingContext2D | null = null
// Cualquier color CSS (hex, hsl, color-mix…) a RGB 0-1, pasando por un canvas de 1 píxel.
export function parseColor(value: string, fallback: RGB): RGB {
  try {
    probe ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true })
    if (!probe || !value) return fallback
    probe.clearRect(0, 0, 1, 1)
    probe.fillStyle = '#000'
    probe.fillStyle = value
    probe.fillRect(0, 0, 1, 1)
    const d = probe.getImageData(0, 0, 1, 1).data
    return [d[0] / 255, d[1] / 255, d[2] / 255]
  } catch {
    return fallback
  }
}

export function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh
  console.warn('[gl] shader', gl.getShaderInfoLog(sh))
  return null
}

export function link(gl: WebGLRenderingContext, vs: WebGLShader, fragSrc: string) {
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc)
  const prog = fs ? gl.createProgram() : null
  if (!fs || !prog) return null
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.bindAttribLocation(prog, 0, 'p')
  gl.linkProgram(prog)
  if (gl.getProgramParameter(prog, gl.LINK_STATUS)) return prog
  console.warn('[gl] link', gl.getProgramInfoLog(prog))
  return null
}
