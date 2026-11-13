import { describe, expect, it } from 'vitest'
import { hueOf } from './hue'

describe('hueOf', () => {
  it('es estable: el mismo texto da siempre el mismo tono', () => {
    expect(hueOf('overdrive')).toBe(hueOf('overdrive'))
  })

  it('siempre devuelve un valor entre 0 y 359', () => {
    for (const t of ['', 'a', 'Proyecto de prueba', '🚀🚀🚀', 'x'.repeat(500)]) {
      const h = hueOf(t)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThan(360)
      expect(Number.isInteger(h)).toBe(true)
    }
  })

  it('textos distintos suelen dar tonos distintos', () => {
    expect(hueOf('video')).not.toBe(hueOf('anuncio'))
  })
})
