const ALLOWED = /[^\p{L}\p{N}._-]+/gu

// El nombre de usuario es público (perfil y publicaciones): nunca debe llevar un correo, espacios ni símbolos raros.
// Si alguien escribe su correo como nombre, solo se conserva lo anterior a la @.
export function cleanUsername(raw: string, fallbackEmail = ''): string {
  const fromRaw = raw.split('@')[0].replace(ALLOWED, '').slice(0, 30)
  if (fromRaw) return fromRaw
  return fallbackEmail.split('@')[0].replace(ALLOWED, '').slice(0, 30) || 'usuario'
}
