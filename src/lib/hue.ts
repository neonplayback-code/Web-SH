// Tono estable (0-359) a partir de un texto: portadas y avatares sin imagen tienen su propio color.
export function hueOf(text: string): number {
  let h = 0
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}
