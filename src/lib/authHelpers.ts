// Ayudas puras del acceso (sin React ni red): fáciles de probar y de reutilizar.

export type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string; hint: string }

const COMMON = ['123456', '1234567', '12345678', '123456789', 'password', 'contraseña', 'contrasena', 'qwerty', 'abc123', '111111', 'iloveyou', 'admin', 'letmein', 'overdrive']

// Puntúa una contraseña de 0 a 4 y dice qué le falta, en lenguaje llano. El mínimo real (6) lo exige Supabase.
export function passwordStrength(pw: string): Strength {
  if (!pw) return { score: 0, label: '', hint: 'Mínimo 6 caracteres.' }
  const lower = pw.toLowerCase()
  if (COMMON.some((c) => lower === c || (lower.includes(c) && pw.length < c.length + 4))) {
    return { score: 0, label: 'Muy común', hint: 'Es de las primeras que se prueban. Cámbiala.' }
  }
  if (/^(.)\1+$/.test(pw)) return { score: 0, label: 'Muy débil', hint: 'Repetir el mismo carácter no protege.' }
  let points = 0
  if (pw.length >= 8) points++
  if (pw.length >= 12) points++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) points++
  if (/\d/.test(pw)) points++
  if (/[^A-Za-z0-9]/.test(pw)) points++
  if (pw.length < 6) return { score: 0, label: 'Muy corta', hint: `Te faltan ${6 - pw.length} caracteres.` }
  const score = Math.min(4, Math.max(1, points - (pw.length < 8 ? 1 : 0))) as 1 | 2 | 3 | 4
  const labels = ['', 'Débil', 'Aceptable', 'Buena', 'Excelente']
  const hints = [
    '',
    'Añade más caracteres, números o símbolos.',
    'Con 12 caracteres o más sería mucho mejor.',
    'Mezcla mayúsculas, números y símbolos para subirla.',
    'No hace falta más.',
  ]
  return { score, label: labels[score], hint: hints[score] }
}

const DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'live.com', 'proton.me', 'protonmail.com', 'yahoo.es', 'hotmail.es', 'outlook.es']

function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return dp[a.length][b.length]
}

// "ana@gmial.com" -> "ana@gmail.com". Solo sugiere si el dominio se parece mucho a uno conocido y no es uno de ellos.
export function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at < 1) return null
  const domain = email.slice(at + 1).toLowerCase()
  if (!domain.includes('.') || DOMAINS.includes(domain)) return null
  let best: { d: string; dist: number } | null = null
  for (const d of DOMAINS) {
    const dist = distance(domain, d)
    if (dist <= 2 && (!best || dist < best.dist)) best = { d, dist }
  }
  return best ? `${email.slice(0, at + 1)}${best.d}` : null
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
}

// "karmen@gmail.com" -> "k•••••@gmail.com" (para mostrar el correo sin enseñarlo entero).
export function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at < 1) return email
  const user = email.slice(0, at)
  return `${user[0]}${'•'.repeat(Math.min(5, Math.max(2, user.length - 1)))}${email.slice(at)}`
}

// Enlace a la bandeja del proveedor más habitual, para el paso "revisa tu correo".
export function mailboxUrl(email: string): { label: string; url: string } | null {
  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase()
  if (domain === 'gmail.com') return { label: 'Abrir Gmail', url: 'https://mail.google.com/' }
  if (/^(outlook|hotmail|live)\./.test(domain)) return { label: 'Abrir Outlook', url: 'https://outlook.live.com/mail/' }
  if (/^yahoo\./.test(domain)) return { label: 'Abrir Yahoo', url: 'https://mail.yahoo.com/' }
  if (domain === 'icloud.com') return { label: 'Abrir iCloud', url: 'https://www.icloud.com/mail' }
  if (/^proton(mail)?\./.test(domain)) return { label: 'Abrir Proton', url: 'https://mail.proton.me/' }
  return null
}

// Para buscar un nombre exacto con ilike sin que _ y % cuenten como comodines.
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}
