// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { MODES, shiftMode } from './mode'

describe('shiftMode', () => {
  it('avanza al siguiente modo', () => {
    expect(shiftMode('astra', 1)).toBe('overdrive')
  })

  it('da la vuelta al llegar al final', () => {
    expect(shiftMode('overdrive', 1)).toBe('astra')
  })

  it('retrocede y también da la vuelta hacia atrás', () => {
    expect(shiftMode('astra', -1)).toBe('overdrive')
    expect(shiftMode('overdrive', -1)).toBe('astra')
  })

  it('un paso completo de la lista vuelve al mismo modo', () => {
    for (const m of MODES) expect(shiftMode(m, MODES.length)).toBe(m)
  })
})
