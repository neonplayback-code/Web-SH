# Overdrive - Box

Web para publicar tus cosas: proyectos, videos, anuncios, posts, betas, demos, avances y links. Cualquiera puede
verlas y darles ♥; los likes se guardan en Supabase y se suman entre todos los usuarios.

## Aspecto

El diseño es el de la extensión **OVERDRIVE**, con sus dos modos, que se cambian en la barra superior (o con `Alt+M`):

- **ASTRA** (por defecto): cielo de estrellas, cristal y tipografía serif. La portada sigue el mockup: bloque principal
  y resumen arriba; rejilla de publicaciones a la izquierda y las columnas *Avances* y *Más gustados* a la derecha.
- **HANGAR**: panel técnico con riel lateral, cuadrícula, circuitos y bordes RGB.

También se puede elegir el ambiente de color (Hielo, Tóxico, Brasa, Violeta, Blanco). La elección se recuerda.

Las hojas de estilo, fuentes y scripts de cielo son una **copia** de los de la extensión (`src/ext/` y `public/ext/`);
la extensión original no se modifica. `src/app.css` solo añade las piezas que la extensión no tiene (formularios,
página de publicación, rejilla), con sus mismos tokens de color.

## Qué incluye

- Secciones (tabs): Todo, Proyectos, Videos, Anuncios, Posts, Betas, Demos, Avances, Links y Shorts. Cada una es
  una estructura de página distinta (tarjetas altas, video, banners, artículos, línea de tiempo, enlaces, tiles…)
  y comparte arriba el bloque del creador y el resumen en vivo. Se definen en `src/config/tabs.ts`; los datos del
  creador, en `src/config/site.ts`.
- Cada sección tiene buscador (`/` para enfocarlo), orden (recientes o más gustados) y la barra "Más…".
- En desarrollo, añade `?demo` a la URL (por ejemplo `/proyectos?demo`) para ver las secciones con datos de
  ejemplo sin base de datos.
- `/nuevo`: publicar con portada, galería de imágenes y videos, enlaces y tags. Admite borradores.
  `/nuevo?tipo=video` empieza con ese tipo elegido.
- `/p/:id`: la publicación, ♥ y línea de avances del autor.
- `/u/:username`: publicaciones de cada creador.

## Stack

- React 19 + TypeScript + Vite
- React Router
- Supabase: Auth, Postgres y Storage

## Empezar

```bash
npm install
npm run dev
```

Sin Supabase configurado la web carga, pero muestra avisos en vez de datos. Para activarlo sigue [SETUP.md](SETUP.md).

```bash
npm run build
npm run lint
```

## Estructura

```text
src/
  components/   Cabecera, selector de modo, fondo, tarjeta de publicación, formulario de sesión
  pages/        Inicio, publicación, nueva publicación, perfil
  lib/          Supabase, usuario actual, likes y modo/ambiente
  ext/          Copia de estilos, fuentes e iconos de la extensión OVERDRIVE
  types/        Project, Profile
public/ext/     Scripts de la extensión: cielo de ASTRA y efectos de HANGAR
supabase/1-tablas.sql, 2-almacenamiento.sql  Tablas, reglas de seguridad, likes y bucket de Storage
```
