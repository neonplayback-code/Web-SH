import { describe, expect, it } from 'vitest'
import { escapeLike, isEmail, mailboxUrl, maskEmail, passwordStrength, suggestEmail } from './authHelpers'

describe('passwordStrength', () => {
  it('pide al menos 6 caracteres', () => {
    expect(passwordStrength('abc').label).toBe('Muy corta')
    expect(passwordStrength('abc').hint).toContain('3')
  })
  it('marca las contraseñas comunes como muy comunes', () => {
    expect(passwordStrength('123456').score).toBe(0)
    expect(passwordStrength('Password').label).toBe('Muy común')
  })
  it('sube la puntuación con longitud y variedad', () => {
    expect(passwordStrength('abcdef').score).toBeLessThan(passwordStrength('Abcdef12!xyz').score)
    expect(passwordStrength('Tr0ub4dor&3-caballo').score).toBe(4)
  })
  it('no puntúa nada si está vacía', () => {
    expect(passwordStrength('')).toMatchObject({ score: 0, label: '' })
  })
})

describe('suggestEmail', () => {
  it('corrige errores típicos de dominio', () => {
    expect(suggestEmail('ana@gmial.com')).toBe('ana@gmail.com')
    expect(suggestEmail('ana@hotmial.com')).toBe('ana@hotmail.com')
    expect(suggestEmail('ana@gmail.con')).toBe('ana@gmail.com')
  })
  it('no toca dominios correctos ni lejanos', () => {
    expect(suggestEmail('ana@gmail.com')).toBeNull()
    expect(suggestEmail('ana@miempresa.org')).toBeNull()
    expect(suggestEmail('sin-arroba')).toBeNull()
  })
})

describe('otras ayudas', () => {
  it('valida correos', () => {
    expect(isEmail('a@b.co')).toBe(true)
    expect(isEmail('a@b')).toBe(false)
    expect(isEmail('a b@c.com')).toBe(false)
  })
  it('oculta parte del correo', () => {
    expect(maskEmail('karmen@gmail.com')).toBe('k•••••@gmail.com')
    expect(maskEmail('ab@x.es')).toBe('a••@x.es')
  })
  it('da el enlace de la bandeja si conoce el proveedor', () => {
    expect(mailboxUrl('a@gmail.com')?.label).toBe('Abrir Gmail')
    expect(mailboxUrl('a@hotmail.es')?.label).toBe('Abrir Outlook')
    expect(mailboxUrl('a@miempresa.org')).toBeNull()
  })
  it('escapa los comodines de ilike', () => {
    expect(escapeLike('a_b%c')).toBe('a\\_b\\%c')
  })
})
