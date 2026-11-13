import { describe, expect, it } from 'vitest'
import { PROJECT_TYPES } from '../types'
import { DETAIL_PRESETS, estimateReadingMinutes, extractFormatMeta, hostLabel, parseVideoEmbed } from './projectFormat'

describe('DETAIL_PRESETS', () => {
  it('defines a distinct preset for every project type', () => {
    for (const type of PROJECT_TYPES) {
      expect(DETAIL_PRESETS[type]).toBeDefined()
      expect(DETAIL_PRESETS[type].kicker.length).toBeGreaterThan(0)
    }
  })
})

describe('extractFormatMeta', () => {
  it('extracts announcement label and strips it from cleanBody', () => {
    const res = extractFormatMeta('Fecha o etiqueta del aviso: Lanzamiento · Viernes 20:00\n\nTexto principal.')
    expect(res.metaLabel).toBe('Fecha o etiqueta del aviso')
    expect(res.metaValue).toBe('Lanzamiento · Viernes 20:00')
    expect(res.progressPct).toBeNull()
    expect(res.cleanBody).toBe('Texto principal.')
  })

  it('extracts clamped progress percentage from milestone string', () => {
    const res = extractFormatMeta('Hito o progreso: 90% · Pulido visual\n\nNotas.')
    expect(res.progressPct).toBe(90)
    expect(res.cleanBody).toBe('Notas.')
  })

  it('keeps body intact when no metadata header is present', () => {
    const res = extractFormatMeta('Solo texto editorial.')
    expect(res.metaLabel).toBeNull()
    expect(res.cleanBody).toBe('Solo texto editorial.')
  })
})

describe('parseVideoEmbed & helpers', () => {
  it('converts YouTube watch, shorts, youtu.be and Vimeo URLs', () => {
    expect(parseVideoEmbed('https://youtube.com/watch?v=abc123')).toBe('https://www.youtube-nocookie.com/embed/abc123')
    expect(parseVideoEmbed('https://youtu.be/xyz99')).toBe('https://www.youtube-nocookie.com/embed/xyz99')
    expect(parseVideoEmbed('https://www.youtube.com/shorts/s123')).toBe('https://www.youtube-nocookie.com/embed/s123')
    expect(parseVideoEmbed('https://vimeo.com/987654')).toBe('https://player.vimeo.com/video/987654')
    expect(parseVideoEmbed('https://example.com/trailer')).toBeNull()
  })

  it('formats host labels and reading minutes cleanly', () => {
    expect(hostLabel('https://www.thebookofshaders.com/01/')).toBe('thebookofshaders.com')
    expect(estimateReadingMinutes('hola mundo')).toBe(1)
  })
})
