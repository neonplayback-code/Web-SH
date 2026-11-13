// Datos del creador que se ven en la portada de todas las secciones. Cámbialos aquí.
export const CREATOR = {
  // Logo: archivo en /public (Alchemy Studios, recortado en círculo con fondo transparente).
  logo: `${import.meta.env.BASE_URL}alchemy-logo.png`,
  name: 'Alchemy Studios',
  role: 'CREADOR',
  eyebrow: 'ARCHIVO PERSONAL',
  titleLead: 'Lo que estoy',
  titleMain: 'construyendo',
  tagline: 'Proyectos, videos, betas, demos y avances.',
  note: 'Dale ♥ a lo que te guste.',
  // Tus redes o enlaces. Aparecen como botones bajo tu nombre; si la lista está vacía no se muestra nada.
  // Ejemplo: { label: 'YouTube', url: 'https://youtube.com/@tu-canal' }
  links: [] as { label: string; url: string }[],
}
