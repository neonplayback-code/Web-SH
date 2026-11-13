import { describe, expect, it } from 'vitest'
import { betaCatalogProjects, findBetaCatalogProject } from './betaCatalog'

describe('betaCatalogProjects', () => {
  it('exposes the 5 workspace projects in unlaunched beta state', () => {
    const items = betaCatalogProjects()
    expect(items).toHaveLength(5)
    expect(items.map((p) => p.id)).toEqual([
      'beta-sh-aero',
      'beta-sh-download',
      'beta-sh-extension',
      'beta-sh-p',
      'beta-sh-portfolio',
    ])
    for (const item of items) {
      expect(item.type).toBe('beta')
      expect(item.links).toEqual([])
      expect(item.summary.length).toBeGreaterThan(20)
      expect(item.body).toContain('¿De qué trata?')
    }
  })

  it('finds individual beta catalog entries by id', () => {
    expect(findBetaCatalogProject('beta-sh-aero')?.title).toBe('SH.Aero')
    expect(findBetaCatalogProject('non-existent')).toBeUndefined()
  })
})
