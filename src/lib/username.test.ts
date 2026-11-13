import { describe, expect, it } from 'vitest'
import { cleanUsername } from './username'

describe('cleanUsername', () => {
  it('conserva letras, números, punto, guion y guion bajo', () => {
    expect(cleanUsername('Ana_María.99-x')).toBe('Ana_María.99-x')
  })

  it('quita espacios y símbolos', () => {
    expect(cleanUsername('ana the  #1!')).toBe('anathe1')
  })

  it('si recibe un correo, solo usa lo anterior a la @', () => {
    expect(cleanUsername('karmen@gmail.com')).toBe('karmen')
  })

  it('limita la longitud a 30 caracteres', () => {
    expect(cleanUsername('a'.repeat(50))).toHaveLength(30)
  })

  it('usa el correo de respaldo si el nombre queda vacío', () => {
    expect(cleanUsername('!!!', 'pepe@x.com')).toBe('pepe')
  })

  it('devuelve "usuario" si no hay nada utilizable', () => {
    expect(cleanUsername('   ')).toBe('usuario')
    expect(cleanUsername('', '@@@')).toBe('usuario')
  })
})
