// Solo alfabeto latino (con tildes y ñ): letras de otros alfabetos que se parecen a las latinas (а cirílica, ο griega…)
// permitirían suplantar a otra persona con un nombre idéntico a la vista.
const ALLOWED = /[^\p{Script=Latin}\p{N}._-]+/gu

// El nombre de usuario es público (perfil y publicaciones): nunca debe llevar un correo, espacios ni símbolos raros.
// Si alguien escribe su correo como nombre, solo se conserva lo anterior a la @.
export function cleanUsername(raw: string, fallbackEmail = ''): string {
  return handleOf(raw) || handleOf(fallbackEmail) || 'usuario'
}

// Lo que queda utilizable de un texto, o '' si no queda nada (a diferencia de cleanUsername, que entonces devuelve "usuario").
export function handleOf(raw: string): string {
  return raw.split('@')[0].replace(ALLOWED, '').slice(0, 30)
}
